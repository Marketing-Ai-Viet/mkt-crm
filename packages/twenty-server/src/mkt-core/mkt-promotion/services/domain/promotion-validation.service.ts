import { Injectable, Logger } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  PromotionValidationError,
  CreatePromotionData,
  PromotionEvaluationContext,
} from 'src/mkt-core/mkt-promotion/types';
import {
  PROMOTION_LOG_CONTEXT,
  PROMOTION_STATUS,
  PROMOTION_TYPE,
  COUPON_STATUS,
} from 'src/mkt-core/mkt-promotion/constants';
import {
  MktCouponWorkspaceEntity,
  MktPromotionWorkspaceEntity,
} from 'src/mkt-core/mkt-promotion/workspace-entities';

/**
 * Service validation cho promotions và coupons
 */
@Injectable()
export class PromotionValidationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  /**
   * Validate promotion có thể áp dụng cho context không
   */
  async validatePromotion(
    promotion: MktPromotionWorkspaceEntity,
    context: PromotionEvaluationContext,
    customerUsageCount?: number,
  ): Promise<{ isValid: boolean; errors: PromotionValidationError[] }> {
    const errors: PromotionValidationError[] = [];

    // Check status
    if (promotion.status !== PROMOTION_STATUS.ACTIVE) {
      errors.push({
        code: 'PROMOTION_NOT_ACTIVE',
        message: 'Promotion is not active',
      });
    }

    // Check date range
    const now = DateTimeUtils.now();

    if (promotion.startDate) {
      const startDate = DateTimeUtils.fromDate(promotion.startDate);

      if (startDate.isValid && now < startDate) {
        errors.push({
          code: 'PROMOTION_NOT_STARTED',
          message: 'Promotion has not started yet',
        });
      }
    }

    if (promotion.endDate) {
      const endDate = DateTimeUtils.fromDate(promotion.endDate);

      if (endDate.isValid && now > endDate) {
        errors.push({
          code: 'PROMOTION_EXPIRED',
          message: 'Promotion has expired',
        });
      }
    }

    // Check usage limit
    if (
      promotion.usageLimit !== null &&
      promotion.currentUsageCount >= promotion.usageLimit
    ) {
      errors.push({
        code: 'PROMOTION_USAGE_LIMIT_REACHED',
        message: 'Promotion usage limit has been reached',
      });
    }

    // Check per-customer usage limit
    if (
      promotion.usageLimitPerCustomer !== null &&
      customerUsageCount !== undefined &&
      customerUsageCount >= promotion.usageLimitPerCustomer
    ) {
      errors.push({
        code: 'CUSTOMER_USAGE_LIMIT_REACHED',
        message: 'You have reached the usage limit for this promotion',
      });
    }

    // Check min order amount
    if (
      promotion.minOrderAmount !== null &&
      context.orderSubtotal < promotion.minOrderAmount
    ) {
      errors.push({
        code: 'MIN_ORDER_AMOUNT_NOT_MET',
        field: 'minOrderAmount',
        message: `Minimum order amount is ${promotion.minOrderAmount}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate coupon code
   */
  async validateCoupon(
    coupon: MktCouponWorkspaceEntity,
    customerId: string,
  ): Promise<{ isValid: boolean; errors: PromotionValidationError[] }> {
    const errors: PromotionValidationError[] = [];

    // Check status
    if (coupon.status !== COUPON_STATUS.ACTIVE) {
      errors.push({
        code: 'COUPON_NOT_ACTIVE',
        message: 'Coupon is no longer valid',
      });
    }

    // Check validity period
    const now = DateTimeUtils.now();

    if (coupon.validFrom) {
      const validFrom = DateTimeUtils.fromDate(coupon.validFrom);

      if (validFrom.isValid && now < validFrom) {
        errors.push({
          code: 'COUPON_NOT_STARTED',
          message: 'Coupon is not yet valid',
        });
      }
    }

    if (coupon.validTo) {
      const validTo = DateTimeUtils.fromDate(coupon.validTo);

      if (validTo.isValid && now > validTo) {
        errors.push({
          code: 'COUPON_EXPIRED',
          message: 'Coupon has expired',
        });
      }
    }

    // Check assigned customer
    if (
      coupon.assignedCustomerId !== null &&
      coupon.assignedCustomerId !== customerId
    ) {
      errors.push({
        code: 'COUPON_NOT_FOR_CUSTOMER',
        message: 'This coupon is not valid for your account',
      });
    }

    // Check usage limit
    if (
      coupon.usageLimit !== null &&
      coupon.currentUsageCount >= coupon.usageLimit
    ) {
      errors.push({
        code: 'COUPON_USAGE_LIMIT_REACHED',
        message: 'Coupon usage limit has been reached',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate dữ liệu tạo promotion
   */
  validateCreateData(data: CreatePromotionData): {
    isValid: boolean;
    errors: PromotionValidationError[];
  } {
    const errors: PromotionValidationError[] = [];

    // Required fields
    if (!data.name?.trim()) {
      errors.push({
        code: 'NAME_REQUIRED',
        field: 'name',
        message: 'Promotion name is required',
      });
    }

    if (!data.code?.trim()) {
      errors.push({
        code: 'CODE_REQUIRED',
        field: 'code',
        message: 'Promotion code is required',
      });
    }

    // Discount value validation
    if (data.discountValue <= 0) {
      errors.push({
        code: 'INVALID_DISCOUNT_VALUE',
        field: 'discountValue',
        message: 'Discount value must be greater than 0',
      });
    }

    if (
      data.promotionType === PROMOTION_TYPE.PERCENTAGE &&
      data.discountValue > 100
    ) {
      errors.push({
        code: 'INVALID_PERCENTAGE',
        field: 'discountValue',
        message: 'Percentage discount cannot exceed 100%',
      });
    }

    // Date validation
    if (data.endDate && data.startDate) {
      const startDate = DateTimeUtils.fromDate(data.startDate);
      const endDate = DateTimeUtils.fromDate(data.endDate);

      if (startDate.isValid && endDate.isValid && startDate > endDate) {
        errors.push({
          code: 'INVALID_DATE_RANGE',
          field: 'endDate',
          message: 'End date must be after start date',
        });
      }
    }

    // Validate max discount amount for percentage type
    if (
      data.promotionType === PROMOTION_TYPE.PERCENTAGE &&
      data.maxDiscountAmount !== null &&
      data.maxDiscountAmount !== undefined &&
      data.maxDiscountAmount <= 0
    ) {
      errors.push({
        code: 'INVALID_MAX_DISCOUNT',
        field: 'maxDiscountAmount',
        message: 'Max discount amount must be greater than 0',
      });
    }

    // Validate min order amount
    if (
      data.minOrderAmount !== null &&
      data.minOrderAmount !== undefined &&
      data.minOrderAmount < 0
    ) {
      errors.push({
        code: 'INVALID_MIN_ORDER',
        field: 'minOrderAmount',
        message: 'Min order amount cannot be negative',
      });
    }

    // Validate usage limits
    if (
      data.usageLimit !== null &&
      data.usageLimit !== undefined &&
      data.usageLimit < 1
    ) {
      errors.push({
        code: 'INVALID_USAGE_LIMIT',
        field: 'usageLimit',
        message: 'Usage limit must be at least 1',
      });
    }

    if (
      data.usageLimitPerCustomer !== null &&
      data.usageLimitPerCustomer !== undefined &&
      data.usageLimitPerCustomer < 1
    ) {
      errors.push({
        code: 'INVALID_CUSTOMER_LIMIT',
        field: 'usageLimitPerCustomer',
        message: 'Usage limit per customer must be at least 1',
      });
    }

    // Validate BUY_X_GET_Y specific config
    if (data.promotionType === PROMOTION_TYPE.BUY_X_GET_Y) {
      const metadataErrors = this.validateBuyXGetYMetadata(data.metadata);

      errors.push(...metadataErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate metadata cho BUY_X_GET_Y promotion
   */
  private validateBuyXGetYMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): PromotionValidationError[] {
    const errors: PromotionValidationError[] = [];

    if (!metadata) {
      errors.push({
        code: 'BUY_X_GET_Y_CONFIG_REQUIRED',
        field: 'metadata',
        message: 'BUY_X_GET_Y promotion requires metadata configuration',
      });

      return errors;
    }

    const config = metadata as {
      buyQuantity?: unknown;
      getQuantity?: unknown;
      buyProductIds?: unknown;
      getProductIds?: unknown;
      discountPercent?: unknown;
      maxApplications?: unknown;
    };

    // Validate buyQuantity
    if (typeof config.buyQuantity !== 'number' || config.buyQuantity < 1) {
      errors.push({
        code: 'INVALID_BUY_QUANTITY',
        field: 'metadata.buyQuantity',
        message: 'Buy quantity must be at least 1',
      });
    }

    // Validate getQuantity
    if (typeof config.getQuantity !== 'number' || config.getQuantity < 1) {
      errors.push({
        code: 'INVALID_GET_QUANTITY',
        field: 'metadata.getQuantity',
        message: 'Get quantity must be at least 1',
      });
    }

    // Validate buyProductIds
    if (
      !Array.isArray(config.buyProductIds) ||
      config.buyProductIds.length === 0
    ) {
      errors.push({
        code: 'INVALID_BUY_PRODUCTS',
        field: 'metadata.buyProductIds',
        message: 'At least one buy product ID is required',
      });
    }

    // Validate getProductIds
    if (
      !Array.isArray(config.getProductIds) ||
      config.getProductIds.length === 0
    ) {
      errors.push({
        code: 'INVALID_GET_PRODUCTS',
        field: 'metadata.getProductIds',
        message: 'At least one get product ID is required',
      });
    }

    // Validate discountPercent (optional, default 100)
    if (
      config.discountPercent !== undefined &&
      config.discountPercent !== null &&
      (typeof config.discountPercent !== 'number' ||
        config.discountPercent <= 0 ||
        config.discountPercent > 100)
    ) {
      errors.push({
        code: 'INVALID_DISCOUNT_PERCENT',
        field: 'metadata.discountPercent',
        message: 'Discount percent must be between 0 and 100',
      });
    }

    // Validate maxApplications (optional)
    if (
      config.maxApplications !== undefined &&
      config.maxApplications !== null &&
      (typeof config.maxApplications !== 'number' || config.maxApplications < 1)
    ) {
      errors.push({
        code: 'INVALID_MAX_APPLICATIONS',
        field: 'metadata.maxApplications',
        message: 'Max applications must be at least 1',
      });
    }

    return errors;
  }
}
