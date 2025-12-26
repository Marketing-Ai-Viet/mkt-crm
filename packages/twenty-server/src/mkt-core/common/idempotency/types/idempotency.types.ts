/**
 * Generic Idempotency Types
 *
 * Provides types for idempotent operations across all domains:
 * - Order, Payment, License, Invoice, etc.
 */

/**
 * Supported idempotency domains
 */
export type IdempotencyDomain =
  | 'order'
  | 'payment'
  | 'license'
  | 'invoice'
  | 'customer'
  | 'product';

/**
 * Cache failure handling mode
 * - FAIL_SAFE: Continue without idempotency (log warning) - for non-critical ops
 * - FAIL_STRICT: Throw error when cache unavailable - for financial ops
 */
export type CacheFailureMode = 'FAIL_SAFE' | 'FAIL_STRICT';

/**
 * Status of idempotency record
 */
export type IdempotencyStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

/**
 * Idempotency key - string format
 * Format: {namespace}:{workspaceId}:{domain}:{action}:{hash}[:nonce]
 */
export type IdempotencyKey = string;

/**
 * Stored idempotency record in Redis
 */
export type IdempotencyRecord<T = unknown> = {
  /** Unique idempotency key */
  key: IdempotencyKey;

  /** Domain (order, payment, license, etc.) */
  domain: IdempotencyDomain;

  /** Action name */
  action: string;

  /** Workspace ID */
  workspaceId: string;

  /** Current processing status */
  status: IdempotencyStatus;

  /** ISO timestamp when record was created */
  createdAt: string;

  /** ISO timestamp when processing completed */
  completedAt?: string;

  /** ISO timestamp when record expires */
  expiresAt: string;

  /** Response data if completed successfully (sanitized) */
  response?: T;

  /** Error message if failed */
  error?: string;

  /** Canonical hash of request body */
  requestHash: string;

  /** Original response size before truncation (if truncated) */
  originalResponseSize?: number;

  /** Whether response was truncated */
  responseTruncated?: boolean;
};

/**
 * Result of duplicate check
 */
export type DuplicateCheckResult<T = unknown> = {
  /** True if this is a duplicate request */
  isDuplicate: boolean;

  /** Existing record if duplicate */
  record?: IdempotencyRecord<T>;

  /** Whether cache was available */
  cacheAvailable: boolean;
};

/**
 * Options for generating idempotency key
 */
export type IdempotencyKeyOptions = {
  /**
   * Client-provided idempotency key (from X-Idempotency-Key header)
   * Must be UUID v4 format
   */
  clientKey?: string;

  /**
   * Force create new record even if duplicate exists
   * Adds timestamp to key to bypass idempotency check
   */
  bypassIdempotency?: boolean;

  /**
   * Custom nonce to differentiate similar requests
   * Use for scheduled jobs, batch processing, renewals
   */
  nonce?: string;
};

/**
 * Options for idempotency service operations
 */
export type IdempotencyOperationOptions = {
  /** Override default failure mode for this operation */
  failureMode?: CacheFailureMode;

  /** Custom TTL in seconds (overrides action config) */
  ttlSeconds?: number;

  /** Custom lock timeout in ms (overrides action config) */
  lockTimeoutMs?: number;
};

/**
 * Context for idempotency operations
 */
export type IdempotencyContext = {
  workspaceId: string;
  domain: IdempotencyDomain;
  action: string;
  requestBody: unknown;
  options?: IdempotencyKeyOptions;
  operationOptions?: IdempotencyOperationOptions;
};

/**
 * Result of execute with idempotency
 */
export type IdempotencyExecuteResult<T> = {
  /** The result data */
  data: T;

  /** Whether this was a cached response from duplicate */
  fromCache: boolean;

  /** The idempotency key used */
  key: IdempotencyKey;

  /** Whether cache was available during operation */
  cacheAvailable: boolean;
};

/**
 * Stuck PENDING record info for cleanup
 */
export type StuckPendingRecord = {
  key: IdempotencyKey;
  createdAt: string;
  domain: IdempotencyDomain;
  action: string;
  workspaceId: string;
  ageMs: number;
};

/**
 * Idempotency metrics for monitoring
 */
export type IdempotencyMetrics = {
  /** Total duplicate requests detected */
  duplicateCount: number;

  /** Total locks acquired */
  lockAcquiredCount: number;

  /** Total lock failures (already held) */
  lockFailedCount: number;

  /** Total cache errors */
  cacheErrorCount: number;

  /** Total stuck PENDING cleaned up */
  stuckPendingCleanedCount: number;
};

/**
 * Cache storage namespace for idempotency
 * Used for dependency injection
 */
export const IDEMPOTENCY_CACHE_TOKEN = Symbol('IDEMPOTENCY_CACHE_STORAGE');
