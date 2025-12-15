import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/common/common.type';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderStatusService } from 'src/mkt-core/order/services/core';
import {
  ConfirmOrderInput,
  ConfirmOrderResponse,
} from 'src/mkt-core/order/types';

import { SagaContext, SagaStepResult } from './order-saga.interface';

/**
 * ConfirmOrderSaga - Saga for confirming/updating order status
 *
 * Handles order status transitions with validation:
 * - Validates order exists
 * - Validates status transition is allowed
 * - Updates order status
 * - Emits appropriate events
 *
 * Supports actions:
 * - COMPLETED: Complete the order
 * - CONFIRMED: Confirm payment received
 * - SINVOICE: Sync S-Invoice
 * - And other status transitions
 */
@Injectable()
export class ConfirmOrderSaga {
  private readonly logger = new Logger(ConfirmOrderSaga.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  /**
   * Execute the confirm order saga
   */
  async execute(
    workspaceId: string,
    input: ConfirmOrderInput,
  ): Promise<ConfirmOrderResponse> {
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const context: SagaContext = {
      workspaceId,
      rollbackData: new Map(),
      metadata: new Map(),
    };

    try {
      // Step 1: Validate order exists
      const validateResult = await this.validateOrder(
        context,
        input,
        queryRunner,
      );

      if (!validateResult.success) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: validateResult.error?.message ?? 'Order validation failed',
        };
      }

      const currentOrder = validateResult.data;

      if (!currentOrder) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: 'Order validation failed: no data returned',
        };
      }

      const previousStatus = currentOrder.status as ORDER_STATUS;

      // Step 2: Determine action and validate transition
      const transitionResult = this.orderStatusService.determineAction(
        currentOrder,
        {
          status: this.getTargetStatusFromAction(input.action),
          accountingConfirmed: input.accountingConfirmed,
        },
      );

      if (
        !transitionResult.valid ||
        !transitionResult.action ||
        !transitionResult.newStatus
      ) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: transitionResult.error ?? 'Invalid status transition',
        };
      }

      const { action, newStatus } = transitionResult;

      // Step 3: Update order status
      const updateResult = await this.updateOrderStatus(
        context,
        input,
        action,
        newStatus,
        queryRunner,
      );

      if (!updateResult.success) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error: updateResult.error?.message ?? 'Failed to update order status',
        };
      }

      await queryRunner.commitTransaction();

      // Emit event after successful commit
      this.emitOrderConfirmedEvent(context, input, newStatus);

      this.logger.log(
        `Order ${input.orderId} confirmed: ${previousStatus} -> ${newStatus}`,
      );

      return {
        success: true,
        orderId: input.orderId,
        newStatus,
      };
    } catch (error) {
      this.logger.error('ConfirmOrderSaga execution error', error);
      await queryRunner.rollbackTransaction();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Step 1: Validate order exists and can be updated
   */
  private async validateOrder(
    context: SagaContext,
    input: ConfirmOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<MktOrderWorkspaceEntity>> {
    try {
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          context.workspaceId,
          MktOrderWorkspaceEntity,
          { shouldBypassPermissionChecks: true },
        );

      const order = await orderRepository.findOne({
        where: { id: input.orderId },
        relations: ['orderItems', 'mktLicense'],
      });

      if (!order) {
        return {
          success: false,
          error: new Error(`Order ${input.orderId} not found`),
        };
      }

      // Store for rollback
      context.orderId = order.id;
      context.orderCode = order.orderCode;
      context.rollbackData.set('previousOrder', {
        status: order.status,
        accountingConfirmed: order.accountingConfirmed,
      });

      return {
        success: true,
        data: order,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Validation failed'),
      };
    }
  }

  /**
   * Step 2: Update order status
   */
  private async updateOrderStatus(
    context: SagaContext,
    input: ConfirmOrderInput,
    action: ORDER_ACTION,
    newStatus: ORDER_STATUS,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult> {
    try {
      const updateData: Partial<MktOrderWorkspaceEntity> = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      // Handle accounting confirmation
      if (input.accountingConfirmed !== undefined) {
        updateData.accountingConfirmed = input.accountingConfirmed;
      }

      // Handle note
      if (input.note) {
        updateData.note = input.note;
      }

      // Update metadata with action
      updateData.metadata = JSON.stringify({
        orderAction: action,
        confirmedAt: new Date().toISOString(),
      }) as unknown as JSON;

      await queryRunner.manager.update(
        MktOrderWorkspaceEntity,
        { id: input.orderId },
        updateData,
      );

      context.metadata.set('newStatus', newStatus);
      context.metadata.set('action', action);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Update failed'),
      };
    }
  }

  /**
   * Get target status from action
   */
  private getTargetStatusFromAction(action: ORDER_ACTION): ORDER_STATUS {
    return this.orderStatusService.getStatusFromAction(action);
  }

  /**
   * Emit event after order confirmation
   */
  private emitOrderConfirmedEvent(
    context: SagaContext,
    input: ConfirmOrderInput,
    newStatus: ORDER_STATUS,
  ): void {
    if (!context.orderId) return;

    const eventType = input.accountingConfirmed
      ? MKT_ORDER_EVENT_TYPES.ACCOUNTING_CONFIRMED
      : MKT_ORDER_EVENT_TYPES.ORDER_UPDATED;

    this.eventEmitter.emit(eventType, {
      name: eventType,
      workspaceId: context.workspaceId,
      events: [
        {
          eventType,
          orderId: context.orderId,
          workspaceId: context.workspaceId,
          orderData: {
            id: context.orderId,
            status: newStatus,
            action: input.action,
            accountingConfirmed: input.accountingConfirmed,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    this.logger.log(`Emitted ${eventType} event for order: ${context.orderId}`);
  }
}
