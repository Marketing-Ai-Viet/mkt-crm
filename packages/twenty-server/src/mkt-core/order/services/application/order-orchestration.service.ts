import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  CreateOrderSaga,
  ConfirmOrderSaga,
  UpdateOrderSaga,
  RefundOrderSaga,
} from 'src/mkt-core/order/orchestration/saga';
import { CreateOrderStep } from 'src/mkt-core/order/orchestration/steps/create-order.step';
import { CreateOrderItemsStep } from 'src/mkt-core/order/orchestration/steps/create-order-items.step';
import { CreateLicensesStep } from 'src/mkt-core/order/orchestration/steps/create-licenses.step';
import { CreatePaymentStep } from 'src/mkt-core/order/orchestration/steps/create-payment.step';
import { FinalizeOrderStep } from 'src/mkt-core/order/orchestration/steps/finalize-order.step';
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
 */
@Injectable()
export class OrderOrchestrationService implements OnModuleInit {
  private readonly logger = new Logger(OrderOrchestrationService.name);

  constructor(
    private readonly createOrderSaga: CreateOrderSaga,
    private readonly confirmOrderSaga: ConfirmOrderSaga,
    private readonly updateOrderSaga: UpdateOrderSaga,
    private readonly refundOrderSaga: RefundOrderSaga,
    private readonly validationService: OrderValidationService,
    private readonly orderItemService: OrderItemService,
    // Steps
    private readonly createOrderStep: CreateOrderStep,
    private readonly createOrderItemsStep: CreateOrderItemsStep,
    private readonly createLicensesStep: CreateLicensesStep,
    private readonly createPaymentStep: CreatePaymentStep,
    private readonly finalizeOrderStep: FinalizeOrderStep,
  ) {}

  /**
   * Register saga steps on module initialization
   */
  onModuleInit(): void {
    this.createOrderSaga.registerSteps([
      this.createOrderStep,
      this.createOrderItemsStep,
      this.createLicensesStep,
      this.createPaymentStep,
      this.finalizeOrderStep,
    ]);

    this.logger.log('Order saga steps registered successfully');
  }

  /**
   * Create order with items using saga pattern
   */
  async createOrderWithItems(
    workspaceId: string,
    workspaceMemberId: string | undefined,
    input: CreateOrderWithItemsInput,
  ): Promise<CreateOrderResponse> {
    this.logger.log(
      `Creating order for customer: ${input.customerId}, action: ${input.action}`,
    );

    // Validate input
    const validationResult =
      await this.validationService.validateCreateOrderInput(workspaceId, input);

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
    input: ConfirmOrderInput,
  ): Promise<ConfirmOrderResponse> {
    this.logger.log(
      `Confirming order: ${input.orderId}, action: ${input.action}`,
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
      const result = await this.confirmOrderSaga.execute(workspaceId, input);

      if (result.success) {
        this.logger.log(
          `Order confirmed: ${result.orderId} -> ${result.newStatus}`,
        );
      } else {
        this.logger.error(`Order confirmation failed: ${result.error}`);
      }

      return result;
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
    input: UpdateOrderStatusInput,
  ): Promise<UpdateOrderStatusResponse> {
    this.logger.log(
      `Updating order status: ${input.orderId}, target: ${input.status}`,
    );

    try {
      const result = await this.updateOrderSaga.execute(workspaceId, input);

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
    input: RefundOrderInput,
  ): Promise<RefundOrderResponse> {
    this.logger.log(
      `Refunding order: ${input.orderId}, partial: ${input.isPartial ?? false}`,
    );

    try {
      const result = await this.refundOrderSaga.execute(workspaceId, input);

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
