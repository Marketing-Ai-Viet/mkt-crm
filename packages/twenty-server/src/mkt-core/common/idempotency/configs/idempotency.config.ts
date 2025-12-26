import {
  CacheFailureMode,
  IdempotencyDomain,
} from 'src/mkt-core/common/idempotency/types/idempotency.types';
import {
  CACHE_TTL,
  ORDER_CACHE_PREFIX,
} from 'src/mkt-core/infrastructure/redis/constants';

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
 * Default configuration values
 */
export const DEFAULT_ACTION_CONFIG: IdempotencyActionConfig = {
  ttlSeconds: 86400, // 24 hours
  lockTimeoutMs: 300000, // 5 minutes
  failureMode: 'FAIL_SAFE',
  maxResponseSizeBytes: 10240, // 10KB
  stuckPendingGraceMs: 60000, // 1 minute grace after lock expires
};

/**
 * Financial operations - stricter config
 */
const FINANCIAL_CONFIG: Partial<IdempotencyActionConfig> = {
  failureMode: 'FAIL_STRICT',
  ttlSeconds: 172800, // 48 hours
  maxResponseSizeBytes: 5120, // 5KB - smaller for financial
};

/**
 * Per-action configuration map
 * Key format: {domain}:{action}
 */
export const ACTION_CONFIGS: Record<
  string,
  Partial<IdempotencyActionConfig>
> = {
  // Order actions
  'order:createOrder': {
    ...FINANCIAL_CONFIG,
    lockTimeoutMs: 600000, // 10 minutes for complex orders
    responseAllowedFields: ['id', 'orderNumber', 'status', 'totalAmount'],
  },
  'order:confirmOrder': {
    ...FINANCIAL_CONFIG,
    ttlSeconds: 7200, // 2 hours
    responseAllowedFields: ['id', 'orderNumber', 'status', 'confirmedAt'],
  },
  'order:updateOrderStatus': {
    ttlSeconds: 3600, // 1 hour
    failureMode: 'FAIL_SAFE',
  },
  'order:refundOrder': {
    ...FINANCIAL_CONFIG,
    lockTimeoutMs: 900000, // 15 minutes
    responseAllowedFields: ['id', 'refundId', 'status', 'refundAmount'],
  },

  // Payment actions
  'payment:createPayment': {
    ...FINANCIAL_CONFIG,
    responseAllowedFields: ['id', 'paymentId', 'status', 'amount'],
  },
  'payment:processPayment': {
    ...FINANCIAL_CONFIG,
    lockTimeoutMs: 900000, // 15 minutes
  },
  'payment:refundPayment': {
    ...FINANCIAL_CONFIG,
  },

  // License actions
  'license:createLicense': {
    ttlSeconds: 86400,
    failureMode: 'FAIL_STRICT',
    responseAllowedFields: ['id', 'licenseKey', 'status', 'expiresAt'],
  },
  'license:renewLicense': {
    ...FINANCIAL_CONFIG,
    responseAllowedFields: ['id', 'licenseKey', 'status', 'newExpiresAt'],
  },
  'license:activateLicense': {
    ttlSeconds: 3600,
    failureMode: 'FAIL_SAFE',
  },

  // Invoice actions
  'invoice:createInvoice': {
    ...FINANCIAL_CONFIG,
    responseAllowedFields: ['id', 'invoiceNumber', 'status', 'totalAmount'],
  },
  'invoice:sendInvoice': {
    ttlSeconds: 3600,
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
 * Uses centralized cache key prefixes from redis infrastructure
 */
export const IDEMPOTENCY_GLOBAL_CONFIG = {
  /** Redis key prefix for idempotency records */
  keyPrefix: ORDER_CACHE_PREFIX.IDEMPOTENCY,

  /** Redis key prefix for locks */
  lockPrefix: ORDER_CACHE_PREFIX.IDEMPOTENCY_LOCK,

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
  cleanupIntervalMs: 300000,

  /** Stuck pending timeout (from centralized CACHE_TTL) */
  stuckPendingTimeoutSeconds: CACHE_TTL.IDEMPOTENCY_PENDING,
} as const;
