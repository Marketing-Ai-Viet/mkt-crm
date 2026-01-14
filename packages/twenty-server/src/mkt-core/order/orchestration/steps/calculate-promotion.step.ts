import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { OrderItemForPromotion } from 'src/mkt-core/mkt-promotion/types';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderPromotionIntegrationService } from 'src/mkt-core/order/services/integration/order-promotion.integration';
import {
  CalculatePromotionStepOutput,
  CreateOrderWithItemsInput,
  OrderDiscountContext,
  OrderPromotionResult,
} from 'src/mkt-core/order/types';

// ============================================
// STEP CONSTANTS
// ============================================

const STEP_NAME = 'calculate_promotion';
const STEP_DESCRIPTION = 'Calculate and apply promotions/discounts to order';
const DEFAULT_APPLY_AUTO_PROMOTIONS = true;

/**
 * CalculatePromotionStep - Calculate promotions and discounts
 *
 * Thực hiện:
 * - Build evaluation context từ order items
 * - Calculate discounts (auto promotions + coupon)
 * - Update order với promotion discount và applied promotions
 *
 * Compensate:
 * - Reset promotion fields về giá trị mặc định
 *
 * Skip condition:
 * - applyAutoPromotions = false AND không có couponCode
 */
@Injectable()
export class CalculatePromotionStep extends SagaStep<
  CreateOrderWithItemsInput,
  CalculatePromotionStepOutput
> {
  readonly name = STEP_NAME;
  readonly description = STEP_DESCRIPTION;

  private readonly logger = new Logger(CalculatePromotionStep.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly promotionIntegration: OrderPromotionIntegrationService,
  ) {
    super();
  }

  /**
   * Skip if no promotions to apply
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    const applyAutoPromotions =
      input.applyAutoPromotions ?? DEFAULT_APPLY_AUTO_PROMOTIONS;
    const hasCoupon = !!input.couponCode;

    if (!applyAutoPromotions && !hasCoupon) {
      this.logger.debug('Skipping: No promotions to apply');

      return true;
    }

    return false;
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CalculatePromotionStepOutput>> {
    try {
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      this.logger.log(`Calculating promotions for order: ${context.orderId}`);

      // Get order subtotal from context metadata
      // TODO : Combo calculation types may affect this
      // TODO: Customer tier discounts may affect this
      const orderSubtotal =
        (context.metadata.get('totalAmount') as number) ?? 0;

      // Build order items for promotion evaluation
      const orderItems = this.buildOrderItemsForPromotion(context);

      // Build discount context
      const discountContext: OrderDiscountContext = {
        workspaceId: context.workspaceId,
        customerId: input.customerId,
        orderItems,
        orderSubtotal,
        couponCode: input.couponCode,
        // Customer tags can be added from context if available
        customerTags: context.metadata.get('customerTags') as
          | string[]
          | undefined,
        isFirstOrder: context.metadata.get('isFirstOrder') as
          | boolean
          | undefined,
      };

      // Calculate discount
      const promotionResult =
        await this.promotionIntegration.calculateDiscount(discountContext);

      if (!promotionResult.success) {
        // Log warning but continue - promotions are optional
        this.logger.warn('Promotion calculation failed', {
          errors: promotionResult.errors,
        });

        // Return success with empty promotions
        return {
          success: true,
          data: {
            promotionResult,
            appliedPromotions: [],
            totalDiscount: 0,
            finalAmount: orderSubtotal,
          },
        };
      }

      // Update order with promotion data
      await this.updateOrderPromotions(
        context,
        promotionResult,
        input.couponCode,
      );

      // Store in context for subsequent steps
      context.metadata.set('promotionResult', promotionResult);
      context.metadata.set('appliedPromotions', promotionResult.promotions);
      context.metadata.set('promotionDiscount', promotionResult.totalDiscount);

      // Store rollback data
      context.rollbackData.set(this.name, {
        orderId: context.orderId,
        originalTotalAmount: orderSubtotal,
      });

      this.logger.log('Promotions calculated successfully', {
        totalDiscount: promotionResult.totalDiscount,
        promotionCount: promotionResult.promotions.length,
        finalAmount: promotionResult.finalOrderAmount,
      });

      return {
        success: true,
        data: {
          promotionResult,
          appliedPromotions: promotionResult.promotions,
          totalDiscount: promotionResult.totalDiscount,
          finalAmount: promotionResult.finalOrderAmount,
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate promotions', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const rollbackData = context.rollbackData.get(this.name) as {
      orderId: string;
      originalTotalAmount: number;
    } | null;

    if (!rollbackData?.orderId) {
      this.logger.warn('No promotion data to compensate');

      return;
    }

    try {
      this.logger.warn(
        'Compensating promotion step - resetting promotion data',
      );

      // Reset promotion fields using repository
      await this.orderRepository.updateOrder(rollbackData.orderId, {
        couponCode: null,
        promotionDiscount: 0,
        appliedPromotions: null,
        totalAmount: rollbackData.originalTotalAmount,
      });

      // Clear metadata
      context.metadata.delete('promotionResult');
      context.metadata.delete('appliedPromotions');
      context.metadata.delete('promotionDiscount');

      this.logger.log('Promotion data reset successfully');
    } catch (error) {
      this.logger.error('Failed to compensate promotion step', error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Build order items for promotion evaluation from context
   */
  private buildOrderItemsForPromotion(
    context: SagaContext,
  ): OrderItemForPromotion[] {
    // Try to get order items from metadata (set by CreateOrderItemsStep)
    const orderItems = context.metadata.get('orderItems') as
      | Array<{
          externalMktProductId?: string;
          externalMktPackageId?: string;
          quantity?: number;
          unitPrice?: number;
          totalPrice?: number;
        }>
      | undefined;

    if (!orderItems || orderItems.length === 0) {
      return [];
    }

    return orderItems.map((item) => ({
      productId: item.externalMktProductId ?? '',
      variantId: item.externalMktPackageId ?? null,
      categoryId: null, // Category info not available in current context
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? 0,
      totalPrice: item.totalPrice ?? 0,
    }));
  }

  /**
   * Update order with promotion data
   */
  private async updateOrderPromotions(
    context: SagaContext,
    result: OrderPromotionResult,
    couponCode: string | undefined,
  ): Promise<void> {
    const currentTotalAmount =
      (context.metadata.get('totalAmount') as number) ?? 0;

    const finalAmount = currentTotalAmount - result.totalDiscount;

    if (!context.orderId) {
      throw new Error('Order ID is required');
    }

    // Use repository for update - queryRunner.manager doesn't have workspace entity metadata
    await this.orderRepository.updateOrder(context.orderId, {
      couponCode: couponCode ?? null,
      promotionDiscount: result.totalDiscount,
      appliedPromotions:
        result.promotions.length > 0 ? result.promotions : null,
      totalAmount: Math.max(0, finalAmount), // Ensure non-negative
    });

    // Update totalAmount in context for subsequent steps
    context.metadata.set('totalAmount', Math.max(0, finalAmount));
  }
}
