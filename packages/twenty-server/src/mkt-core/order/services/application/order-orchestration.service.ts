import { Injectable, Logger } from '@nestjs/common';

import {
  IdempotencyService,
  IdempotencyDomain,
} from 'src/mkt-core/common/idempotency';
import {
  MKT_ORDER_ORCHESTRATION_LOG_CONTEXT,
  MKT_ORDER_ORCHESTRATION_LOG_MESSAGES,
} from 'src/mkt-core/order/messages';
import {
  CreateOrderSaga,
  ConfirmOrderSaga,
  UpdateOrderSaga,
  RefundOrderSaga,
} from 'src/mkt-core/order/orchestration/saga';
import { OrderValidationService } from 'src/mkt-core/order/services/core';
import { OrderItemService } from 'src/mkt-core/order/services/domain';
import {
  CreateOrderWithItemsInput,
  CreateOrderResponse,
  ConfirmOrderInput,
  ConfirmOrderResponse,
  RefundOrderInput,
  RefundOrderResponse,
  UpdateOrderStatusInput,
  UpdateOrderStatusResponse,
  UpdateOrderItemInput,
  UpdateOrderItemResponse,
} from 'src/mkt-core/order/types';

const LOG = MKT_ORDER_ORCHESTRATION_LOG_MESSAGES;

/**
 * OrderOrchestrationService - Facade for order operations
 *
 * Provides a clean API for order operations by:
 * - Validating inputs before processing
 * - Orchestrating saga execution
 * - Handling errors gracefully
 *
 * Note: Saga steps are registered in each saga's onModuleInit()
 */
@Injectable()
export class OrderOrchestrationService {
  private readonly logger = new Logger(MKT_ORDER_ORCHESTRATION_LOG_CONTEXT);

