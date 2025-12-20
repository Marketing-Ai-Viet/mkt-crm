import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { PromotionSnapshot } from 'src/mkt-core/mkt-promotion/types';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga/order-saga.interface';
import {
  OrderPromotionIntegrationService,
  PromotionUsageInput,
} from 'src/mkt-core/order/services/integration/order-promotion.integration';
import { CreateOrderWithItemsInput } from 'src/mkt-core/order/types';

// ============================================
// STEP OUTPUT TYPE
// ============================================

export type RecordPromotionUsageStepOutput = {
  recordedCount: number;
  errors: string[];
};

// ============================================
// STEP CONSTANTS
// ============================================

const STEP_NAME = 'record_promotion_usage';
const STEP_DESCRIPTION = 'Record promotion usage after order confirmation';

/**
 * RecordPromotionUsageStep - Record promotion usage for tracking
 *
 * Thực hiện:
 * - Lấy applied promotions từ context
 * - Tạo usage records cho mỗi promotion
 * - Record usage qua PromotionUsageApplicationService
 *
 * Compensate:
 * - Rollback usage (currently placeholder - không implement)
 *
 * Skip condition:
 * - Không có applied promotions trong context
 *
 * Note: Step này chỉ nên chạy khi order đã được confirm
 * (trong ConfirmOrderSaga, không phải CreateOrderSaga)
 */
@Injectable()
export class RecordPromotionUsageStep extends SagaStep<
  CreateOrderWithItemsInput,
  RecordPromotionUsageStepOutput
> {
  readonly name = STEP_NAME;
  readonly description = STEP_DESCRIPTION;

  private readonly logger = new Logger(RecordPromotionUsageStep.name);

  constructor(
    private readonly promotionIntegration: OrderPromotionIntegrationService,
  ) {
    super();
  }

  /**
   * Skip if no promotions were applied
   */
  shouldSkip(context: SagaContext, _input: CreateOrderWithItemsInput): boolean {
    const appliedPromotions = context.metadata.get('appliedPromotions') as
      | PromotionSnapshot[]
      | undefined;

    if (!appliedPromotions || appliedPromotions.length === 0) {
      this.logger.debug('Skipping: No applied promotions to record');

      return true;
    }

    return false;
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<RecordPromotionUsageStepOutput>> {
    try {
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      const appliedPromotions = context.metadata.get('appliedPromotions') as
        | PromotionSnapshot[]
        | undefined;

      if (!appliedPromotions || appliedPromotions.length === 0) {
        return {
          success: true,
          data: {
            recordedCount: 0,
            errors: [],
          },
        };
      }

      this.logger.log(
        `Recording ${appliedPromotions.length} promotion usages for order: ${context.orderId}`,
      );

      // Get order subtotal for original amount
      const orderSubtotal =
        (context.metadata.get('totalAmount') as number) ?? 0;
      const promotionDiscount =
        (context.metadata.get('promotionDiscount') as number) ?? 0;
      const originalAmount = orderSubtotal + promotionDiscount;

      // Build usage inputs
      const usageInputs = this.buildUsageInputs(
        context,
        input,
        appliedPromotions,
        originalAmount,
      );

      // Record usage
      const result = await this.promotionIntegration.recordUsage(
        context.workspaceId,
        usageInputs,
      );

      // Store rollback data
      context.rollbackData.set(this.name, {
        orderId: context.orderId,
        promotionIds: appliedPromotions.map((p) => p.promotionId),
      });

      if (!result.success) {
        this.logger.warn('Some promotion usages failed to record', {
          recorded: result.recordedCount,
          errors: result.errors,
        });
      }

      this.logger.log('Promotion usages recorded', {
        recorded: result.recordedCount,
        total: usageInputs.length,
      });

      return {
        success: true, // Continue even if some fail
        data: {
          recordedCount: result.recordedCount,
          errors: result.errors,
        },
      };
    } catch (error) {
      this.logger.error('Failed to record promotion usages', error);

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
      promotionIds: string[];
    } | null;

    if (!rollbackData?.orderId) {
      this.logger.warn('No promotion usage data to compensate');

      return;
    }

    try {
      this.logger.warn('Compensating promotion usage step');

      // Rollback usage (placeholder - not implemented in promotion module)
      const result = await this.promotionIntegration.rollbackUsage(
        context.workspaceId,
        rollbackData.orderId,
      );

      this.logger.log('Promotion usage rollback attempted', {
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      this.logger.error('Failed to compensate promotion usage step', error);
      // Don't throw - rollback is best effort
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Build usage inputs from applied promotions
   */
  private buildUsageInputs(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    promotions: PromotionSnapshot[],
    originalAmount: number,
  ): PromotionUsageInput[] {
    return promotions.map((promotion) => ({
      promotionId: promotion.promotionId,
      orderId: context.orderId ?? '',
      customerId: input.customerId,
      discountAmount: promotion.discountAmount,
      originalAmount,
      couponId: promotion.couponCode
        ? this.getCouponIdFromCode(context, promotion.couponCode)
        : undefined,
    }));
  }

  /**
   * Get coupon ID from code (from context metadata if available)
   */
  private getCouponIdFromCode(
    context: SagaContext,
    couponCode: string,
  ): string | undefined {
    const couponMap = context.metadata.get('couponCodeToIdMap') as
      | Map<string, string>
      | undefined;

    return couponMap?.get(couponCode);
  }
}
