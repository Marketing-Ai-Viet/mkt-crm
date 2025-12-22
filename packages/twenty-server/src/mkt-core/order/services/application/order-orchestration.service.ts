import { Injectable, Logger } from '@nestjs/common';

import {
  IDEMPOTENCY_ACTION,
  IdempotencyService,
} from 'src/mkt-core/order/orchestration/idempotency';
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
  private readonly logger = new Logger(OrderOrchestrationService.name);

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
    this.logger.log(
      `Creating order for customer: ${input.customerId}, action: ${input.action}`,
    );

    // Generate idempotency key
    const idempotencyKey = this.idempotencyService.generateKey(
      workspaceId,
      IDEMPOTENCY_ACTION.CREATE_ORDER,
      input,
    );

    // Check for duplicate request
    const duplicateResult = await this.handleDuplicateCheck(idempotencyKey);

    if (duplicateResult) {
      return duplicateResult;
    }

    // Acquire lock for processing
    const lockAcquired =
      await this.idempotencyService.acquireLock(idempotencyKey);

    if (!lockAcquired) {
      return {
        success: false,
        error: 'Another request is being processed. Please try again.',
      };
    }

    this.logger.debug(`Lock acquired for: ${idempotencyKey}`);

    try {
      // Store pending status
      await this.idempotencyService.storePending(idempotencyKey, input);
      this.logger.debug('Pending status stored');

      // Execute order creation
      const result = await this.executeCreateOrder(
        workspaceId,
        workspaceMemberId,
        input,
      );

      // Store result
      if (result.success) {
        await this.idempotencyService.storeSuccess(idempotencyKey, result);
      } else {
        await this.idempotencyService.storeFailed(
          idempotencyKey,
          result.error ?? 'Order creation failed',
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.idempotencyService.storeFailed(idempotencyKey, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      await this.idempotencyService.releaseLock(idempotencyKey);
    }
  }

  /**
   * Handle duplicate request check
   * Returns cached response if duplicate, null if should proceed
   */
  private async handleDuplicateCheck(
    idempotencyKey: string,
  ): Promise<CreateOrderResponse | null> {
    const { isDuplicate, record } =
      await this.idempotencyService.checkDuplicate<CreateOrderResponse>(
        idempotencyKey,
      );

    if (!isDuplicate || !record) {
      return null;
    }

    // Return cached response for completed requests
    if (record.status === 'COMPLETED' && record.response) {
      this.logger.log(`Returning cached response for: ${idempotencyKey}`);

      return record.response;
    }

    // Wait for pending request to complete
    if (record.status === 'PENDING') {
      this.logger.log(`Waiting for pending request: ${idempotencyKey}`);
      const completed =
        await this.idempotencyService.waitForCompletion<CreateOrderResponse>(
          idempotencyKey,
        );

      if (completed?.response) {
        return completed.response;
      }

      return {
        success: false,
        error: 'Request timeout while waiting for duplicate request',
      };
    }

    // For failed requests, allow retry (return null to proceed)
    if (record.status === 'FAILED') {
      this.logger.log(`Retrying failed request: ${idempotencyKey}`);
    }

    return null;
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

    this.logger.debug(`Validation result: valid=${validationResult.valid}`);

    if (!validationResult.valid) {
      const errorMessages = validationResult.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('; ');

      this.logger.warn(`Validation failed: ${errorMessages}`);

      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
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
          `Order created successfully: ${result.orderId} (${result.orderCode})`,
        );
      } else {
        this.logger.error(`Order creation failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Unexpected error during order creation', error);

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
      `Confirming order: ${input.orderId}, action: ${input.action}, by: ${workspaceMemberId ?? 'system'}`,
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
        error: `Validation failed: ${errorMessages}`,
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
          `Order confirmed: ${result.data.orderId} -> ${result.data.newStatus}`,
        );

        return result.data;
      }

      this.logger.error(`Order confirmation failed: ${result.error}`);

      return {
        success: false,
        error: result.error ?? 'Order confirmation failed',
      };
    } catch (error) {
      this.logger.error('Unexpected error during order confirmation', error);

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
      `Updating order status: ${input.orderId}, target: ${input.status}, by: ${workspaceMemberId ?? 'system'}`,
    );

    try {
      const result = await this.updateOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success) {
        this.logger.log(
          `Order status updated: ${result.orderId} ${result.previousStatus} -> ${result.newStatus}`,
        );
      } else {
        this.logger.error(`Order status update failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Unexpected error during order status update', error);

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
      `Refunding order: ${input.orderId}, partial: ${input.isPartial ?? false}, by: ${workspaceMemberId ?? 'system'}`,
    );

    try {
      const result = await this.refundOrderSaga.execute(
        workspaceId,
        workspaceMemberId,
        input,
      );

      if (result.success) {
        this.logger.log(
          `Order refunded: ${result.orderId}, amount: ${result.refundedAmount}`,
        );
      } else {
        this.logger.error(`Order refund failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Unexpected error during order refund', error);

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
    this.logger.log(`Updating order item: ${input.orderItemId}`);

    try {
      const result = await this.orderItemService.updateOrderItem(
        input.orderItemId,
        workspaceId,
        input,
      );

      if (result.success) {
        this.logger.log(`Order item updated: ${result.orderItem?.id}`);
      } else {
        this.logger.error(`Order item update failed: ${result.error}`);
      }

      return {
        success: result.success,
        orderItemId: result.orderItem?.id,
        orderId: result.orderItem?.mktOrderId,
        error: result.error,
      };
    } catch (error) {
      this.logger.error('Unexpected error during order item update', error);

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
    this.logger.log(`Recalculating order items for order: ${orderId}`);

    try {
      const result = await this.orderItemService.recalculateAllOrderItems(
        orderId,
        workspaceId,
      );

      if (result.success) {
        this.logger.log(
          `Order items recalculated: ${result.updatedCount} items`,
        );
      } else {
        this.logger.error(`Order items recalculation had errors`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        'Unexpected error during order items recalculation',
        error,
      );

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
