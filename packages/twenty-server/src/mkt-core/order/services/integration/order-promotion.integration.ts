import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { PromotionApplicationService } from 'src/mkt-core/mkt-promotion/services/application/promotion-application.service';
import { PromotionUsageApplicationService } from 'src/mkt-core/mkt-promotion/services/application/promotion-usage-application.service';
import { CouponApplicationService } from 'src/mkt-core/mkt-promotion/services/application/coupon-application.service';
import {
  PromotionEvaluationContext,
  AppliedPromotionsResult,
  PromotionSnapshot,
  OrderItemForPromotion,
} from 'src/mkt-core/mkt-promotion/types';
import { CreatePromotionUsageData } from 'src/mkt-core/mkt-promotion/repositories';
import { PROMOTION_TYPE } from 'src/mkt-core/mkt-promotion/constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';

const ORDER_PROMOTION_LOG_CONTEXT = 'OrderPromotionIntegration';

/**
 * Order discount context - input for promotion calculation
 */
export type OrderDiscountContext = {
  workspaceId: string;
  customerId: string;
  orderItems: OrderItemForPromotion[];
  orderSubtotal: number;
  couponCode?: string;
  customerTags?: string[];
  isFirstOrder?: boolean;
};

/**
 * Promotion calculation result for order
 */
export type OrderPromotionResult = {
  success: boolean;
  totalDiscount: number;
  finalOrderAmount: number;
  promotions: PromotionSnapshot[];
  errors?: string[];
};

/**
 * Promotion usage record input
 */
export type PromotionUsageInput = {
  promotionId: string;
  orderId: string;
  customerId: string;
  discountAmount: number;
  originalAmount: number;
  couponId?: string;
};

/**
 * OrderPromotionIntegrationService
 *
 * Integration service that bridges Order module with Promotion module.
 * Provides unified API for:
 * - Calculating discounts for orders
 * - Building evaluation context
 * - Recording promotion usage
 * - Rollback promotion usage on order cancellation
 *
 * Architecture:
 * - Wraps PromotionApplicationService for discount calculation
 * - Uses PromotionUsageApplicationService for usage tracking
 * - Uses CouponApplicationService for coupon validation
 */
@Injectable()
export class OrderPromotionIntegrationService {
  private readonly logger = new Logger(ORDER_PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionService: PromotionApplicationService,
    private readonly usageService: PromotionUsageApplicationService,
    private readonly couponService: CouponApplicationService,
  ) {}

