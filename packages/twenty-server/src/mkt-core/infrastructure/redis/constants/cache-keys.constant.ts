/**
 * Centralized Cache Key Prefixes
 *
 * Single source of truth for all mkt-core cache keys.
 *
 * Benefits:
 * - Easy to maintain and track
 * - Avoid typos and inconsistencies
 * - Type-safe cache key generation
 * - Easy to refactor
 *
 * Naming Convention: {domain}:{entity}:{subtype}
 * Example: mkt:license:data, mkt:order:idempotency
 */

// ============================================
// LICENSE DOMAIN
// ============================================

export const LICENSE_CACHE_PREFIX = {
  /** License full data: mkt:license:data:{licenseId} */
  DATA: 'mkt:license:data',

  /** License validity status: mkt:license:validity:{licenseId} */
  VALIDITY: 'mkt:license:validity',

  /** License key mapping: mkt:license:key:{licenseKey} */
  KEY: 'mkt:license:key',

  /** User's licenses: mkt:license:user:{userId} */
  USER: 'mkt:license:user',

  /** License devices: mkt:license:devices:{licenseId} */
  DEVICES: 'mkt:license:devices',

  /** Active licenses index: mkt:license:index:active */
  INDEX_ACTIVE: 'mkt:license:index:active',
} as const;

// ============================================
// ORDER DOMAIN
// ============================================

export const ORDER_CACHE_PREFIX = {
  /** Order data: mkt:order:data:{orderId} */
  DATA: 'mkt:order:data',

  /** Idempotency record: mkt:order:idempotency:{key} */
  IDEMPOTENCY: 'mkt:order:idempotency',

  /** Idempotency lock: mkt:order:idempotency:lock:{key} */
  IDEMPOTENCY_LOCK: 'mkt:order:idempotency:lock',

  /** Order by customer: mkt:order:customer:{customerId} */
  BY_CUSTOMER: 'mkt:order:customer',

  /** Order processing queue: mkt:order:queue:{status} */
  QUEUE: 'mkt:order:queue',
} as const;

// ============================================
// INVOICE DOMAIN
// ============================================

export const INVOICE_CACHE_PREFIX = {
  /** Invoice data: mkt:invoice:data:{invoiceId} */
  DATA: 'mkt:invoice:data',

  /** Invoice by order: mkt:invoice:order:{orderId} */
  BY_ORDER: 'mkt:invoice:order',

  /** Invoice sequence: mkt:invoice:sequence:{year} */
  SEQUENCE: 'mkt:invoice:sequence',
} as const;

// ============================================
// PAYMENT DOMAIN
// ============================================

export const PAYMENT_CACHE_PREFIX = {
  /** Payment data: mkt:payment:data:{paymentId} */
  DATA: 'mkt:payment:data',

  /** Payment by order: mkt:payment:order:{orderId} */
  BY_ORDER: 'mkt:payment:order',

  /** Webhook idempotency: mkt:payment:webhook:{transactionId} */
  WEBHOOK: 'mkt:payment:webhook',

  /** QR code: mkt:payment:qr:{orderId} */
  QR_CODE: 'mkt:payment:qr',
} as const;

// ============================================
// CUSTOMER DOMAIN
// ============================================

export const CUSTOMER_CACHE_PREFIX = {
  /** Customer data: mkt:customer:data:{customerId} */
  DATA: 'mkt:customer:data',

  /** Customer by email: mkt:customer:email:{email} */
  BY_EMAIL: 'mkt:customer:email',

  /** Customer tags: mkt:customer:tags:{customerId} */
  TAGS: 'mkt:customer:tags',
} as const;

// ============================================
// PRODUCT DOMAIN
// ============================================

export const PRODUCT_CACHE_PREFIX = {
  /** Product data: mkt:product:data:{productId} */
  DATA: 'mkt:product:data',

  /** Product by code: mkt:product:code:{code} */
  BY_CODE: 'mkt:product:code',

  /** Product packages: mkt:product:packages:{productId} */
  PACKAGES: 'mkt:product:packages',

  /** Product list: mkt:product:list */
  LIST: 'mkt:product:list',

  /** Product snapshot: mkt:product:snapshot:{snapshotId} */
  SNAPSHOT: 'mkt:product:snapshot',
} as const;

// ============================================
// DEPARTMENT DOMAIN
// ============================================

export const DEPARTMENT_CACHE_PREFIX = {
  /** Department data: mkt:department:data:{departmentId} */
  DATA: 'mkt:department:data',

  /** Department tree: mkt:department:tree:{rootId} */
  TREE: 'mkt:department:tree',

  /** Department children: mkt:department:children:{parentId} */
  CHILDREN: 'mkt:department:children',
} as const;

// ============================================
// OAUTH2 DOMAIN
// ============================================

