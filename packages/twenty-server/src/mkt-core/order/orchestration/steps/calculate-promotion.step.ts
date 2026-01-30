import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { CreateOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  CalculatePromotionStepOutput,
  CreateOrderWithItemsInput,
} from 'src/mkt-core/order/types';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

/**
 * CalculatePromotionStep - Calculate discount from percentage input
 *
 * Thực hiện:
 * - Tính discount dựa trên discountPercent từ client input
 * - Update order với discount amount
 *
 * Compensate:
 * - Reset discount về 0
 *
 * Skip condition:
 * - Không có discountPercent hoặc discountPercent = 0
 */
@Injectable()
export class CalculatePromotionStep extends SagaStep<
  CreateOrderWithItemsInput,
  CalculatePromotionStepOutput
> {
  // ============================================
  // STEP CONSTANTS
  // ============================================
  private static readonly STEP_NAME = 'calculate_discount';
  private static readonly STEP_DESCRIPTION =
    'Calculate and apply discount percentage to order';
  private static readonly MAX_DISCOUNT_PERCENT = 100;
  private static readonly MIN_DISCOUNT_PERCENT = 0;

  readonly name = CalculatePromotionStep.STEP_NAME;
  readonly description = CalculatePromotionStep.STEP_DESCRIPTION;

  private readonly logger = new Logger(CalculatePromotionStep.name);

  constructor(private readonly orderRepository: MktOrderRepository) {
    super();
  }

  /**
   * Skip if no discount to apply
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    const discountPercent = input.discountPercent ?? 0;

    if (
      discountPercent <= CalculatePromotionStep.MIN_DISCOUNT_PERCENT ||
      discountPercent > CalculatePromotionStep.MAX_DISCOUNT_PERCENT
    ) {
      this.logger.debug('Skipping: No valid discount percentage provided', {
        discountPercent,
      });

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

      const discountPercent = input.discountPercent ?? 0;

      this.logger.log(`Calculating discount for order: ${context.orderId}`, {
        discountPercent,
      });

      // Cast to typed context for type safety
      const typedContext = context as CreateOrderSagaContext;

      // Get order subtotal from typed context (set by CreateOrderItemsStep)
      const orderSubtotal = typedContext.totals?.totalAmount ?? 0;

      // Calculate discount amount using MoneyUtils
      const discountAmount = MoneyUtils.percentage(
        orderSubtotal,
        discountPercent,
      ).toNumber();
      const finalAmount = MoneyUtils.subtract(
        orderSubtotal,
        discountAmount,
      ).toNumber();

      // Update order with discount
      await this.orderRepository.updateOrder(
        context.orderId,
        {
          promotionDiscount: discountAmount,
          totalAmount: Math.max(0, finalAmount),
        },
        context.workspaceId,
      );

      // Store in typed context for subsequent steps
      typedContext.promotionResult = {
        totalDiscount: discountAmount,
        appliedPromotions: [],
        couponUsed: undefined,
      };
      typedContext.finalAmount = Math.max(0, finalAmount);

      // Store rollback data
      context.rollbackData.set(this.name, {
        orderId: context.orderId,
        originalTotalAmount: orderSubtotal,
      });

      this.logger.log('Discount calculated successfully', {
        discountPercent,
        discountAmount,
        orderSubtotal,
        finalAmount,
      });

      return {
        success: true,
        data: {
          promotionResult: {
            success: true,
            totalDiscount: discountAmount,
            finalOrderAmount: Math.max(0, finalAmount),
            promotions: [],
          },
          appliedPromotions: [],
          totalDiscount: discountAmount,
          finalAmount: Math.max(0, finalAmount),
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate discount', error);

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
      this.logger.warn('No discount data to compensate');

      return;
    }

    try {
      this.logger.warn('Compensating discount step - resetting discount data');

      // Reset discount fields using repository
      await this.orderRepository.updateOrder(
        rollbackData.orderId,
        {
          promotionDiscount: 0,
          totalAmount: rollbackData.originalTotalAmount,
        },
        context.workspaceId,
      );

      this.logger.log('Discount data reset successfully');
    } catch (error) {
      this.logger.error('Failed to compensate discount step', error);
      throw error;
    }
  }
}
