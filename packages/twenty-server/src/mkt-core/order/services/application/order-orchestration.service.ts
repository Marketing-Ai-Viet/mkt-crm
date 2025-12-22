import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  CreateOrderSaga,
  ConfirmOrderSaga,
  UpdateOrderSaga,
  RefundOrderSaga,
} from 'src/mkt-core/order/orchestration/saga';
import {
  CreateOrderStep,
  CreateOrderItemsStep,
  CreateLicensesStep,
  CreatePaymentStep,
  FinalizeOrderStep,
  CreateSnapshotsStep,
  CalculatePromotionStep,
  RecordPromotionUsageStep,
} from 'src/mkt-core/order/orchestration/steps';
import {
  ValidateOrderStep,
  ValidateTransitionStep,
  UpdateStatusStep,
} from 'src/mkt-core/order/orchestration/steps/confirm-order';
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
    // Core Steps
    private readonly createOrderStep: CreateOrderStep,
    private readonly createOrderItemsStep: CreateOrderItemsStep,
    private readonly createLicensesStep: CreateLicensesStep,
    private readonly createPaymentStep: CreatePaymentStep,
    private readonly finalizeOrderStep: FinalizeOrderStep,
    // Snapshot & Promotion Steps
    private readonly createSnapshotsStep: CreateSnapshotsStep,
    private readonly calculatePromotionStep: CalculatePromotionStep,
    private readonly recordPromotionUsageStep: RecordPromotionUsageStep,
    // ConfirmOrder Steps
    private readonly validateOrderStep: ValidateOrderStep,
    private readonly validateTransitionStep: ValidateTransitionStep,
    private readonly updateStatusStep: UpdateStatusStep,
  ) {}

  /**
   * Register saga steps on module initialization
   *
   * Step order for CreateOrderSaga:
   * 1. CreateOrderStep - Create order entity
   * 2. CreateSnapshotsStep - Validate & create product/package snapshots
   * 3. CreateOrderItemsStep - Create order items with snapshots
   * 4. CalculatePromotionStep - Calculate and apply promotions
   * 5. CreateLicensesStep - Create licenses for order items
   * 6. CreatePaymentStep - Create payment (if not TRIAL)
   * 7. FinalizeOrderStep - Finalize order status
   *
   * Note: RecordPromotionUsageStep should be registered in ConfirmOrderSaga
   * since usage should only be recorded after order confirmation
   */
  onModuleInit(): void {
    this.createOrderSaga.registerSteps([
      this.createOrderStep,
      this.createSnapshotsStep,
      this.createOrderItemsStep,
      this.calculatePromotionStep,
      this.createLicensesStep,
      this.createPaymentStep,
      this.finalizeOrderStep,
    ]);

    this.confirmOrderSaga.registerSteps([
      this.validateOrderStep,
      this.validateTransitionStep,
      this.updateStatusStep,
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
