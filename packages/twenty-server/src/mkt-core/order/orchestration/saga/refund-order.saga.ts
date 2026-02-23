import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
  RefundOrderInput,
  RefundOrderResponse,
  SagaContext,
  SagaStepResult,
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
import { DASHBOARD_INVALIDATION_EVENTS } from 'src/mkt-core/mkt-dashboard/listeners/dashboard-cache-invalidation.listener';

/**
 * RefundOrderSaga - Saga for refunding orders
 *
 * Handles order refunds with:
 * - Full refund: Order status -> REFUND
 * - Partial refund: Order status -> REFUND_PARTIAL
 *
 * Steps:
 * 1. Validate order can be refunded
 * 2. Calculate refund amount
 * 3. Update order status and refund amount
 * 4. Emit events
 *
 * NOTE: License management has been removed from this saga.
 * License refunds should be handled separately via license integration service.
 */
@Injectable()
export class RefundOrderSaga {
  private readonly logger = new Logger(RefundOrderSaga.name);

  constructor(
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  /**
   * Execute the refund order saga
   *
   * Note: Workspace repository handles its own connection,
   * so external queryRunner transactions are not used.
   */
  async execute(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: RefundOrderInput,
  ): Promise<RefundOrderResponse> {
    const context: SagaContext = {
      workspaceId,
      workspaceMemberId,
      rollbackData: new Map(),
      metadata: new Map(),
    };

    try {
      // Step 1: Validate order can be refunded
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

      // Determine if partial or full refund
      const isPartial =
        input.isPartial ?? (input.licenseIds && input.licenseIds.length > 0);
      const action = isPartial
        ? ORDER_ACTION.REFUND_PARTIAL
        : ORDER_ACTION.REFUND;
      const newStatus = isPartial
        ? ORDER_STATUS.REFUND_PARTIAL
        : ORDER_STATUS.REFUND;

      // Validate transition
      if (
        !this.orderStatusService.validateTransition(previousStatus, newStatus)
      ) {
        return {
          success: false,
          error: `Cannot refund order with status: ${previousStatus}`,
        };
      }

      // Step 2: Calculate refund amount
      // NOTE: License-based refund calculation has been removed.
      // Use explicit refundAmount from input or default to 0
      const refundAmount = input.refundAmount ?? 0;

      if (refundAmount === 0 && !input.refundAmount) {
        return {
          success: false,
          error: 'Refund amount must be specified',
        };
      }

      // Step 3: Update order status and refund amount
      const updateOrderResult = await this.updateOrderForRefund(
        context,
        input,
        action,
        newStatus,
        refundAmount,
        input.licenseIds ?? [],
      );

      if (!updateOrderResult.success) {
        return {
          success: false,
          error: updateOrderResult.error?.message ?? 'Failed to update order',
        };
      }

      // Emit event after successful update
      this.emitRefundEvent(context, input, newStatus, refundAmount);

      this.logger.log(
        `Order ${input.orderId} refunded: ${previousStatus} -> ${newStatus}, amount: ${refundAmount}`,
      );

      return {
        success: true,
        orderId: input.orderId,
        refundedAmount: refundAmount,
        newStatus,
      };
    } catch (error) {
      this.logger.error('RefundOrderSaga execution error', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 1: Validate order can be refunded
   */
  private async validateOrder(
    context: SagaContext,
    input: RefundOrderInput,
  ): Promise<SagaStepResult<MktOrderWorkspaceEntity>> {
    try {
      const order = await this.mktOrderRepository.findByIdWithOptions(
        input.orderId,
        { relations: { orderItems: true } },
        context.workspaceId,
      );

      if (!order) {
        return {
          success: false,
          error: new Error(`Order ${input.orderId} not found`),
        };
      }

      // Check if order can be refunded
      const status = order.status as ORDER_STATUS;
      const refundableStatuses = [
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.REFUND_PARTIAL,
      ];

      if (!refundableStatuses.includes(status)) {
        return {
          success: false,
          error: new Error(`Order with status ${status} cannot be refunded`),
        };
      }

      // Store for rollback and context
      context.orderId = order.id;
      context.orderCode = order.orderCode;
      context.rollbackData.set('previousOrder', {
        status: order.status,
        refundAmount: order.refundAmount,
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
   * REMOVED: License management methods
   * License refunds should be handled separately via MktLicenseIntegration service
   *
   * Removed methods:
   * - getLicensesToRefund
   * - calculateRefundAmount
   * - updateLicenseStatuses
   */

  /**
   * Update order for refund
   */
  private async updateOrderForRefund(
    context: SagaContext,
    input: RefundOrderInput,
    action: ORDER_ACTION,
    newStatus: ORDER_STATUS,
    refundAmount: number,
    refundedLicenseIds: string[],
  ): Promise<SagaStepResult> {
    try {
      // Build refund metadata
      const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());
      const refundMetadata = {
        orderAction: action,
        refundedAt: nowISO,
        refundedLicenseIds,
        refundAmount,
        reason: input.reason,
      };

      await this.mktOrderRepository.updateOrder(
        input.orderId,
        {
          status: newStatus,
          refundAmount,
          updatedAt: nowISO,
          metadata: safeJsonStringify(refundMetadata) as unknown as JSON,
        },
        context.workspaceId,
      );

      context.metadata.set('newStatus', newStatus);
      context.metadata.set('refundAmount', refundAmount);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error : new Error('Order update failed'),
      };
    }
  }

  /**
   * Emit refund event
   */
  private emitRefundEvent(
    context: SagaContext,
    input: RefundOrderInput,
    newStatus: ORDER_STATUS,
    refundAmount: number,
  ): void {
    if (!context.orderId) return;

    this.eventEmitter.emit(MKT_EVENT_TYPE.MKT_ORDER, {
      name: MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
      workspaceId: context.workspaceId,
      events: [
        {
          eventType: MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
          orderId: context.orderId,
          workspaceId: context.workspaceId,
          orderData: {
            id: context.orderId,
            status: newStatus,
            refundAmount,
            reason: input.reason,
            isPartial: input.isPartial,
          },
          timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
        },
      ],
    });

    // Invalidate dashboard caches (order revenue affected by refund)
    this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.ORDER_CHANGED, {
      workspaceId: context.workspaceId,
      entityId: context.orderId,
    });

    this.logger.log(
      `Emitted ORDER_REFUNDED event for order: ${context.orderId}`,
    );
  }
}
