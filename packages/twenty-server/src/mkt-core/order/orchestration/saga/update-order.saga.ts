import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  MKT_ORDER_EVENT_TYPES,
  SagaContext,
  SagaStepResult,
  UpdateOrderStatusInput,
  UpdateOrderStatusResponse,
} from 'src/mkt-core/order/types';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderStatusService } from 'src/mkt-core/order/services/core';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';

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
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  /**
   * Execute the update order saga
   *
   * Note: Workspace repository handles its own connection,
   * so external queryRunner transactions are not used.
   */
  async execute(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: UpdateOrderStatusInput,
  ): Promise<UpdateOrderStatusResponse> {
    const context: SagaContext = {
      workspaceId,
      workspaceMemberId,
      rollbackData: new Map(),
      metadata: new Map(),
    };

    try {
      // Step 1: Validate order exists
      const validateResult = await this.validateOrder(context, input);

      if (!validateResult.success) {
        return {
          success: false,
          error: validateResult.error?.message ?? 'Order validation failed',
        };
      }

      const currentOrder = validateResult.data;

      if (!currentOrder) {
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
        // Check if this is a terminal status - return as message, not error
        if (this.orderStatusService.isTerminalStatus(previousStatus)) {
          return {
            success: false,
            orderId: input.orderId,
            previousStatus,
            message: transitionResult.error,
          };
        }

        return {
          success: false,
          error:
            transitionResult.error ??
            `Invalid status transition: ${previousStatus} -> ${input.status}`,
        };
      }

      const { action, newStatus } = transitionResult;

      // Step 3: Update order status
      const updateResult = await this.updateOrderStatus(
        context,
        input,
        action,
        newStatus,
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error?.message ?? 'Failed to update order status',
        };
      }

      // Emit event after successful update
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

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 1: Validate order exists
   */
  private async validateOrder(
    context: SagaContext,
    input: UpdateOrderStatusInput,
  ): Promise<SagaStepResult<MktOrderWorkspaceEntity>> {
    try {
      const order = await this.mktOrderRepository.findByIdWithOptions(
        input.orderId,
        { relations: { orderItems: true } },
      );

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

  // DISABLED: handleSInvoiceSync - MktInvoiceModule temporarily disabled
  // /**
  //  * Handle S-Invoice sync
  //  */
  // private async handleSInvoiceSync(orderId: string): Promise<void> {
  //   try {
  //     this.logger.log(`Syncing S-Invoice for order: ${orderId}`);
  //     await this.sInvoiceIntegrationService.syncSInvoice(orderId);
  //     this.logger.log(`S-Invoice sync completed for order: ${orderId}`);
  //   } catch (error) {
  //     this.logger.error(`S-Invoice sync failed for order: ${orderId}`, error);
  //     // Don't fail the saga, S-Invoice can be synced later
  //   }
  // }

  /**
   * Step 2: Update order status
   */
  private async updateOrderStatus(
    context: SagaContext,
    input: UpdateOrderStatusInput,
    action: ORDER_ACTION,
    newStatus: ORDER_STATUS,
  ): Promise<SagaStepResult> {
    try {
      const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());
      const updateData: Partial<MktOrderWorkspaceEntity> = {
        status: newStatus,
        updatedAt: nowISO,
      };

      // Handle note
      if (input.note) {
        updateData.note = input.note;
      }

      // Update metadata with action
      updateData.metadata = safeJsonStringify({
        orderAction: action,
        updatedAt: nowISO,
      }) as unknown as JSON;

      await this.mktOrderRepository.update(input.orderId, updateData);

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
          timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
        },
      ],
    });

    this.logger.log(
      `Emitted ORDER_UPDATED event for order: ${context.orderId}`,
    );
  }
}
