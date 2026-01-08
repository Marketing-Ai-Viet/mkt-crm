// Key builders
export {
  buildActiveLicensesIndexKey,
  buildCacheKey,
  buildCustomerDataKey,
  buildCustomerEmailKey,
  buildCustomerOrdersKey,
  buildCustomerTagsKey,
  buildDepartmentChildrenKey,
  buildDepartmentDataKey,
  buildDepartmentTreeKey,
  buildInvoiceDataKey,
  buildInvoiceSequenceKey,
  buildKpiDataKey,
  buildKpiTemplateKey,
  buildLicenseDataKey,
  buildLicenseDevicesKey,
  buildLicenseKeyMappingKey,
  buildLicenseValidityKey,
  buildOAuth2ClientKey,
  buildOAuth2RefreshKey,
  buildOAuth2TokenKey,
  buildOrderDataKey,
  buildOrderIdempotencyKey,
  buildOrderIdempotencyLockKey,
  buildOrderInvoicesKey,
  buildOrderPaymentsKey,
  buildOrderQueueKey,
  buildPaymentDataKey,
  buildPaymentQrCodeKey,
  buildPaymentWebhookKey,
  buildProductCodeKey,
  buildProductDataKey,
  buildProductListKey,
  buildProductPackagesKey,
  buildProductSnapshotKey,
  buildRateLimitBlockedKey,
  buildRateLimitCounterKey,
  buildRateLimitViolationsKey,
  buildResellerCommissionKey,
  buildResellerDataKey,
  buildResellerTierKey,
  buildScanPattern,
  buildUserKpisKey,
  buildUserLicensesKey,
  extractIdFromKey,
} from './cache-key-builder.util';

// Tag builders
export {
  buildCustomerTag,
  buildDepartmentTag,
  buildInvoiceOrderTag,
  buildInvoiceTag,
  buildLicenseCacheTags,
  buildLicenseProductTag,
  buildLicenseTag,
  buildLicenseUserTag,
  buildOrderCacheTags,
  buildOrderCustomerTag,
  buildOrderTag,
  buildPaymentOrderTag,
  buildPaymentTag,
  buildProductCacheTags,
  buildProductTag,
  buildResellerTag,
} from './cache-tag-builder.util';
export type { LicenseStatus, OrderStatus } from './cache-tag-builder.util';

// TTL getters
export { getTTL, getTTLMs } from './cache-ttl-getter.util';

// TTL jitter
export {
  adaptiveTtl,
  applyJitter,
  createJitterFn,
  staggerTtl,
  withJitter,
  withJitterMs,
} from './cache-ttl-jitter.util';
export type { JitterOptions } from './cache-ttl-jitter.util';
