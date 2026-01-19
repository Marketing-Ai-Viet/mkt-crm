/**
 * Delayed Job Queue Constants
 *
 * Định nghĩa các queue names cho delayed jobs trong mkt-core
 */

export const MKT_DELAYED_JOB_QUEUES = {
  ORDER_OVERDUE: 'mkt-order-overdue-queue',
  PAYMENT_REMINDER: 'mkt-payment-reminder-queue',
  PAYMENT_DEADLINE: 'mkt-payment-deadline-queue',
} as const;

export type MktDelayedJobQueue =
  (typeof MKT_DELAYED_JOB_QUEUES)[keyof typeof MKT_DELAYED_JOB_QUEUES];

/**
 * Default configuration cho delayed jobs
 */
export const DELAYED_JOB_DEFAULTS = {
  // Retry configuration
  RETRY_ATTEMPTS: 3,
  BACKOFF_TYPE: 'exponential' as const,
  BACKOFF_DELAY_MS: 5000, // 5 seconds base delay

  // Job cleanup
  REMOVE_ON_COMPLETE: true,
  REMOVE_ON_FAIL_COUNT: 100,
} as const;
