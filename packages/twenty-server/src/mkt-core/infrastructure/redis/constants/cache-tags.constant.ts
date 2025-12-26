/**
 * Centralized Cache Tags for Invalidation
 *
 * Tags enable smart cache invalidation strategies:
 * - Invalidate all caches related to an entity when it changes
 * - Invalidate by category (e.g., all active licenses)
 * - Dependency-based invalidation
 *
 * Usage:
 * 1. Tag a cache key when setting: tagKey(cacheKey, [tags])
 * 2. Invalidate by tag when data changes: invalidateByTag(tag)
 */

// ============================================
// LICENSE TAGS
// ============================================

export const LICENSE_CACHE_TAGS = {
  /** All license caches */
  ALL: 'license',

  /** Active licenses */
  ACTIVE: 'license:active',

  /** Expired licenses */
  EXPIRED: 'license:expired',

  /** Trial licenses */
  TRIAL: 'license:trial',

  /** Prefix for specific license: license:id:{licenseId} */
  ID_PREFIX: 'license:id',

  /** Prefix for user's licenses: license:user:{userId} */
  USER_PREFIX: 'license:user',

  /** Prefix for product's licenses: license:product:{productId} */
  PRODUCT_PREFIX: 'license:product',
} as const;

// ============================================
// ORDER TAGS
// ============================================

export const ORDER_CACHE_TAGS = {
  /** All order caches */
  ALL: 'order',

  /** Pending orders */
  PENDING: 'order:pending',

  /** Confirmed orders */
  CONFIRMED: 'order:confirmed',

  /** Completed orders */
  COMPLETED: 'order:completed',

  /** Prefix for specific order: order:id:{orderId} */
  ID_PREFIX: 'order:id',

  /** Prefix for customer's orders: order:customer:{customerId} */
  CUSTOMER_PREFIX: 'order:customer',
} as const;

// ============================================
// INVOICE TAGS
// ============================================

export const INVOICE_CACHE_TAGS = {
  /** All invoice caches */
  ALL: 'invoice',

  /** Draft invoices */
  DRAFT: 'invoice:draft',

  /** Issued invoices */
  ISSUED: 'invoice:issued',

  /** Prefix for specific invoice: invoice:id:{invoiceId} */
  ID_PREFIX: 'invoice:id',

  /** Prefix for order's invoices: invoice:order:{orderId} */
  ORDER_PREFIX: 'invoice:order',
} as const;

// ============================================
// PAYMENT TAGS
// ============================================

export const PAYMENT_CACHE_TAGS = {
  /** All payment caches */
  ALL: 'payment',

  /** Pending payments */
  PENDING: 'payment:pending',

  /** Completed payments */
  COMPLETED: 'payment:completed',

  /** Failed payments */
  FAILED: 'payment:failed',

  /** Prefix for specific payment: payment:id:{paymentId} */
  ID_PREFIX: 'payment:id',

  /** Prefix for order's payments: payment:order:{orderId} */
  ORDER_PREFIX: 'payment:order',
} as const;

// ============================================
// CUSTOMER TAGS
// ============================================

export const CUSTOMER_CACHE_TAGS = {
  /** All customer caches */
  ALL: 'customer',

  /** Active customers */
  ACTIVE: 'customer:active',

  /** Prefix for specific customer: customer:id:{customerId} */
  ID_PREFIX: 'customer:id',

  /** Prefix for customer's email: customer:email:{email} */
  EMAIL_PREFIX: 'customer:email',
} as const;

// ============================================
// PRODUCT TAGS
// ============================================

export const PRODUCT_CACHE_TAGS = {
  /** All product caches */
  ALL: 'product',

  /** Active products */
  ACTIVE: 'product:active',

  /** Inactive products */
  INACTIVE: 'product:inactive',

  /** Prefix for specific product: product:id:{productId} */
  ID_PREFIX: 'product:id',

  /** Prefix for product code: product:code:{code} */
  CODE_PREFIX: 'product:code',

  /** Prefix for product packages: product:packages:{productId} */
  PACKAGES_PREFIX: 'product:packages',
} as const;

// ============================================
// DEPARTMENT TAGS
// ============================================

export const DEPARTMENT_CACHE_TAGS = {
  /** All department caches */
  ALL: 'department',

  /** Department tree structure */
  TREE: 'department:tree',

  /** Prefix for specific department: department:id:{departmentId} */
  ID_PREFIX: 'department:id',

  /** Prefix for parent's children: department:children:{parentId} */
  CHILDREN_PREFIX: 'department:children',
} as const;

// ============================================
// RESELLER TAGS
// ============================================

