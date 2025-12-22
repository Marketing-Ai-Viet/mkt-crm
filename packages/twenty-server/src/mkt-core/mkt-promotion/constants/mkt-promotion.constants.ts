/**
 * Constants for Promotion module
 */

import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

// ============================================
// PROMOTION STATUS
// ============================================

export const PROMOTION_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export type PromotionStatus =
  (typeof PROMOTION_STATUS)[keyof typeof PROMOTION_STATUS];

export const PROMOTION_STATUS_OPTIONS = [
  {
    value: PROMOTION_STATUS.DRAFT,
    label: 'Draft',
    color: 'gray' as TagColor,
    position: 0,
  },
  {
    value: PROMOTION_STATUS.ACTIVE,
    label: 'Active',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: PROMOTION_STATUS.PAUSED,
    label: 'Paused',
    color: 'yellow' as TagColor,
    position: 2,
  },
  {
    value: PROMOTION_STATUS.EXPIRED,
    label: 'Expired',
    color: 'red' as TagColor,
    position: 3,
  },
  {
    value: PROMOTION_STATUS.CANCELLED,
    label: 'Cancelled',
    color: 'red' as TagColor,
    position: 4,
  },
];

// ============================================
// PROMOTION TYPE
// ============================================

export const PROMOTION_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  BUY_X_GET_Y: 'BUY_X_GET_Y',
  FREE_SHIPPING: 'FREE_SHIPPING',
} as const;

export type PromotionType =
  (typeof PROMOTION_TYPE)[keyof typeof PROMOTION_TYPE];

export const PROMOTION_TYPE_OPTIONS = [
  {
    value: PROMOTION_TYPE.PERCENTAGE,
    label: 'Percentage Discount',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: PROMOTION_TYPE.FIXED_AMOUNT,
    label: 'Fixed Amount Discount',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: PROMOTION_TYPE.BUY_X_GET_Y,
    label: 'Buy X Get Y',
    color: 'purple' as TagColor,
    position: 2,
  },
  {
    value: PROMOTION_TYPE.FREE_SHIPPING,
    label: 'Free Shipping',
    color: 'orange' as TagColor,
    position: 3,
  },
];

// ============================================
// RULE TYPE
// ============================================

export const PROMOTION_RULE_TYPE = {
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  VARIANT: 'VARIANT',
  ORDER_VALUE: 'ORDER_VALUE',
  CUSTOMER_TAG: 'CUSTOMER_TAG',
  CUSTOMER_SEGMENT: 'CUSTOMER_SEGMENT',
  FIRST_ORDER: 'FIRST_ORDER',
  QUANTITY: 'QUANTITY',
} as const;

export type PromotionRuleType =
  (typeof PROMOTION_RULE_TYPE)[keyof typeof PROMOTION_RULE_TYPE];

export const PROMOTION_RULE_TYPE_OPTIONS = [
  {
    value: PROMOTION_RULE_TYPE.PRODUCT,
    label: 'Product',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: PROMOTION_RULE_TYPE.CATEGORY,
    label: 'Category',
    color: 'green' as TagColor,
    position: 1,
  },
  {
    value: PROMOTION_RULE_TYPE.VARIANT,
    label: 'Variant',
    color: 'purple' as TagColor,
    position: 2,
  },
  {
    value: PROMOTION_RULE_TYPE.ORDER_VALUE,
    label: 'Order Value',
    color: 'orange' as TagColor,
    position: 3,
  },
  {
    value: PROMOTION_RULE_TYPE.CUSTOMER_TAG,
    label: 'Customer Tag',
    color: 'yellow' as TagColor,
    position: 4,
  },
  {
    value: PROMOTION_RULE_TYPE.CUSTOMER_SEGMENT,
    label: 'Customer Segment',
    color: 'turquoise' as TagColor,
    position: 5,
  },
  {
    value: PROMOTION_RULE_TYPE.FIRST_ORDER,
    label: 'First Order',
    color: 'pink' as TagColor,
    position: 6,
  },
  {
    value: PROMOTION_RULE_TYPE.QUANTITY,
    label: 'Product Quantity',
    color: 'gray' as TagColor,
    position: 7,
  },
];

// ============================================
// RULE OPERATOR
// ============================================

export const RULE_OPERATOR = {
  IN: 'IN',
  NOT_IN: 'NOT_IN',
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  GREATER_THAN: 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL',
  LESS_THAN: 'LESS_THAN',
  LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL',
  BETWEEN: 'BETWEEN',
} as const;

export type RuleOperator = (typeof RULE_OPERATOR)[keyof typeof RULE_OPERATOR];

// ============================================
// LOGIC OPERATOR
// ============================================

export const LOGIC_OPERATOR = {
  AND: 'AND',
  OR: 'OR',
} as const;

export type LogicOperator =
  (typeof LOGIC_OPERATOR)[keyof typeof LOGIC_OPERATOR];

// ============================================
// COUPON STATUS
// ============================================

export const COUPON_STATUS = {
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  DISABLED: 'DISABLED',
} as const;

export type CouponStatus = (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];

export const COUPON_STATUS_OPTIONS = [
  {
    value: COUPON_STATUS.ACTIVE,
    label: 'Active',
    color: 'green' as TagColor,
    position: 0,
  },
  {
    value: COUPON_STATUS.USED,
    label: 'Used',
    color: 'gray' as TagColor,
    position: 1,
  },
  {
    value: COUPON_STATUS.EXPIRED,
    label: 'Expired',
    color: 'red' as TagColor,
    position: 2,
  },
  {
    value: COUPON_STATUS.DISABLED,
    label: 'Disabled',
    color: 'red' as TagColor,
    position: 3,
  },
];

// ============================================
// AUDIT ACTION
// ============================================

export const PROMOTION_AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  ACTIVATE: 'ACTIVATE',
  PAUSE: 'PAUSE',
  CANCEL: 'CANCEL',
  EXPIRE: 'EXPIRE',
} as const;

export type PromotionAuditAction =
  (typeof PROMOTION_AUDIT_ACTION)[keyof typeof PROMOTION_AUDIT_ACTION];

export const PROMOTION_AUDIT_ACTION_OPTIONS = [
  {
    value: PROMOTION_AUDIT_ACTION.CREATE,
    label: 'Created',
    color: 'blue' as TagColor,
    position: 0,
  },
  {
    value: PROMOTION_AUDIT_ACTION.UPDATE,
    label: 'Updated',
    color: 'yellow' as TagColor,
    position: 1,
  },
  {
    value: PROMOTION_AUDIT_ACTION.ACTIVATE,
    label: 'Activated',
    color: 'green' as TagColor,
    position: 2,
  },
  {
    value: PROMOTION_AUDIT_ACTION.PAUSE,
    label: 'Paused',
    color: 'orange' as TagColor,
    position: 3,
  },
  {
    value: PROMOTION_AUDIT_ACTION.CANCEL,
    label: 'Cancelled',
    color: 'red' as TagColor,
    position: 4,
  },
  {
    value: PROMOTION_AUDIT_ACTION.EXPIRE,
    label: 'Expired',
    color: 'gray' as TagColor,
    position: 5,
  },
];

// ============================================
// DEFAULT VALUES
// ============================================

export const PROMOTION_DEFAULTS = {
  PRIORITY: 0,
  STACKABLE: false,
  IS_AUTO_APPLY: false,
  CURRENT_USAGE_COUNT: 0,
  CURRENCY: 'VND',
} as const;
