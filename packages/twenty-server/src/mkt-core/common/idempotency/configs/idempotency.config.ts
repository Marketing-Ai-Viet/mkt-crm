import {
  CacheFailureMode,
  IdempotencyDomain,
} from 'src/mkt-core/common/idempotency/types/idempotency.types';
import {
  IDEMPOTENCY_INVOICE_ACTION,
  IDEMPOTENCY_LICENSE_ACTION,
  IDEMPOTENCY_ORDER_ACTION,
  IDEMPOTENCY_PAYMENT_ACTION,
} from 'src/mkt-core/common/idempotency/constants';
import {
  CACHE_TTL,
  CACHE_TTL_MS,
} from 'src/mkt-core/infrastructure/redis/constants';

/**
 * Relative key prefixes for idempotency
 *
 * Used with CacheStorageService which already adds namespace (e.g., 'mkt:order:')
 * Final key: namespace + relative prefix + key
 *
 * Example: 'mkt:order:' + 'idempotency:' + '{key}' = 'mkt:order:idempotency:{key}'
 */
const IDEMPOTENCY_RELATIVE_PREFIX = {
  RECORD: 'idempotency',
  LOCK: 'idempotency:lock',
} as const;

/**
 * Configuration for a specific idempotency action
 */
export type IdempotencyActionConfig = {
  /** TTL for idempotency records in seconds */
  ttlSeconds: number;
  /** Lock timeout in milliseconds */
  lockTimeoutMs: number;
  /** Cache failure handling mode */
  failureMode: CacheFailureMode;
  /** Max response size in bytes for caching */
  maxResponseSizeBytes: number;
  /** Allowed fields to cache from response (empty = all except sensitive) */
  responseAllowedFields?: string[];
  /** Grace period before marking stuck PENDING as FAILED (ms) */
  stuckPendingGraceMs: number;
};

/**
 * Default configuration values (using centralized TTL)
 */
export const DEFAULT_ACTION_CONFIG: IdempotencyActionConfig = {
  ttlSeconds: CACHE_TTL.DAY, // 24 hours
  lockTimeoutMs: CACHE_TTL_MS.LOCK_PROCESSING, // 5 minutes
  failureMode: 'FAIL_SAFE',
  maxResponseSizeBytes: 10240, // 10KB
  stuckPendingGraceMs: CACHE_TTL.RATE_LIMIT_WINDOW * 1000, // 1 minute grace
};

/**
 * Financial operations - stricter config
 */
const FINANCIAL_CONFIG: Partial<IdempotencyActionConfig> = {
  failureMode: 'FAIL_STRICT',
  ttlSeconds: CACHE_TTL.DAY * 2, // 48 hours
  maxResponseSizeBytes: 5120, // 5KB - smaller for financial
};

/**
 * Helper to build action config key
 * Format: {domain}:{action}
 */
const buildActionKey = (domain: string, action: string): string =>
  `${domain}:${action}`;

/**
 * Per-action configuration map
 * Key format: {domain}:{action}
 *
 * Sử dụng constants từ IDEMPOTENCY_*_ACTION để đảm bảo nhất quán
 */
export const ACTION_CONFIGS: Record<
  string,
  Partial<IdempotencyActionConfig>