export const OAUTH2_CACHE_PREFIX = {
  /** OAuth2 token: mkt:oauth2:token:{hash} */
  TOKEN: 'mkt:oauth2:token',

  /** OAuth2 refresh token: mkt:oauth2:refresh:{hash} */
  REFRESH: 'mkt:oauth2:refresh',

  /** OAuth2 client credentials: mkt:oauth2:client:{clientId} */
  CLIENT: 'mkt:oauth2:client',
} as const;

// ============================================
// RATE LIMIT DOMAIN
// ============================================

export const RATE_LIMIT_CACHE_PREFIX = {
  /** Rate limit counter: mkt:ratelimit:counter:{key} */
  COUNTER: 'mkt:ratelimit:counter',

  /** Rate limit blocked: mkt:ratelimit:blocked:{key} */
  BLOCKED: 'mkt:ratelimit:blocked',

  /** Rate limit violations: mkt:ratelimit:violations:{key} */
  VIOLATIONS: 'mkt:ratelimit:violations',
} as const;

// ============================================
// RESELLER DOMAIN
// ============================================

export const RESELLER_CACHE_PREFIX = {
  /** Reseller data: mkt:reseller:data:{resellerId} */
  DATA: 'mkt:reseller:data',

  /** Reseller tier: mkt:reseller:tier:{resellerId} */
  TIER: 'mkt:reseller:tier',

  /** Reseller commission: mkt:reseller:commission:{resellerId} */
  COMMISSION: 'mkt:reseller:commission',
} as const;

// ============================================
// KPI DOMAIN
// ============================================

export const KPI_CACHE_PREFIX = {
  /** KPI data: mkt:kpi:data:{kpiId} */
  DATA: 'mkt:kpi:data',

  /** KPI by user: mkt:kpi:user:{userId} */
  BY_USER: 'mkt:kpi:user',

  /** KPI templates: mkt:kpi:template:{templateId} */
  TEMPLATE: 'mkt:kpi:template',
} as const;

// ============================================
// PROMOTION DOMAIN
// ============================================

export const PROMOTION_CACHE_PREFIX = {
  /** Promotion data: mkt:promotion:data:{promotionId} */
  DATA: 'mkt:promotion:data',

  /** Active promotions: mkt:promotion:active:{workspaceId} */
  ACTIVE: 'mkt:promotion:active',

  /** Promotion by code: mkt:promotion:code:{code} */
  BY_CODE: 'mkt:promotion:code',

  /** Coupon data: mkt:promotion:coupon:{couponId} */
  COUPON: 'mkt:promotion:coupon',
} as const;

// ============================================
// COMBO DOMAIN
// ============================================

export const COMBO_CACHE_PREFIX = {
  /** Combo data: mkt:combo:data:{comboId} */
  DATA: 'mkt:combo:data',

  /** Combo calculation: mkt:combo:calc:{comboId} */
  CALCULATION: 'mkt:combo:calc',

  /** Combo by code: mkt:combo:code:{code} */
  BY_CODE: 'mkt:combo:code',
} as const;

// ============================================
// EXTERNAL PRODUCT DOMAIN (MKT Server)
// ============================================

export const EXTERNAL_PRODUCT_CACHE_PREFIX = {
  /** Digital product data: mkt:external:digital:{productId} */
  DIGITAL: 'mkt:external:digital',

  /** Digital product code mapping: mkt:external:digital:code:{code} */
  DIGITAL_CODE: 'mkt:external:digital:code',

  /** Digital packages by product: mkt:external:digital:pkgs:{productId} */
  DIGITAL_PACKAGES: 'mkt:external:digital:pkgs',

  /** Physical product data: mkt:external:physical:{productId} */
  PHYSICAL: 'mkt:external:physical',

  /** Service product data: mkt:external:service:{productId} */
  SERVICE: 'mkt:external:service',
} as const;

// ============================================
// TAG INDEX DOMAIN (for cache invalidation)
// ============================================

export const TAG_INDEX_CACHE_PREFIX = {
  /** Tag to keys mapping: mkt:tag:index:{tag} */
  INDEX: 'mkt:tag:index',

  /** Key to tags mapping: mkt:tag:keys:{cacheKey} */
  KEYS: 'mkt:tag:keys',
} as const;

// ============================================
// SYNC LOCK DOMAIN
// ============================================

export const SYNC_LOCK_CACHE_PREFIX = {
  /** Product sync lock: mkt:sync:lock:product */
  PRODUCT: 'mkt:sync:lock:product',

  /** General sync lock: mkt:sync:lock:{resource} */
  GENERAL: 'mkt:sync:lock',
} as const;

// ============================================
// LOCK DOMAIN
// ============================================

export const LOCK_CACHE_PREFIX = {
  /** Generic lock: mkt:lock:{resource} */
  GENERAL: 'mkt:lock',

  /** Order processing lock: mkt:lock:order:{orderId} */
  ORDER: 'mkt:lock:order',

  /** Payment processing lock: mkt:lock:payment:{paymentId} */
  PAYMENT: 'mkt:lock:payment',

  /** License activation lock: mkt:lock:license:{licenseId} */
  LICENSE: 'mkt:lock:license',
} as const;

