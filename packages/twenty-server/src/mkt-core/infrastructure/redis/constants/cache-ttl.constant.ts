/**
 * Centralized Cache TTL Configuration
 *
 * Single source of truth for all cache TTL values.
 * TTL values are in SECONDS.
 *
 * Guidelines:
 * - SHORT (5 min): Frequently changing data, validity checks
 * - MEDIUM (10-15 min): Moderately changing data, lists
 * - LONG (30 min): Stable data, individual records
 * - VERY_LONG (1 hour): Rarely changing data, configurations
 * - DAY (24 hours): Static/reference data
 */

import {
  COMBO_CACHE_PREFIX,
  CUSTOMER_CACHE_PREFIX,
  DEPARTMENT_CACHE_PREFIX,
  EXTERNAL_PRODUCT_CACHE_PREFIX,
  INVOICE_CACHE_PREFIX,
  KPI_CACHE_PREFIX,
  LICENSE_CACHE_PREFIX,
  OAUTH2_CACHE_PREFIX,
  ORDER_CACHE_PREFIX,
  PAYMENT_CACHE_PREFIX,
  PRODUCT_CACHE_PREFIX,
  PROMOTION_CACHE_PREFIX,
  RATE_LIMIT_CACHE_PREFIX,
  RBAC_CACHE_PREFIX,
  RESELLER_CACHE_PREFIX,
} from './cache-keys.constant';

// ============================================
// TTL PRESETS (in seconds)
// ============================================

export const CACHE_TTL = {
  /** 5 minutes - Frequently changing data */
  SHORT: 300,

  /** 10 minutes - Moderately changing data */
  MEDIUM: 600,

  /** 15 minutes - Moderate to stable data */
  MEDIUM_LONG: 900,

  /** 30 minutes - Stable data */
  LONG: 1800,

  /** 1 hour - Rarely changing data */
  VERY_LONG: 3600,

  /** 6 hours - Configuration data */
  HALF_DAY: 21600,

  /** 24 hours - Static/reference data */
  DAY: 86400,

  /** 1 minute - Rate limiting windows */
  RATE_LIMIT_WINDOW: 60,

  /** 30 seconds - Idempotency pending timeout */
  IDEMPOTENCY_PENDING: 30,

  /** 30 seconds - Default lock timeout (auto-release) */
  LOCK_DEFAULT: 30,

  /** 10 minutes - Sync lock timeout (longer for batch operations) */
  LOCK_SYNC: 600,

  /** 5 minutes - Processing lock timeout */
  LOCK_PROCESSING: 300,
} as const;

// ============================================
// TTL PRESETS (in milliseconds for locks)
// ============================================

export const CACHE_TTL_MS = {
  /** 30 seconds - Default lock timeout */
  LOCK_DEFAULT: CACHE_TTL.LOCK_DEFAULT * 1000,

  /** 10 minutes - Sync lock timeout */
  LOCK_SYNC: CACHE_TTL.LOCK_SYNC * 1000,

  /** 5 minutes - Processing lock timeout */
  LOCK_PROCESSING: CACHE_TTL.LOCK_PROCESSING * 1000,
} as const;

// ============================================
// TTL CONFIGURATION PER PREFIX
// ============================================

/**
 * TTL configuration for each cache prefix (in seconds)
 */
