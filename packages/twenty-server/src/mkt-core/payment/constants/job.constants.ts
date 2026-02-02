/**
 * Payment Job Constants
 *
 * Constants for BullMQ job processing in Payment module.
 */

/**
 * Payment job names
 */
export const PAYMENT_JOB_NAMES = {
  VA_EXPIRATION_SCAN: 'va-expiration-scan',
  WEBHOOK_RETRY: 'webhook-retry',
} as const;

export type PaymentJobName =
  (typeof PAYMENT_JOB_NAMES)[keyof typeof PAYMENT_JOB_NAMES];

/**
 * Cron patterns for scheduled jobs
 */
export const PAYMENT_JOB_CRON = {
  /** Every 15 minutes for VA expiration scan */
  VA_EXPIRATION_SCAN: '0 */15 * * * *',
  /** Every 5 minutes for webhook retry */
  WEBHOOK_RETRY: '0 */5 * * * *',
} as const;

/**
 * Job configuration defaults
 */
export const PAYMENT_JOB_CONFIG = {
  /** Maximum retry attempts for webhook */
  MAX_WEBHOOK_RETRIES: 5,
  /** Batch size for VA expiration scan */
  VA_EXPIRATION_BATCH_SIZE: 100,
  /** Batch size for webhook retry */
  WEBHOOK_RETRY_BATCH_SIZE: 50,
} as const;

/**
 * Environment variable keys for job configuration
 */
export const PAYMENT_JOB_ENV_KEYS = {
  VA_EXPIRATION_SCAN_ENABLED: 'VA_EXPIRATION_SCAN_ENABLED',
  WEBHOOK_RETRY_ENABLED: 'WEBHOOK_RETRY_ENABLED',
} as const;