> = {
  // Order actions
  [buildActionKey('order', IDEMPOTENCY_ORDER_ACTION.CREATE_ORDER)]: {
    ...FINANCIAL_CONFIG,
    lockTimeoutMs: CACHE_TTL_MS.LOCK_SYNC, // 10 minutes for complex orders
    responseAllowedFields: [
      'success',
      'orderId',
      'orderCode',
      'paymentQrCode',
      'totalAmount',
      'paidAmount',
      'remainingAmount',
      'paymentStatus',
      'error',
    ],
  },
  [buildActionKey('order', IDEMPOTENCY_ORDER_ACTION.CONFIRM_ORDER)]: {
    ...FINANCIAL_CONFIG,
    ttlSeconds: CACHE_TTL.VERY_LONG * 2, // 2 hours
    responseAllowedFields: [
      'success',
      'orderId',
      'newStatus',
      'totalAmount',
      'paidAmount',
      'remainingAmount',
      'paymentStatus',
      'error',
    ],
  },
  [buildActionKey('order', IDEMPOTENCY_ORDER_ACTION.UPDATE_ORDER_STATUS)]: {
    ttlSeconds: CACHE_TTL.VERY_LONG, // 1 hour
    failureMode: 'FAIL_SAFE',
  },
  [buildActionKey('order', IDEMPOTENCY_ORDER_ACTION.REFUND_ORDER)]: {
    ...FINANCIAL_CONFIG,
    lockTimeoutMs: CACHE_TTL.MEDIUM_LONG * 1000, // 15 minutes
    responseAllowedFields: [
      'success',
      'orderId',
      'refundedAmount',
      'newStatus',
      'totalAmount',
      'paidAmount',
      'remainingAmount',
      'paymentStatus',
      'error',
    ],
  },

  // Payment actions
  [buildActionKey('payment', IDEMPOTENCY_PAYMENT_ACTION.CREATE_PAYMENT)]: {
    ...FINANCIAL_CONFIG,
    responseAllowedFields: ['id', 'paymentId', 'status', 'amount'],
  },
  [buildActionKey('payment', IDEMPOTENCY_PAYMENT_ACTION.PROCESS_PAYMENT)]: {
    ...FINANCIAL_CONFIG,
    lockTimeoutMs: CACHE_TTL.MEDIUM_LONG * 1000, // 15 minutes
  },
  [buildActionKey('payment', IDEMPOTENCY_PAYMENT_ACTION.REFUND_PAYMENT)]: {
    ...FINANCIAL_CONFIG,
  },

  // License actions
  [buildActionKey('license', IDEMPOTENCY_LICENSE_ACTION.CREATE_LICENSE)]: {
    ttlSeconds: CACHE_TTL.DAY, // 24 hours
    failureMode: 'FAIL_STRICT',
    responseAllowedFields: ['id', 'licenseKey', 'status', 'expiresAt'],
  },
  [buildActionKey('license', IDEMPOTENCY_LICENSE_ACTION.RENEW_LICENSE)]: {
    ...FINANCIAL_CONFIG,
    responseAllowedFields: ['id', 'licenseKey', 'status', 'newExpiresAt'],
  },
  [buildActionKey('license', IDEMPOTENCY_LICENSE_ACTION.ACTIVATE_LICENSE)]: {
    ttlSeconds: CACHE_TTL.VERY_LONG, // 1 hour
    failureMode: 'FAIL_SAFE',
  },

  // Invoice actions
  [buildActionKey('invoice', IDEMPOTENCY_INVOICE_ACTION.CREATE_INVOICE)]: {
    ...FINANCIAL_CONFIG,
    responseAllowedFields: ['id', 'invoiceNumber', 'status', 'totalAmount'],
  },
  [buildActionKey('invoice', IDEMPOTENCY_INVOICE_ACTION.SEND_INVOICE)]: {
    ttlSeconds: CACHE_TTL.VERY_LONG, // 1 hour
    failureMode: 'FAIL_SAFE',
  },
};

/**
 * Get configuration for a specific action
 *
 * @param domain - Domain (order, payment, license, invoice)
 * @param action - Action name
 * @returns Merged configuration with defaults
 */
export const getActionConfig = (
  domain: IdempotencyDomain,
  action: string,
): IdempotencyActionConfig => {
  const key = `${domain}:${action}`;
  const actionConfig = ACTION_CONFIGS[key] ?? {};

  return {
    ...DEFAULT_ACTION_CONFIG,
    ...actionConfig,
  };
};

/**
 * Global idempotency configuration
 *
 * Uses relative prefixes since CacheStorageService adds namespace automatically
 * @see IDEMPOTENCY_RELATIVE_PREFIX
 */
export const IDEMPOTENCY_GLOBAL_CONFIG = {
  /**
   * Redis key prefix for idempotency records (relative)
   * CacheStorageService will prepend namespace: 'mkt:order:' + 'idempotency:'
   */
  keyPrefix: IDEMPOTENCY_RELATIVE_PREFIX.RECORD,

  /**
   * Redis key prefix for locks (relative)
   * CacheStorageService will prepend namespace: 'mkt:order:' + 'idempotency:lock:'
   */
  lockPrefix: IDEMPOTENCY_RELATIVE_PREFIX.LOCK,

  /** Default TTL for idempotency records (from centralized config) */
  defaultTtlSeconds: CACHE_TTL.LONG, // 30 minutes

  /** Header name for client-provided idempotency key */
  headerName: 'X-Idempotency-Key',

  /** Expected format for client-provided key (UUID v4) */
  headerFormat:
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /** Default poll interval for waitForCompletion (ms) */
  defaultPollIntervalMs: 500,

  /** Cleanup job interval (ms) - run every 5 minutes */
  cleanupIntervalMs: CACHE_TTL.SHORT * 1000,

  /** Stuck pending timeout (from centralized CACHE_TTL) */
  stuckPendingTimeoutSeconds: CACHE_TTL.IDEMPOTENCY_PENDING,
} as const;