// ============================================
// RBAC DOMAIN
// ============================================

export const RBAC_CACHE_PREFIX = {
  /** Permission template: mkt:rbac-seeder:permission-template:{templateId} */
  PERMISSION_TEMPLATE: 'mkt:rbac-seeder:permission-template',

  /** User permissions: mkt:rbac-seeder:user-permissions:{userId} */
  USER_PERMISSIONS: 'mkt:rbac-seeder:user-permissions',

  /** Policy: mkt:rbac-seeder:policy:{policyId} */
  POLICY: 'mkt:rbac-seeder:policy',

  /** Hierarchy: mkt:rbac-seeder:hierarchy:{userId} */
  HIERARCHY: 'mkt:rbac-seeder:hierarchy',

  /** Validation result: mkt:rbac-seeder:validation:{userId}:{action}:{resource} */
  VALIDATION: 'mkt:rbac-seeder:validation',

  /** Audit log: mkt:rbac-seeder:audit-log:{logId} */
  AUDIT_LOG: 'mkt:rbac-seeder:audit-log',

  /** Data access policy: mkt:rbac-seeder:data-access-policy:{policyId} */
  DATA_ACCESS_POLICY: 'mkt:rbac-seeder:data-access-policy',

  /** User context: mkt:rbac-seeder:user-context:{userId} */
  USER_CONTEXT: 'mkt:rbac-seeder:user-context',
} as const;

// ============================================
// COMBINED EXPORT
// ============================================

/**
 * All mkt-core cache prefixes
 */
export const MKT_CACHE_PREFIX = {
  LICENSE: LICENSE_CACHE_PREFIX,
  ORDER: ORDER_CACHE_PREFIX,
  INVOICE: INVOICE_CACHE_PREFIX,
  PAYMENT: PAYMENT_CACHE_PREFIX,
  CUSTOMER: CUSTOMER_CACHE_PREFIX,
  PRODUCT: PRODUCT_CACHE_PREFIX,
  DEPARTMENT: DEPARTMENT_CACHE_PREFIX,
  OAUTH2: OAUTH2_CACHE_PREFIX,
  RATE_LIMIT: RATE_LIMIT_CACHE_PREFIX,
  RESELLER: RESELLER_CACHE_PREFIX,
  KPI: KPI_CACHE_PREFIX,
  PROMOTION: PROMOTION_CACHE_PREFIX,
  COMBO: COMBO_CACHE_PREFIX,
  EXTERNAL_PRODUCT: EXTERNAL_PRODUCT_CACHE_PREFIX,
  TAG_INDEX: TAG_INDEX_CACHE_PREFIX,
  SYNC_LOCK: SYNC_LOCK_CACHE_PREFIX,
  LOCK: LOCK_CACHE_PREFIX,
  RBAC: RBAC_CACHE_PREFIX,
} as const;

/**
 * Type for all cache prefix values
 */
export type MktCachePrefix =
  | (typeof LICENSE_CACHE_PREFIX)[keyof typeof LICENSE_CACHE_PREFIX]
  | (typeof ORDER_CACHE_PREFIX)[keyof typeof ORDER_CACHE_PREFIX]
  | (typeof INVOICE_CACHE_PREFIX)[keyof typeof INVOICE_CACHE_PREFIX]
  | (typeof PAYMENT_CACHE_PREFIX)[keyof typeof PAYMENT_CACHE_PREFIX]
  | (typeof CUSTOMER_CACHE_PREFIX)[keyof typeof CUSTOMER_CACHE_PREFIX]
  | (typeof PRODUCT_CACHE_PREFIX)[keyof typeof PRODUCT_CACHE_PREFIX]
  | (typeof DEPARTMENT_CACHE_PREFIX)[keyof typeof DEPARTMENT_CACHE_PREFIX]
  | (typeof OAUTH2_CACHE_PREFIX)[keyof typeof OAUTH2_CACHE_PREFIX]
  | (typeof RATE_LIMIT_CACHE_PREFIX)[keyof typeof RATE_LIMIT_CACHE_PREFIX]
  | (typeof RESELLER_CACHE_PREFIX)[keyof typeof RESELLER_CACHE_PREFIX]
  | (typeof KPI_CACHE_PREFIX)[keyof typeof KPI_CACHE_PREFIX]
  | (typeof PROMOTION_CACHE_PREFIX)[keyof typeof PROMOTION_CACHE_PREFIX]
  | (typeof COMBO_CACHE_PREFIX)[keyof typeof COMBO_CACHE_PREFIX]
  | (typeof EXTERNAL_PRODUCT_CACHE_PREFIX)[keyof typeof EXTERNAL_PRODUCT_CACHE_PREFIX]
  | (typeof RBAC_CACHE_PREFIX)[keyof typeof RBAC_CACHE_PREFIX];
