import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// PROMOTION MESSAGES
// ============================================

export const PROMOTION_MESSAGES = createModuleMessages({
  entityName: 'Promotion',
  entityNamePlural: 'Promotions',
  customSuccess: {
    PROMOTION_CREATED: 'Promotion created successfully',
    PROMOTION_UPDATED: 'Promotion updated successfully',
    PROMOTION_ACTIVATED: 'Promotion activated successfully',
    PROMOTION_PAUSED: 'Promotion paused successfully',
    PROMOTION_CANCELLED: 'Promotion cancelled successfully',
    PROMOTION_EXPIRED: 'Promotion expired successfully',
    RULE_ADDED: 'Promotion rule added successfully',
    RULE_UPDATED: 'Promotion rule updated successfully',
    RULE_REMOVED: 'Promotion rule removed successfully',
  },
  customError: {
    PROMOTION_NOT_FOUND: 'Promotion not found',
    PROMOTION_NOT_ACTIVE: 'Promotion is not active',
    PROMOTION_INACTIVE: 'Promotion is inactive',
    PROMOTION_EXPIRED: 'Promotion has expired',
    PROMOTION_NOT_STARTED: 'Promotion has not started yet',
    PROMOTION_USAGE_LIMIT: 'Promotion usage limit reached',
    PROMOTION_CODE_DUPLICATE: 'Promotion code already exists',
    CUSTOMER_USAGE_LIMIT: 'Customer usage limit reached for this promotion',
    MIN_ORDER_AMOUNT: 'Minimum order amount not met',
    RULES_NOT_MET: 'Promotion conditions not satisfied',
    INVALID_DISCOUNT_VALUE: 'Invalid discount value',
    INVALID_DATE_RANGE: 'End date must be after start date',
    RULE_NOT_FOUND: 'Promotion rule not found',
    MAX_RULES_EXCEEDED: 'Maximum rules per promotion exceeded',
    CALCULATION_ERROR: 'Promotion calculation failed',
  },
  customOperation: {
    CREATE_PROMOTION: 'Creating promotion',
    UPDATE_PROMOTION: 'Updating promotion',
    ACTIVATE_PROMOTION: 'Activating promotion',
    PAUSE_PROMOTION: 'Pausing promotion',
    CANCEL_PROMOTION: 'Cancelling promotion',
    EXPIRE_PROMOTION: 'Expiring promotion',
    CALCULATE_DISCOUNT: 'Calculating discount',
    APPLY_TO_ORDER: 'Applying promotion to order',
    REMOVE_FROM_ORDER: 'Removing promotion from order',
    ADD_RULE: 'Adding promotion rule',
    UPDATE_RULE: 'Updating promotion rule',
    REMOVE_RULE: 'Removing promotion rule',
    EVALUATE_RULES: 'Evaluating promotion rules',
    CHECK_EXPIRATION: 'Checking promotion expiration',
  },
});

// ============================================
// COUPON MESSAGES
// ============================================

export const COUPON_MESSAGES = createModuleMessages({
  entityName: 'Coupon',
  entityNamePlural: 'Coupons',
  customSuccess: {
    COUPON_CREATED: 'Coupon created successfully',
    COUPON_APPLIED: 'Coupon applied successfully',
    BULK_COUPONS_CREATED: 'Bulk coupons created successfully',
    COUPON_REDEEMED: 'Coupon redeemed successfully',
    COUPON_DISABLED: 'Coupon disabled successfully',
  },
  customError: {
    COUPON_NOT_FOUND: 'Coupon code not found',
    COUPON_EXPIRED: 'Coupon has expired',
    COUPON_INVALID: 'Coupon is not valid',
    COUPON_NOT_ACTIVE: 'Coupon is not active',
    COUPON_NOT_STARTED: 'Coupon is not yet valid',
    COUPON_NOT_FOR_CUSTOMER: 'This coupon is not valid for your account',
    COUPON_USAGE_LIMIT: 'Coupon usage limit reached',
    COUPON_CODE_DUPLICATE: 'Coupon code already exists',
    COUPON_VALIDATION_FAILED: 'Coupon validation failed',
  },
  customOperation: {
    CREATE_COUPON: 'Creating coupon',
    CREATE_BULK_COUPONS: 'Creating bulk coupons',
    APPLY_COUPON: 'Applying coupon',
    VALIDATE_COUPON: 'Validating coupon',
    REDEEM_COUPON: 'Redeeming coupon',
    DISABLE_COUPON: 'Disabling coupon',
  },
});

// ============================================
// PROMOTION USAGE MESSAGES
// ============================================

export const PROMOTION_USAGE_MESSAGES = createModuleMessages({
  entityName: 'Promotion usage',
  entityNamePlural: 'Promotion usages',
  customSuccess: {
    USAGE_RECORDED: 'Promotion usage recorded successfully',
    USAGE_UPDATED: 'Promotion usage updated successfully',
  },
  customError: {
    USAGE_NOT_FOUND: 'Promotion usage not found',
    USAGE_ALREADY_EXISTS: 'Promotion usage already exists for this order',
  },
  customOperation: {
    RECORD_USAGE: 'Recording promotion usage',
    GET_CUSTOMER_USAGE: 'Getting customer promotion usage',
    GET_PROMOTION_USAGE: 'Getting promotion usage statistics',
  },
});

// ============================================
// CACHE MESSAGES
// ============================================

export const PROMOTION_CACHE_MESSAGES = createModuleMessages({
  entityName: 'Promotion cache',
  customSuccess: {
    CACHE_HIT: 'Promotion cache hit',
    CACHE_SET: 'Promotion cached successfully',
    CACHE_INVALIDATED: 'Promotion cache invalidated successfully',
  },
  customError: {
    CACHE_OPERATION_FAILED: 'Promotion cache operation failed',
  },
  customInfo: {
    CACHE_MISS: 'Promotion cache miss',
  },
});

// ============================================
// GRAPHQL DESCRIPTIONS
// ============================================

export const PROMOTION_GRAPHQL_DESCRIPTIONS = {
  // Queries
  PROMOTION_QUERY: 'Get promotion by ID',
  PROMOTION_BY_CODE_QUERY: 'Get promotion by code',
  ACTIVE_PROMOTIONS_QUERY: 'Get list of active promotions',
  PROMOTION_LIST_QUERY: 'Get paginated list of promotions',
  CALCULATE_DISCOUNT_QUERY: 'Calculate discount for order',

  // Mutations
  CREATE_PROMOTION_MUTATION: 'Create new promotion',
  UPDATE_PROMOTION_MUTATION: 'Update promotion',
  ACTIVATE_PROMOTION_MUTATION: 'Activate promotion',
  PAUSE_PROMOTION_MUTATION: 'Pause promotion',
  CANCEL_PROMOTION_MUTATION: 'Cancel promotion',
  APPLY_PROMOTION_TO_ORDER_MUTATION: 'Apply promotion to order',
  REMOVE_PROMOTION_FROM_ORDER_MUTATION: 'Remove promotion from order',

  // Rule mutations
  ADD_RULE_MUTATION: 'Add rule to promotion',
  UPDATE_RULE_MUTATION: 'Update promotion rule',
  REMOVE_RULE_MUTATION: 'Remove promotion rule',

  // Coupon mutations
  CREATE_COUPON_MUTATION: 'Create coupon',
  CREATE_BULK_COUPONS_MUTATION: 'Create multiple coupons',
  APPLY_COUPON_MUTATION: 'Apply coupon to order',
  DISABLE_COUPON_MUTATION: 'Disable coupon',
} as const;
