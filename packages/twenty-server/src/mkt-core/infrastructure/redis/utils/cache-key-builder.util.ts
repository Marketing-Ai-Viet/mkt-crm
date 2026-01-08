/**
 * Cache Key Builder Utilities
 *
 * Type-safe functions to build complete cache keys from prefixes.
 * Ensures consistent key formatting across the codebase.
 *
 * Usage:
 * ```typescript
 * const key = buildLicenseDataKey('lic-123');
 * // Returns: 'mkt:license:data:lic-123'
 * ```
 */

import {
  CUSTOMER_CACHE_PREFIX,
  DEPARTMENT_CACHE_PREFIX,
  INVOICE_CACHE_PREFIX,
  KPI_CACHE_PREFIX,
  LICENSE_CACHE_PREFIX,
  OAUTH2_CACHE_PREFIX,
  ORDER_CACHE_PREFIX,
  PAYMENT_CACHE_PREFIX,
  PRODUCT_CACHE_PREFIX,
  RATE_LIMIT_CACHE_PREFIX,
  RESELLER_CACHE_PREFIX,
} from 'src/mkt-core/infrastructure/redis/constants/cache-keys.constant';

// ============================================
// LICENSE DOMAIN
// ============================================

/**
 * Build license data key: mkt:license:data:{licenseId}
 */
export const buildLicenseDataKey = (licenseId: string): string =>
  `${LICENSE_CACHE_PREFIX.DATA}:${licenseId}`;

/**
 * Build license validity key: mkt:license:validity:{licenseId}
 */
export const buildLicenseValidityKey = (licenseId: string): string =>
  `${LICENSE_CACHE_PREFIX.VALIDITY}:${licenseId}`;

/**
 * Build license key mapping: mkt:license:key:{licenseKey}
 */
export const buildLicenseKeyMappingKey = (licenseKey: string): string =>
  `${LICENSE_CACHE_PREFIX.KEY}:${licenseKey}`;

/**
 * Build user licenses key: mkt:license:user:{userId}
 */
export const buildUserLicensesKey = (userId: string): string =>
  `${LICENSE_CACHE_PREFIX.USER}:${userId}`;

/**
 * Build license devices key: mkt:license:devices:{licenseId}
 */
export const buildLicenseDevicesKey = (licenseId: string): string =>
  `${LICENSE_CACHE_PREFIX.DEVICES}:${licenseId}`;

/**
 * Build active licenses index key: mkt:license:index:active
 */
export const buildActiveLicensesIndexKey = (): string =>
  LICENSE_CACHE_PREFIX.INDEX_ACTIVE;

// ============================================
// ORDER DOMAIN
// ============================================

/**
 * Build order data key: mkt:order:data:{orderId}
 */
export const buildOrderDataKey = (orderId: string): string =>
  `${ORDER_CACHE_PREFIX.DATA}:${orderId}`;

/**
 * Build order idempotency key: mkt:order:idempotency:{key}
 */
export const buildOrderIdempotencyKey = (key: string): string =>
  `${ORDER_CACHE_PREFIX.IDEMPOTENCY}:${key}`;

/**
 * Build order idempotency lock key: mkt:order:idempotency:lock:{key}
 */
export const buildOrderIdempotencyLockKey = (key: string): string =>
  `${ORDER_CACHE_PREFIX.IDEMPOTENCY_LOCK}:${key}`;

/**
 * Build customer orders key: mkt:order:customer:{customerId}
 */
export const buildCustomerOrdersKey = (customerId: string): string =>
  `${ORDER_CACHE_PREFIX.BY_CUSTOMER}:${customerId}`;

/**
 * Build order queue key: mkt:order:queue:{status}
 */
export const buildOrderQueueKey = (status: string): string =>
  `${ORDER_CACHE_PREFIX.QUEUE}:${status}`;

// ============================================
// INVOICE DOMAIN
// ============================================

/**
 * Build invoice data key: mkt:invoice:data:{invoiceId}
 */
export const buildInvoiceDataKey = (invoiceId: string): string =>
  `${INVOICE_CACHE_PREFIX.DATA}:${invoiceId}`;

/**
 * Build order invoices key: mkt:invoice:order:{orderId}
 */
export const buildOrderInvoicesKey = (orderId: string): string =>
  `${INVOICE_CACHE_PREFIX.BY_ORDER}:${orderId}`;

