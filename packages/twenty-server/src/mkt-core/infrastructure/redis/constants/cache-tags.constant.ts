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
} as const;
