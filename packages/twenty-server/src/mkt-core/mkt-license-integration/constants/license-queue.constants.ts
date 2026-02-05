/**
 * License Queue Configuration
 *
 * BullMQ native configuration for license processing jobs.
 * Includes worker settings, retry strategies, and timeouts.
 */

// ============================================
// QUEUE NAME
// ============================================

export const LICENSE_QUEUE_NAME = 'license-queue';

// ============================================
// WORKER CONFIGURATION
// ============================================

export const LICENSE_WORKER_CONFIG = {
  /** Number of jobs to process concurrently */
  concurrency: 5,

  /** Rate limiter to prevent API overload */
  limiter: {
    /** Maximum jobs per duration */
    max: 10,
    /** Duration in milliseconds */
    duration: 1000, // 10 jobs per second max
  },
} as const;

// ============================================
// JOB OPTIONS - BullMQ Native
// ============================================

/**
 * Job options for license creation.
 *
 * - 5 attempts với exponential backoff: 2s → 4s → 8s → 16s → 32s
 * - 30s timeout per job
 * - Keep completed jobs for 1 hour (debugging)
 * - Keep failed jobs permanently (manual review)
 */
export const LICENSE_CREATION_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 2000, // 2 seconds initial delay
  },
  timeout: 30000, // 30 seconds
  removeOnComplete: {
    age: 3600, // 1 hour
    count: 1000, // Keep last 1000
  },
  removeOnFail: false, // Keep for debugging
} as const;

/**
 * Job options for license upgrade.
 *
 * Same as creation - upgrade is a critical operation.
 */
export const LICENSE_UPGRADE_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  timeout: 30000,
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: false,
} as const;

/**
 * Job options for license activation.
 *
 * - 10 attempts (more retries since activation is critical)
 * - Exponential backoff starting at 1s
 * - 15s timeout (activation is fast)
 */
export const LICENSE_ACTIVATION_JOB_OPTIONS = {
  attempts: 10,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // 1 second initial delay
  },
  timeout: 15000, // 15 seconds
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: false,
} as const;

/**
 * Job options for license revocation.
 *
 * - 3 attempts (revocation is best effort)
 * - Fixed backoff (simple retry)
 * - 15s timeout
 */
export const LICENSE_REVOCATION_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'fixed' as const,
    delay: 5000, // 5 seconds fixed delay
  },
  timeout: 15000,
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: false,
} as const;

// ============================================
// AGGREGATED CONFIG
// ============================================

export const LICENSE_QUEUE_CONFIG = {
  QUEUE_NAME: LICENSE_QUEUE_NAME,

  WORKER: LICENSE_WORKER_CONFIG,

  JOB_OPTIONS: {
    CREATION: LICENSE_CREATION_JOB_OPTIONS,
    UPGRADE: LICENSE_UPGRADE_JOB_OPTIONS,
    ACTIVATION: LICENSE_ACTIVATION_JOB_OPTIONS,
    REVOCATION: LICENSE_REVOCATION_JOB_OPTIONS,
  },

  TIMEOUTS: {
    /** API call timeout (should be less than job timeout) */
    API_CALL: 25000, // 25 seconds
    /** Default job processing timeout */
    JOB_PROCESSING: 30000, // 30 seconds
  },
} as const;

// ============================================
// ENVIRONMENT VARIABLE DEFAULTS
// ============================================

/**
 * Default values for environment variables.
 * Can be overridden via .env file.
 */
export const LICENSE_QUEUE_ENV_DEFAULTS = {
  /** Enable async license creation */
  USE_ASYNC_LICENSE_CREATION: true,
  /** Worker concurrency */
  LICENSE_QUEUE_CONCURRENCY: 5,
  /** Rate limit max */
  LICENSE_QUEUE_RATE_LIMIT_MAX: 10,
  /** Rate limit duration (ms) */
  LICENSE_QUEUE_RATE_LIMIT_DURATION: 1000,
  /** Job timeout (ms) */
  LICENSE_JOB_TIMEOUT: 30000,
  /** API call timeout (ms) */
  LICENSE_API_TIMEOUT: 25000,
  /** Creation job attempts */
  LICENSE_JOB_CREATION_ATTEMPTS: 5,
  /** Activation job attempts */
  LICENSE_JOB_ACTIVATION_ATTEMPTS: 10,
  /** Revocation job attempts */
  LICENSE_JOB_REVOCATION_ATTEMPTS: 3,
} as const;

// ============================================
// TYPE EXPORTS
// ============================================

export type LicenseQueueConfig = typeof LICENSE_QUEUE_CONFIG;
export type LicenseWorkerConfig = typeof LICENSE_WORKER_CONFIG;
export type LicenseJobOptions =
  | typeof LICENSE_CREATION_JOB_OPTIONS
  | typeof LICENSE_UPGRADE_JOB_OPTIONS
  | typeof LICENSE_ACTIVATION_JOB_OPTIONS
  | typeof LICENSE_REVOCATION_JOB_OPTIONS;