/**
 * Build invoice sequence key: mkt:invoice:sequence:{year}
 */
export const buildInvoiceSequenceKey = (year: number | string): string =>
  `${INVOICE_CACHE_PREFIX.SEQUENCE}:${year}`;

// ============================================
// PAYMENT DOMAIN
// ============================================

/**
 * Build payment data key: mkt:payment:data:{paymentId}
 */
export const buildPaymentDataKey = (paymentId: string): string =>
  `${PAYMENT_CACHE_PREFIX.DATA}:${paymentId}`;

/**
 * Build order payments key: mkt:payment:order:{orderId}
 */
export const buildOrderPaymentsKey = (orderId: string): string =>
  `${PAYMENT_CACHE_PREFIX.BY_ORDER}:${orderId}`;

/**
 * Build payment webhook key: mkt:payment:webhook:{transactionId}
 */
export const buildPaymentWebhookKey = (transactionId: string): string =>
  `${PAYMENT_CACHE_PREFIX.WEBHOOK}:${transactionId}`;

/**
 * Build payment QR code key: mkt:payment:qr:{orderId}
 */
export const buildPaymentQrCodeKey = (orderId: string): string =>
  `${PAYMENT_CACHE_PREFIX.QR_CODE}:${orderId}`;

// ============================================
// CUSTOMER DOMAIN
// ============================================

/**
 * Build customer data key: mkt:customer:data:{customerId}
 */
export const buildCustomerDataKey = (customerId: string): string =>
  `${CUSTOMER_CACHE_PREFIX.DATA}:${customerId}`;

/**
 * Build customer email mapping key: mkt:customer:email:{email}
 */
export const buildCustomerEmailKey = (email: string): string =>
  `${CUSTOMER_CACHE_PREFIX.BY_EMAIL}:${email.toLowerCase()}`;

/**
 * Build customer tags key: mkt:customer:tags:{customerId}
 */
export const buildCustomerTagsKey = (customerId: string): string =>
  `${CUSTOMER_CACHE_PREFIX.TAGS}:${customerId}`;

// ============================================
// PRODUCT DOMAIN
// ============================================

/**
 * Build product data key: mkt:product:data:{productId}
 */
export const buildProductDataKey = (productId: string): string =>
  `${PRODUCT_CACHE_PREFIX.DATA}:${productId}`;

/**
 * Build product code mapping key: mkt:product:code:{code}
 */
export const buildProductCodeKey = (code: string): string =>
  `${PRODUCT_CACHE_PREFIX.BY_CODE}:${code}`;

/**
 * Build product packages key: mkt:product:packages:{productId}
 */
export const buildProductPackagesKey = (productId: string): string =>
  `${PRODUCT_CACHE_PREFIX.PACKAGES}:${productId}`;

/**
 * Build product list key: mkt:product:list
 */
export const buildProductListKey = (): string => PRODUCT_CACHE_PREFIX.LIST;

/**
 * Build product snapshot key: mkt:product:snapshot:{snapshotId}
 */
export const buildProductSnapshotKey = (snapshotId: string): string =>
  `${PRODUCT_CACHE_PREFIX.SNAPSHOT}:${snapshotId}`;

// ============================================
// DEPARTMENT DOMAIN
// ============================================

/**
 * Build department data key: mkt:department:data:{departmentId}
 */
export const buildDepartmentDataKey = (departmentId: string): string =>
  `${DEPARTMENT_CACHE_PREFIX.DATA}:${departmentId}`;

/**
 * Build department tree key: mkt:department:tree:{rootId}
 */
export const buildDepartmentTreeKey = (rootId: string): string =>
  `${DEPARTMENT_CACHE_PREFIX.TREE}:${rootId}`;

/**
 * Build department children key: mkt:department:children:{parentId}
 */
export const buildDepartmentChildrenKey = (parentId: string): string =>
  `${DEPARTMENT_CACHE_PREFIX.CHILDREN}:${parentId}`;

// ============================================
// OAUTH2 DOMAIN
// ============================================

/**
 * Build OAuth2 token key: mkt:oauth2:token:{hash}
 */
export const buildOAuth2TokenKey = (hash: string): string =>
  `${OAUTH2_CACHE_PREFIX.TOKEN}:${hash}`;

/**
 * Build OAuth2 refresh token key: mkt:oauth2:refresh:{hash}
 */