export const RESELLER_CACHE_TAGS = {
  /** All reseller caches */
  ALL: 'reseller',

  /** Active resellers */
  ACTIVE: 'reseller:active',

  /** Prefix for specific reseller: reseller:id:{resellerId} */
  ID_PREFIX: 'reseller:id',

  /** Prefix for tier: reseller:tier:{tier} */
  TIER_PREFIX: 'reseller:tier',
} as const;

// ============================================
// PROMOTION TAGS
// ============================================

export const PROMOTION_CACHE_TAGS = {
  /** All promotion caches */
  ALL: 'promotion',

  /** Active promotions */
  ACTIVE: 'promotion:active',

  /** Expired promotions */
  EXPIRED: 'promotion:expired',

  /** Prefix for specific promotion: promotion:id:{promotionId} */
  ID_PREFIX: 'promotion:id',

  /** Prefix for promotion code: promotion:code:{code} */
  CODE_PREFIX: 'promotion:code',

  /** Prefix for coupon: promotion:coupon:{couponId} */
  COUPON_PREFIX: 'promotion:coupon',
} as const;

// ============================================
// COMBO TAGS
// ============================================

export const COMBO_CACHE_TAGS = {
  /** All combo caches */
  ALL: 'combo',

  /** Active combos */
  ACTIVE: 'combo:active',

  /** Prefix for specific combo: combo:id:{comboId} */
  ID_PREFIX: 'combo:id',

  /** Prefix for combo code: combo:code:{code} */
  CODE_PREFIX: 'combo:code',

  /** Prefix for combo calculation: combo:calc:{comboId} */
  CALCULATION_PREFIX: 'combo:calc',
} as const;

// ============================================
// OAUTH2 TAGS
// ============================================

export const OAUTH2_CACHE_TAGS = {
  /** All OAuth2 caches */
  ALL: 'oauth2',

  /** Token caches */
  TOKEN: 'oauth2:token',

  /** Refresh token caches */
  REFRESH: 'oauth2:refresh',

  /** Prefix for client: oauth2:client:{clientId} */
  CLIENT_PREFIX: 'oauth2:client',
} as const;

// ============================================
// KPI TAGS
// ============================================

export const KPI_CACHE_TAGS = {
  /** All KPI caches */
  ALL: 'kpi',

  /** Prefix for specific KPI: kpi:id:{kpiId} */
  ID_PREFIX: 'kpi:id',

  /** Prefix for user KPIs: kpi:user:{userId} */
  USER_PREFIX: 'kpi:user',

  /** Template caches */
  TEMPLATE: 'kpi:template',
} as const;

// ============================================
// RATE LIMIT TAGS
// ============================================

export const RATE_LIMIT_CACHE_TAGS = {
  /** All rate limit caches */
  ALL: 'ratelimit',

  /** Counter caches */
  COUNTER: 'ratelimit:counter',

  /** Blocked entities */
  BLOCKED: 'ratelimit:blocked',

  /** Violation tracking */
  VIOLATIONS: 'ratelimit:violations',
} as const;

// ============================================
// EXTERNAL PRODUCT TAGS
// ============================================

export const EXTERNAL_PRODUCT_CACHE_TAGS = {
  /** All external product caches */
  ALL: 'external',

  /** Digital products */
  DIGITAL: 'external:digital',

  /** Physical products */
  PHYSICAL: 'external:physical',

  /** Service products */
  SERVICE: 'external:service',

  /** Prefix for product: external:id:{productId} */
  ID_PREFIX: 'external:id',

  /** Prefix for code: external:code:{code} */
  CODE_PREFIX: 'external:code',

  /** Prefix for packages: external:packages:{productId} */
  PACKAGES_PREFIX: 'external:packages',
} as const;

// ============================================
// COMBINED EXPORT
// ============================================

/**
 * All mkt-core cache tags
 */
export const MKT_CACHE_TAGS = {
  LICENSE: LICENSE_CACHE_TAGS,
  ORDER: ORDER_CACHE_TAGS,
  INVOICE: INVOICE_CACHE_TAGS,
  PAYMENT: PAYMENT_CACHE_TAGS,
  CUSTOMER: CUSTOMER_CACHE_TAGS,
  PRODUCT: PRODUCT_CACHE_TAGS,
  DEPARTMENT: DEPARTMENT_CACHE_TAGS,
  RESELLER: RESELLER_CACHE_TAGS,
  PROMOTION: PROMOTION_CACHE_TAGS,
  COMBO: COMBO_CACHE_TAGS,
  OAUTH2: OAUTH2_CACHE_TAGS,
  KPI: KPI_CACHE_TAGS,
  RATE_LIMIT: RATE_LIMIT_CACHE_TAGS,
  EXTERNAL_PRODUCT: EXTERNAL_PRODUCT_CACHE_TAGS,
} as const;
