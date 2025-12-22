/**
 * Idempotency Types for Order Operations
 *
 * Provides types and configuration for idempotent order processing.
 * Prevents duplicate order creation when clients retry requests.
 */

/**
 * Idempotency key format:
 * - Client-provided: Use X-Idempotency-Key header
 * - Auto-generated: Hash of (workspaceId + action + requestBody)
 */
export type IdempotencyKey = string;

/**
 * Status of idempotency record
 */
export type IdempotencyStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

/**
 * Stored idempotency record in Redis
 */
export type IdempotencyRecord<T = unknown> = {
  /** Unique idempotency key */
  key: IdempotencyKey;
  /** Current processing status */
  status: IdempotencyStatus;
  /** ISO timestamp when record was created */
  createdAt: string;
  /** ISO timestamp when processing completed */
  completedAt?: string;
  /** Response data if completed successfully */
  response?: T;
  /** Error message if failed */
  error?: string;
  /** SHA-256 hash of request body (first 16 chars) */
  requestHash: string;
};

/**
 * Result of duplicate check
 */
export type DuplicateCheckResult<T = unknown> = {
  /** True if this is a duplicate request */
  isDuplicate: boolean;
  /** Existing record if duplicate */
  record?: IdempotencyRecord<T>;
};

/**
 * Idempotency configuration constants
 */
export const IDEMPOTENCY_CONFIG = {
  /** TTL for idempotency records (24 hours in seconds) */
  TTL_SECONDS: 86400,

  /** Lock timeout for in-progress operations (5 minutes in ms) */
  LOCK_TIMEOUT_MS: 300000,

  /** Redis key prefix for idempotency records */
  KEY_PREFIX: 'idempotency',

  /** Redis key prefix for locks */
  LOCK_PREFIX: 'idempotency_lock',
} as const;

/**
 * Type for IDEMPOTENCY_CONFIG
 */
export type IdempotencyConfig = typeof IDEMPOTENCY_CONFIG;