  constructor(
    private readonly createOrderSaga: CreateOrderSaga,
    private readonly confirmOrderSaga: ConfirmOrderSaga,
    private readonly updateOrderSaga: UpdateOrderSaga,
    private readonly refundOrderSaga: RefundOrderSaga,
    private readonly validationService: OrderValidationService,
    private readonly orderItemService: OrderItemService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * Create order with items using saga pattern
   * Includes idempotency support to prevent duplicate orders
   */
  async createOrderWithItems(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: CreateOrderWithItemsInput,
  ): Promise<CreateOrderResponse> {
    this.logger.log(LOG.CREATE_START(input.customerId, input.action));

    const result =
      await this.idempotencyService.executeWithIdempotency<CreateOrderResponse>(
        {
          workspaceId,
          domain: 'order' as IdempotencyDomain,
          action: 'createOrder',
          requestBody: input,
        },
        async () =>
          this.executeCreateOrder(workspaceId, workspaceMemberId, input),
      );

    if (result.fromCache) {
      this.logger.log(LOG.CREATE_CACHED());
    }

    return result.data;
  }

  /**
   * Execute order creation (validation + saga)
   */
  private async executeCreateOrder(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: CreateOrderWithItemsInput,
  ): Promise<CreateOrderResponse> {
    // Validate input
    const validationResult =
      await this.validationService.validateCreateOrderInput(workspaceId, input);

    this.logger.debug(LOG.CREATE_VALIDATION_RESULT(validationResult.valid));

    if (!validationResult.valid) {
      const errorMessages = validationResult.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');

      this.logger.warn(LOG.CREATE_VALIDATION_FAILED(errorMessages));

      return {
        success: false,
        error: LOG.CREATE_VALIDATION_FAILED(errorMessages),
      };
    }

    // Execute saga
    try {
      const result = await this.createOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success) {
        this.logger.log(
          LOG.CREATE_SUCCESS(result.orderId ?? '', result.orderCode ?? ''),
        );
      } else {
        this.logger.error(LOG.CREATE_FAILED(result.error ?? ''));
      }

      return result;
    } catch (error) {
      this.logger.error(LOG.CREATE_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Confirm order (change status) using ConfirmOrderSaga
   */
  async confirmOrder(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: ConfirmOrderInput,
  ): Promise<ConfirmOrderResponse> {
    this.logger.log(
      LOG.CONFIRM_START(
        input.orderId,
        input.action,
        workspaceMemberId ?? 'system',
      ),
    );

    // Validate input
    const validationResult =
      await this.validationService.validateConfirmOrderInput(
        workspaceId,
        input,
      );

    if (!validationResult.valid) {
      const errorMessages = validationResult.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');

      return {
        success: false,
        error: LOG.CREATE_VALIDATION_FAILED(errorMessages),
      };
    }

    // Execute saga
    try {
      const result = await this.confirmOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success && result.data) {
        this.logger.log(
          LOG.CONFIRM_SUCCESS(
            result.data.orderId ?? '',
            result.data.newStatus ?? '',
          ),
        );

        return result.data;
      }

      this.logger.error(LOG.CONFIRM_FAILED(result.error ?? ''));

      return {
        success: false,
        error: result.error ?? LOG.CONFIRM_FAILED('Unknown error'),
      };
    } catch (error) {
      this.logger.error(LOG.CONFIRM_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update order status using UpdateOrderSaga
   */
  async updateOrderStatus(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: UpdateOrderStatusInput,
  ): Promise<UpdateOrderStatusResponse> {
    this.logger.log(
      LOG.UPDATE_STATUS_START(
        input.orderId,
        input.status,
        workspaceMemberId ?? 'system',
      ),
    );

    try {
      const result = await this.updateOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success) {
        this.logger.log(
          LOG.UPDATE_STATUS_SUCCESS(
            result.orderId ?? '',
            result.previousStatus ?? '',
            result.newStatus ?? '',
          ),
        );
      } else {
        this.logger.error(LOG.UPDATE_STATUS_FAILED(result.error ?? ''));
      }

      return result;
    } catch (error) {
      this.logger.error(LOG.UPDATE_STATUS_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refund order using RefundOrderSaga
   */
  async refundOrder(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: RefundOrderInput,
  ): Promise<RefundOrderResponse> {
    this.logger.log(
      LOG.REFUND_START(
        input.orderId,
        input.isPartial ?? false,
        workspaceMemberId ?? 'system',
      ),
    );

    try {
      const result = await this.refundOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success) {
        this.logger.log(
          LOG.REFUND_SUCCESS(result.orderId ?? '', result.refundedAmount ?? 0),
        );
      } else {
        this.logger.error(LOG.REFUND_FAILED(result.error ?? ''));
      }

      return result;
    } catch (error) {
      this.logger.error(LOG.REFUND_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update order item using OrderItemService
   */
  async updateOrderItem(
    workspaceId: string,
    input: UpdateOrderItemInput,
  ): Promise<UpdateOrderItemResponse> {
    this.logger.log(LOG.UPDATE_ITEM_START(input.orderItemId));

    try {
      const result = await this.orderItemService.updateOrderItem(
        input.orderItemId,
        workspaceId,
        input,
      );

      if (result.success) {
        this.logger.log(LOG.UPDATE_ITEM_SUCCESS(result.orderItem?.id ?? ''));
      } else {
        this.logger.error(LOG.UPDATE_ITEM_FAILED(result.error ?? ''));
      }

      return {
        success: result.success,
        orderItemId: result.orderItem?.id,
        orderId: result.orderItem?.mktOrderId,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(LOG.UPDATE_ITEM_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Recalculate all order items for an order
   */
  async recalculateOrderItems(
    workspaceId: string,
    orderId: string,
  ): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
    this.logger.log(LOG.RECALCULATE_START(orderId));

    try {
      const result = await this.orderItemService.recalculateAllOrderItems(
        orderId,
        workspaceId,
      );

      if (result.success) {
        this.logger.log(LOG.RECALCULATE_SUCCESS(result.updatedCount ?? 0));
      } else {
        this.logger.error(LOG.RECALCULATE_HAD_ERRORS());
      }

      return result;
    } catch (error) {
      this.logger.error(LOG.RECALCULATE_UNEXPECTED_ERROR(), error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate create order input without executing
   */
  async validateCreateOrderInput(
    workspaceId: string,
    input: CreateOrderWithItemsInput,
  ): Promise<{
    valid: boolean;
    errors: Array<{ field: string; message: string; code: string }>;
  }> {
    return this.validationService.validateCreateOrderInput(workspaceId, input);
  }
}
