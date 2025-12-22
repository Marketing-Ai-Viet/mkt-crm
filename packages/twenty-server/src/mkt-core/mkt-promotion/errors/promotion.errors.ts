/**
 * Error classes for Promotion module
 */

export class PromotionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PromotionError';
  }
}

export class PromotionNotFoundError extends PromotionError {
  constructor(promotionId: string) {
    super(`Promotion not found: ${promotionId}`, 'PROMOTION_NOT_FOUND', {
      promotionId,
    });
  }
}

export class PromotionNotActiveError extends PromotionError {
  constructor(promotionId: string, currentStatus: string) {
    super(`Promotion is not active: ${promotionId}`, 'PROMOTION_NOT_ACTIVE', {
      promotionId,
      currentStatus,
    });
  }
}

export class PromotionExpiredError extends PromotionError {
  constructor(promotionId: string, endDate: Date) {
    super(`Promotion has expired: ${promotionId}`, 'PROMOTION_EXPIRED', {
      promotionId,
      endDate,
    });
  }
}

export class PromotionUsageLimitError extends PromotionError {
  constructor(promotionId: string, limit: number) {
    super(
      `Promotion usage limit reached: ${promotionId}`,
      'PROMOTION_USAGE_LIMIT_REACHED',
      { promotionId, limit },
    );
  }
}

export class CouponNotFoundError extends PromotionError {
  constructor(couponCode: string) {
    super(`Coupon code not found: ${couponCode}`, 'COUPON_NOT_FOUND', {
      couponCode,
    });
  }
}

export class CouponExpiredError extends PromotionError {
  constructor(couponCode: string) {
    super(`Coupon has expired: ${couponCode}`, 'COUPON_EXPIRED', {
      couponCode,
    });
  }
}

export class CouponCodeDuplicateError extends PromotionError {
  constructor(code: string) {
    super(`Coupon code already exists: ${code}`, 'COUPON_CODE_DUPLICATE', {
      code,
    });
  }
}

export class CouponValidationException extends PromotionError {
  constructor(
    public readonly errors: Array<{
      code: string;
      field?: string;
      message: string;
    }>,
  ) {
    super('Coupon validation failed', 'COUPON_VALIDATION_FAILED', { errors });
  }
}

export class MinOrderAmountError extends PromotionError {
  constructor(required: number, actual: number) {
    super(`Minimum order amount is ${required}`, 'MIN_ORDER_AMOUNT_NOT_MET', {
      required,
      actual,
    });
  }
}

export class RulesNotMetError extends PromotionError {
  constructor(
    promotionId: string,
    failedRules: Array<{
      ruleId: string;
      ruleName: string;
      passed: boolean;
      reason?: string;
    }>,
  ) {
    super('Promotion rules not satisfied', 'RULES_NOT_MET', {
      promotionId,
      failedRules,
    });
  }
}

export class PromotionCodeDuplicateError extends PromotionError {
  constructor(code: string) {
    super(
      `Promotion code already exists: ${code}`,
      'PROMOTION_CODE_DUPLICATE',
      { code },
    );
  }
}

export class PromotionValidationException extends PromotionError {
  constructor(
    message: string,
    public readonly errors: Array<{
      field: string;
      message: string;
      code: string;
    }>,
  ) {
    super(message, 'PROMOTION_VALIDATION_FAILED', { errors });
    this.name = 'PromotionValidationException';
  }
}

export class PromotionInactiveError extends PromotionError {
  constructor(promotionId: string) {
    super(`Promotion ${promotionId} is inactive`, 'PROMOTION_INACTIVE', {
      promotionId,
    });
    this.name = 'PromotionInactiveError';
  }
}

export class PromotionNotStartedError extends PromotionError {
  constructor(promotionId: string, startDate: Date) {
    super(
      `Promotion ${promotionId} has not started yet`,
      'PROMOTION_NOT_STARTED',
      { promotionId, startDate },
    );
    this.name = 'PromotionNotStartedError';
  }
}

export class CustomerUsageLimitError extends PromotionError {
  constructor(promotionId: string, customerId: string, limit: number) {
    super(
      `Customer usage limit reached for promotion ${promotionId}`,
      'CUSTOMER_USAGE_LIMIT_REACHED',
      { promotionId, customerId, limit },
    );
    this.name = 'CustomerUsageLimitError';
  }
}

export class CouponNotActiveError extends PromotionError {
  constructor(couponCode: string, currentStatus: string) {
    super(`Coupon is not active: ${couponCode}`, 'COUPON_NOT_ACTIVE', {
      couponCode,
      currentStatus,
    });
    this.name = 'CouponNotActiveError';
  }
}

export class CouponNotStartedError extends PromotionError {
  constructor(couponCode: string, validFrom: Date) {
    super(`Coupon is not yet valid: ${couponCode}`, 'COUPON_NOT_STARTED', {
      couponCode,
      validFrom,
    });
    this.name = 'CouponNotStartedError';
  }
}

export class CouponNotForCustomerError extends PromotionError {
  constructor(couponCode: string, customerId: string) {
    super(
      `Coupon is not valid for customer: ${couponCode}`,
      'COUPON_NOT_FOR_CUSTOMER',
      { couponCode, customerId },
    );
    this.name = 'CouponNotForCustomerError';
  }
}

export class CouponUsageLimitError extends PromotionError {
  constructor(couponCode: string, limit: number) {
    super(
      `Coupon usage limit reached: ${couponCode}`,
      'COUPON_USAGE_LIMIT_REACHED',
      { couponCode, limit },
    );
    this.name = 'CouponUsageLimitError';
  }
}

export class PromotionCalculationError extends PromotionError {
  constructor(message: string, promotionId: string) {
    super(message, 'PROMOTION_CALCULATION_ERROR', { promotionId });
    this.name = 'PromotionCalculationError';
  }
}

export class PromotionRuleNotFoundError extends PromotionError {
  constructor(ruleId: string) {
    super(`Promotion rule not found: ${ruleId}`, 'PROMOTION_RULE_NOT_FOUND', {
      ruleId,
    });
    this.name = 'PromotionRuleNotFoundError';
  }
}

export class MaxRulesExceededError extends PromotionError {
  constructor(promotionId: string, maxRules: number) {
    super(
      `Maximum rules per promotion exceeded: ${maxRules}`,
      'MAX_RULES_EXCEEDED',
      { promotionId, maxRules },
    );
    this.name = 'MaxRulesExceededError';
  }
}

export class InvalidDiscountValueError extends PromotionError {
  constructor(value: number, promotionType: string) {
    super(
      `Invalid discount value ${value} for promotion type ${promotionType}`,
      'INVALID_DISCOUNT_VALUE',
      { value, promotionType },
    );
    this.name = 'InvalidDiscountValueError';
  }
}

export class InvalidDateRangeError extends PromotionError {
  constructor(startDate: Date, endDate: Date) {
    super('End date must be after start date', 'INVALID_DATE_RANGE', {
      startDate,
      endDate,
    });
    this.name = 'InvalidDateRangeError';
  }
}