export const MKT_CACHE_TTL_CONFIG: Record<string, number> = {
  // ============================================
  // LICENSE DOMAIN
  // ============================================
  [LICENSE_CACHE_PREFIX.DATA]: CACHE_TTL.LONG, // 30 min - License full data
  [LICENSE_CACHE_PREFIX.VALIDITY]: CACHE_TTL.SHORT, // 5 min - Validity checks (fresher)
  [LICENSE_CACHE_PREFIX.KEY]: CACHE_TTL.VERY_LONG, // 1 hour - Key mapping (stable)
  [LICENSE_CACHE_PREFIX.USER]: CACHE_TTL.LONG, // 30 min - User's licenses
  [LICENSE_CACHE_PREFIX.DEVICES]: CACHE_TTL.MEDIUM, // 10 min - Device list
  [LICENSE_CACHE_PREFIX.INDEX_ACTIVE]: CACHE_TTL.VERY_LONG, // 1 hour - Active index

  // ============================================
  // ORDER DOMAIN
  // ============================================
  [ORDER_CACHE_PREFIX.DATA]: CACHE_TTL.LONG, // 30 min - Order data
  [ORDER_CACHE_PREFIX.IDEMPOTENCY]: CACHE_TTL.LONG, // 30 min - Idempotency record
  [ORDER_CACHE_PREFIX.IDEMPOTENCY_LOCK]: CACHE_TTL.IDEMPOTENCY_PENDING, // 30s - Lock timeout
  [ORDER_CACHE_PREFIX.BY_CUSTOMER]: CACHE_TTL.MEDIUM, // 10 min - Customer orders
  [ORDER_CACHE_PREFIX.QUEUE]: CACHE_TTL.SHORT, // 5 min - Processing queue

  // ============================================
  // INVOICE DOMAIN
  // ============================================
  [INVOICE_CACHE_PREFIX.DATA]: CACHE_TTL.LONG, // 30 min - Invoice data
  [INVOICE_CACHE_PREFIX.BY_ORDER]: CACHE_TTL.MEDIUM, // 10 min - Order invoices
  [INVOICE_CACHE_PREFIX.SEQUENCE]: CACHE_TTL.DAY, // 24 hours - Sequence numbers

  // ============================================
  // PAYMENT DOMAIN
  // ============================================
  [PAYMENT_CACHE_PREFIX.DATA]: CACHE_TTL.LONG, // 30 min - Payment data
  [PAYMENT_CACHE_PREFIX.BY_ORDER]: CACHE_TTL.MEDIUM, // 10 min - Order payments
  [PAYMENT_CACHE_PREFIX.WEBHOOK]: CACHE_TTL.DAY, // 24 hours - Webhook idempotency
  [PAYMENT_CACHE_PREFIX.QR_CODE]: CACHE_TTL.MEDIUM_LONG, // 15 min - QR code validity

  // ============================================
  // CUSTOMER DOMAIN
  // ============================================
  [CUSTOMER_CACHE_PREFIX.DATA]: CACHE_TTL.LONG, // 30 min - Customer data
  [CUSTOMER_CACHE_PREFIX.BY_EMAIL]: CACHE_TTL.VERY_LONG, // 1 hour - Email mapping
  [CUSTOMER_CACHE_PREFIX.TAGS]: CACHE_TTL.MEDIUM, // 10 min - Customer tags

  // ============================================
  // PRODUCT DOMAIN
  // ============================================
  [PRODUCT_CACHE_PREFIX.DATA]: CACHE_TTL.LONG, // 30 min - Product data
  [PRODUCT_CACHE_PREFIX.BY_CODE]: CACHE_TTL.VERY_LONG, // 1 hour - Code mapping
  [PRODUCT_CACHE_PREFIX.PACKAGES]: CACHE_TTL.MEDIUM, // 10 min - Product packages
  [PRODUCT_CACHE_PREFIX.LIST]: CACHE_TTL.MEDIUM, // 10 min - Product list
  [PRODUCT_CACHE_PREFIX.SNAPSHOT]: CACHE_TTL.DAY, // 24 hours - Immutable snapshots

  // ============================================
  // DEPARTMENT DOMAIN
  // ============================================
  [DEPARTMENT_CACHE_PREFIX.DATA]: CACHE_TTL.LONG, // 30 min - Department data
  [DEPARTMENT_CACHE_PREFIX.TREE]: CACHE_TTL.VERY_LONG, // 1 hour - Tree structure
  [DEPARTMENT_CACHE_PREFIX.CHILDREN]: CACHE_TTL.LONG, // 30 min - Children list

  // ============================================
  // OAUTH2 DOMAIN
  // ============================================
  [OAUTH2_CACHE_PREFIX.TOKEN]: CACHE_TTL.SHORT, // 5 min - Access token cache
  [OAUTH2_CACHE_PREFIX.REFRESH]: CACHE_TTL.HALF_DAY, // 6 hours - Refresh token
  [OAUTH2_CACHE_PREFIX.CLIENT]: CACHE_TTL.VERY_LONG, // 1 hour - Client credentials

  // ============================================
  // RATE LIMIT DOMAIN
  // ============================================
  [RATE_LIMIT_CACHE_PREFIX.COUNTER]: CACHE_TTL.RATE_LIMIT_WINDOW, // 1 min - Rate window
  [RATE_LIMIT_CACHE_PREFIX.BLOCKED]: CACHE_TTL.SHORT, // 5 min - Blocked entities
  [RATE_LIMIT_CACHE_PREFIX.VIOLATIONS]: CACHE_TTL.VERY_LONG, // 1 hour - Violation tracking

  // ============================================
  // RESELLER DOMAIN
  // ============================================
  [RESELLER_CACHE_PREFIX.DATA]: CACHE_TTL.LONG, // 30 min - Reseller data
  [RESELLER_CACHE_PREFIX.TIER]: CACHE_TTL.VERY_LONG, // 1 hour - Tier info
  [RESELLER_CACHE_PREFIX.COMMISSION]: CACHE_TTL.MEDIUM, // 10 min - Commission rates

  // ============================================
  // KPI DOMAIN
  // ============================================
  [KPI_CACHE_PREFIX.DATA]: CACHE_TTL.MEDIUM, // 10 min - KPI data
  [KPI_CACHE_PREFIX.BY_USER]: CACHE_TTL.MEDIUM, // 10 min - User KPIs
  [KPI_CACHE_PREFIX.TEMPLATE]: CACHE_TTL.VERY_LONG, // 1 hour - Templates

  // ============================================
  // PROMOTION DOMAIN
  // ============================================
  [PROMOTION_CACHE_PREFIX.DATA]: CACHE_TTL.SHORT, // 5 min - Promotion data
  [PROMOTION_CACHE_PREFIX.ACTIVE]: CACHE_TTL.SHORT, // 5 min - Active promotions
  [PROMOTION_CACHE_PREFIX.BY_CODE]: CACHE_TTL.SHORT, // 5 min - Code lookup
  [PROMOTION_CACHE_PREFIX.COUPON]: CACHE_TTL.SHORT, // 5 min - Coupon data

  // ============================================
  // COMBO DOMAIN
  // ============================================
  [COMBO_CACHE_PREFIX.DATA]: CACHE_TTL.SHORT, // 5 min - Combo data
  [COMBO_CACHE_PREFIX.CALCULATION]: CACHE_TTL.RATE_LIMIT_WINDOW, // 1 min - Calc result
  [COMBO_CACHE_PREFIX.BY_CODE]: CACHE_TTL.SHORT, // 5 min - Code lookup

  // ============================================
  // EXTERNAL PRODUCT DOMAIN (MKT Server)
  // ============================================
  [EXTERNAL_PRODUCT_CACHE_PREFIX.DIGITAL]: CACHE_TTL.DAY, // 24h - Product data
  [EXTERNAL_PRODUCT_CACHE_PREFIX.DIGITAL_CODE]: CACHE_TTL.DAY, // 24h - Code mapping
  [EXTERNAL_PRODUCT_CACHE_PREFIX.DIGITAL_PACKAGES]: CACHE_TTL.DAY, // 24h - Packages
  [EXTERNAL_PRODUCT_CACHE_PREFIX.PHYSICAL]: CACHE_TTL.DAY, // 24h - Physical product
  [EXTERNAL_PRODUCT_CACHE_PREFIX.SERVICE]: CACHE_TTL.DAY, // 24h - Service product

  // ============================================
  // RBAC DOMAIN
  // ============================================
  [RBAC_CACHE_PREFIX.PERMISSION_TEMPLATE]: CACHE_TTL.VERY_LONG, // 1 hour - Permission templates
  [RBAC_CACHE_PREFIX.USER_PERMISSIONS]: CACHE_TTL.LONG, // 30 min - User permissions
  [RBAC_CACHE_PREFIX.POLICY]: CACHE_TTL.VERY_LONG, // 1 hour - Policies
  [RBAC_CACHE_PREFIX.HIERARCHY]: CACHE_TTL.VERY_LONG, // 1 hour - Hierarchy (stable)
  [RBAC_CACHE_PREFIX.VALIDATION]: CACHE_TTL.SHORT, // 5 min - Validation results
  [RBAC_CACHE_PREFIX.AUDIT_LOG]: CACHE_TTL.DAY, // 24 hours - Audit logs
  [RBAC_CACHE_PREFIX.DATA_ACCESS_POLICY]: CACHE_TTL.VERY_LONG, // 1 hour - Data access policies
  [RBAC_CACHE_PREFIX.USER_CONTEXT]: CACHE_TTL.MEDIUM, // 10 min - User context
};
