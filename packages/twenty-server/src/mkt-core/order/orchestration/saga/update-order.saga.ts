import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/common/common.type';
import { SInvoiceIntegrationService } from 'src/mkt-core/invoice/integration/s-invoice.integration.service';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderStatusService } from 'src/mkt-core/order/services/core';
import {
  UpdateOrderStatusInput,
  UpdateOrderStatusResponse,
} from 'src/mkt-core/order/types';

import { SagaContext, SagaStepResult } from './order-saga.interface';

/**
 * UpdateOrderSaga - Saga for updating order status
 *
 * Handles general order status transitions:
 * - Validates order exists
 * - Determines action from current and target status
 * - Validates transition is allowed
 * - Handles special cases (SINVOICE sync, etc.)
 * - Updates order status
 * - Emits appropriate events
 */
@Injectable()
export class UpdateOrderSaga {
  private readonly logger = new Logger(UpdateOrderSaga.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderStatusService: OrderStatusService,
    private readonly sInvoiceIntegrationService: SInvoiceIntegrationService,
  ) {}

  /**
   * Execute the update order saga
   */
  async execute(
    workspaceId: string,
    input: UpdateOrderStatusInput,
  ): Promise<UpdateOrderStatusResponse> {
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
        { status: input.status },
      );

      if (
        !transitionResult.valid ||
        !transitionResult.action ||
        !transitionResult.newStatus
      ) {
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          error:
            transitionResult.error ??
            `Invalid status transition: ${previousStatus} -> ${input.status}`,
        };
      }

      const { action, newStatus } = transitionResult;

      // Step 3: Handle special actions
      if (this.orderStatusService.requiresSInvoiceSync(action)) {
        await this.handleSInvoiceSync(input.orderId);
      }

      // Step 4: Update order status
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
      this.emitOrderUpdatedEvent(context, input, action, newStatus);

      this.logger.log(
        `Order ${input.orderId} updated: ${previousStatus} -> ${newStatus} (action: ${action})`,
      );

      return {
        success: true,
        orderId: input.orderId,
        previousStatus,
        newStatus,
      };
    } catch (error) {
      this.logger.error('UpdateOrderSaga execution error', error);
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
   * Step 1: Validate order exists
   */
  private async validateOrder(
    context: SagaContext,
    input: UpdateOrderStatusInput,
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

      // Store for rollback and context
      context.orderId = order.id;
      context.orderCode = order.orderCode;
      context.rollbackData.set('previousOrder', {
        status: order.status,
        note: order.note,
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
   * Handle S-Invoice sync
   */
  private async handleSInvoiceSync(orderId: string): Promise<void> {
    try {
      this.logger.log(`Syncing S-Invoice for order: ${orderId}`);
      await this.sInvoiceIntegrationService.syncSInvoice(orderId);
      this.logger.log(`S-Invoice sync completed for order: ${orderId}`);
    } catch (error) {
      this.logger.error(`S-Invoice sync failed for order: ${orderId}`, error);
      // Don't fail the saga, S-Invoice can be synced later
    }
  }

  /**
   * Step 2: Update order status
   */
  private async updateOrderStatus(
    context: SagaContext,
    input: UpdateOrderStatusInput,
    action: ORDER_ACTION,
    newStatus: ORDER_STATUS,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult> {
    try {
      const updateData: Partial<MktOrderWorkspaceEntity> = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      // Handle note
      if (input.note) {
        updateData.note = input.note;
      }

      // Update metadata with action
      updateData.metadata = JSON.stringify({
        orderAction: action,
        updatedAt: new Date().toISOString(),
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
   * Emit event after order update
   */
  private emitOrderUpdatedEvent(
    context: SagaContext,
    input: UpdateOrderStatusInput,
    action: ORDER_ACTION,
    newStatus: ORDER_STATUS,
  ): void {
    if (!context.orderId) return;

    this.eventEmitter.emit(MKT_ORDER_EVENT_TYPES.ORDER_UPDATED, {
      name: MKT_ORDER_EVENT_TYPES.ORDER_UPDATED,
      workspaceId: context.workspaceId,
      events: [
        {
          eventType: MKT_ORDER_EVENT_TYPES.ORDER_UPDATED,
          orderId: context.orderId,
          workspaceId: context.workspaceId,
          orderData: {
            id: context.orderId,
            status: newStatus,
            action,
            note: input.note,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    this.logger.log(
      `Emitted ORDER_UPDATED event for order: ${context.orderId}`,
    );
  }
}