  /**
   * Calculate discount for order
   *
   * @param context - Order discount context
   * @returns Calculation result with total discount and applied promotions
   */
  async calculateDiscount(
    context: OrderDiscountContext,
  ): Promise<OrderPromotionResult> {
    this.logger.debug('Calculating discount for order', {
      workspaceId: context.workspaceId,
      customerId: context.customerId,
      orderSubtotal: context.orderSubtotal,
      hasCoupon: !!context.couponCode,
    });

    try {
      const evaluationContext = this.buildEvaluationContext(context);

      const result = await this.promotionService.calculateDiscount(
        context.workspaceId,
        evaluationContext,
      );

      // Convert to snapshots
      const snapshots = this.createPromotionSnapshots(
        result,
        context.couponCode,
      );

      this.logger.log('Discount calculated successfully', {
        totalDiscount: result.totalDiscount,
        promotionCount: result.promotions.length,
      });

      return {
        success: true,
        totalDiscount: result.totalDiscount,
        finalOrderAmount: result.finalOrderAmount,
        promotions: snapshots,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Failed to calculate discount', {
        error: errorMessage,
      });

      return {
        success: false,
        totalDiscount: 0,
        finalOrderAmount: context.orderSubtotal,
        promotions: [],
        errors: [errorMessage],
      };
    }
  }

  /**
   * Build evaluation context for promotion calculation
   *
   * @param context - Order discount context
   * @returns Promotion evaluation context
   */
  buildEvaluationContext(
    context: OrderDiscountContext,
  ): PromotionEvaluationContext {
    return {
      workspaceId: context.workspaceId,
      customerId: context.customerId,
      orderItems: context.orderItems,
      orderSubtotal: context.orderSubtotal,
      couponCode: context.couponCode,
      customerTags: context.customerTags,
      isFirstOrder: context.isFirstOrder,
    };
  }

  /**
   * Record promotion usage after order confirmation
   *
   * @param workspaceId - Workspace ID
   * @param usageInputs - Usage records to create
   * @returns Success status
   */
  async recordUsage(
    workspaceId: string,
    usageInputs: PromotionUsageInput[],
  ): Promise<{
    success: boolean;
    recordedCount: number;
    errors: string[];
  }> {
    this.logger.debug('Recording promotion usage', {
      workspaceId,
      count: usageInputs.length,
    });

    const errors: string[] = [];
    let recordedCount = 0;

    for (const input of usageInputs) {
      try {
        const usageData: CreatePromotionUsageData = {
          promotionId: input.promotionId,
          orderId: input.orderId,
          customerId: input.customerId,
          discountAmount: input.discountAmount,
          originalAmount: input.originalAmount,
          couponId: input.couponId,
          appliedAt: DateTimeUtils.toDateRequired(DateTimeUtils.now()),
        };

        await this.usageService.recordUsage(workspaceId, usageData);
        recordedCount++;

        this.logger.debug('Usage recorded', {
          promotionId: input.promotionId,
          orderId: input.orderId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        errors.push(
          `Failed to record usage for promotion ${input.promotionId}: ${errorMessage}`,
        );

        this.logger.warn('Failed to record promotion usage', {
          promotionId: input.promotionId,
          error: errorMessage,
        });
      }
    }

    return {
      success: errors.length === 0,
      recordedCount,
      errors,
    };
  }

  /**
   * Rollback promotion usage on order cancellation/refund
   *
   * Note: This is a placeholder for future implementation.
   * Currently, usage rollback is not supported by the promotion module.
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID to rollback usage for
   */
  async rollbackUsage(
    workspaceId: string,
    orderId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.debug('Rolling back promotion usage', {
      workspaceId,
      orderId,
    });

    // TODO: Implement usage rollback when promotion module supports it
    // For now, we just log and return success

    this.logger.warn(
      'Promotion usage rollback not implemented - manual adjustment may be required',
      { orderId },
    );

    return {
      success: true,
      message: 'Usage rollback not implemented - manual adjustment required',
    };
  }

  /**
   * Validate and get coupon details
   *
   * @param workspaceId - Workspace ID
   * @param couponCode - Coupon code to validate
   * @param customerId - Customer ID for usage validation
   * @returns Validation result
   */
  async validateCoupon(
    workspaceId: string,
    couponCode: string,
    customerId: string,
  ): Promise<{
    valid: boolean;
    promotionId?: string;
    couponId?: string;
    error?: string;
  }> {
    try {
      // Use applyCoupon which validates and returns promotion + coupon
      const result = await this.couponService.applyCoupon(
        workspaceId,
        couponCode,
        customerId,
      );

      return {
        valid: true,
        promotionId: result.promotion.id,
        couponId: result.coupon.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create promotion snapshots from calculation result
   */
  private createPromotionSnapshots(
    result: AppliedPromotionsResult,
    couponCode?: string,
  ): PromotionSnapshot[] {
    return result.promotions.map((applied) => {
      const snapshot: PromotionSnapshot = {
        promotionId: applied.promotionId,
        promotionCode: applied.promotionCode,
        promotionName: applied.promotionName,
        promotionType:
          applied.discountType as (typeof PROMOTION_TYPE)[keyof typeof PROMOTION_TYPE],
        discountValue: applied.discountValue,
        couponCode: applied.couponCode ?? couponCode ?? null,
        discountAmount: applied.discountAmount,
        appliedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        checksum: '',
      };

      snapshot.checksum = this.generateChecksum(snapshot);

      return snapshot;
    });
  }

  /**
   * Generate checksum for promotion snapshot
   */
  private generateChecksum(
    snapshot: Omit<PromotionSnapshot, 'checksum'> & { checksum: string },
  ): string {
    const dataToHash =
      safeJsonStringify({
        promotionId: snapshot.promotionId,
        discountAmount: snapshot.discountAmount,
        appliedAt: snapshot.appliedAt,
      }) ?? '';

    return createHash('sha256')
      .update(dataToHash)
      .digest('hex')
      .substring(0, 16);
  }
}