export const buildOAuth2RefreshKey = (hash: string): string =>
  `${OAUTH2_CACHE_PREFIX.REFRESH}:${hash}`;

/**
 * Build OAuth2 client key: mkt:oauth2:client:{clientId}
 */
export const buildOAuth2ClientKey = (clientId: string): string =>
  `${OAUTH2_CACHE_PREFIX.CLIENT}:${clientId}`;

// ============================================
// RATE LIMIT DOMAIN
// ============================================

/**
 * Build rate limit counter key: mkt:ratelimit:counter:{key}
 */
export const buildRateLimitCounterKey = (key: string): string =>
  `${RATE_LIMIT_CACHE_PREFIX.COUNTER}:${key}`;

/**
 * Build rate limit blocked key: mkt:ratelimit:blocked:{key}
 */
export const buildRateLimitBlockedKey = (key: string): string =>
  `${RATE_LIMIT_CACHE_PREFIX.BLOCKED}:${key}`;

/**
 * Build rate limit violations key: mkt:ratelimit:violations:{key}
 */
export const buildRateLimitViolationsKey = (key: string): string =>
  `${RATE_LIMIT_CACHE_PREFIX.VIOLATIONS}:${key}`;

// ============================================
// RESELLER DOMAIN
// ============================================

/**
 * Build reseller data key: mkt:reseller:data:{resellerId}
 */
export const buildResellerDataKey = (resellerId: string): string =>
  `${RESELLER_CACHE_PREFIX.DATA}:${resellerId}`;

/**
 * Build reseller tier key: mkt:reseller:tier:{resellerId}
 */
export const buildResellerTierKey = (resellerId: string): string =>
  `${RESELLER_CACHE_PREFIX.TIER}:${resellerId}`;

/**
 * Build reseller commission key: mkt:reseller:commission:{resellerId}
 */
export const buildResellerCommissionKey = (resellerId: string): string =>
  `${RESELLER_CACHE_PREFIX.COMMISSION}:${resellerId}`;

// ============================================
// KPI DOMAIN
// ============================================

/**
 * Build KPI data key: mkt:kpi:data:{kpiId}
 */
export const buildKpiDataKey = (kpiId: string): string =>
  `${KPI_CACHE_PREFIX.DATA}:${kpiId}`;

/**
 * Build user KPIs key: mkt:kpi:user:{userId}
 */
export const buildUserKpisKey = (userId: string): string =>
  `${KPI_CACHE_PREFIX.BY_USER}:${userId}`;

/**
 * Build KPI template key: mkt:kpi:template:{templateId}
 */
export const buildKpiTemplateKey = (templateId: string): string =>
  `${KPI_CACHE_PREFIX.TEMPLATE}:${templateId}`;

// ============================================
// GENERIC KEY BUILDER
// ============================================

/**
 * Build a cache key from prefix and segments
 *
 * @param prefix - Cache prefix from constants
 * @param segments - Key segments to append
 * @returns Complete cache key
 *
 * @example
 * buildCacheKey(LICENSE_CACHE_PREFIX.DATA, ['lic-123'])
 * // Returns: 'mkt:license:data:lic-123'
 *
 * buildCacheKey(ORDER_CACHE_PREFIX.BY_CUSTOMER, ['cust-456', '2024'])
 * // Returns: 'mkt:order:customer:cust-456:2024'
 */
export const buildCacheKey = (prefix: string, segments: string[]): string =>
  [prefix, ...segments].join(':');

/**
 * Extract the ID from a cache key
 *
 * @param key - Complete cache key
 * @param prefix - Cache prefix to remove
 * @returns The ID portion of the key
 *
 * @example
 * extractIdFromKey('mkt:license:data:lic-123', LICENSE_CACHE_PREFIX.DATA)
 * // Returns: 'lic-123'
 */
export const extractIdFromKey = (key: string, prefix: string): string => {
  const prefixWithColon = `${prefix}:`;

  return key.startsWith(prefixWithColon)
    ? key.slice(prefixWithColon.length)
    : key;
};

/**
 * Build scan pattern for a prefix
 *
 * @param prefix - Cache prefix
 * @returns Pattern for Redis SCAN
 *
 * @example
 * buildScanPattern(LICENSE_CACHE_PREFIX.DATA)
 * // Returns: 'mkt:license:data:*'
 */
export const buildScanPattern = (prefix: string): string => `${prefix}:*`;
