/**
 * Payment Deadline Constants
 *
 * Configuration cho new payment flow:
 * - DRAFT → CONFIRMED → PROCESSING → COMPLETED | LOCKED
 */

// ============================================
// PAYMENT DEADLINE SOURCE
// ============================================

/**
 * Source of payment deadline configuration
 * Priority: MANUAL > RESELLER_TIER > CUSTOMER_TYPE > PRODUCT > GLOBAL
 */
export const PAYMENT_DEADLINE_SOURCE = {
  /** Global setting from environment */
  GLOBAL: 'GLOBAL',
  /** Product-specific deadline */
  PRODUCT: 'PRODUCT',
  /** Customer type-based deadline */
  CUSTOMER_TYPE: 'CUSTOMER_TYPE',
  /** Reseller tier-based deadline */
  RESELLER_TIER: 'RESELLER_TIER',
  /** Manual override by sales/admin */
  MANUAL: 'MANUAL',
} as const;

export type PaymentDeadlineSourceType =
  (typeof PAYMENT_DEADLINE_SOURCE)[keyof typeof PAYMENT_DEADLINE_SOURCE];

// ============================================
// PAYMENT DEADLINE CONFIG
// ============================================

export const PAYMENT_DEADLINE_CONFIG = {
  /** Default payment deadline in hours */
  DEFAULT_HOURS: 24,

  /** Reminder schedule (hours before deadline) */
  REMINDER_SCHEDULE: [6, 2, 0.5] as const,

  /** Cronjob interval for overdue check */
  CHECK_INTERVAL_CRON: '0 * * * * *', // Every minute

  /** Max reminders to send */
  MAX_REMINDERS: 3,

  /** Min deadline hours (1 hour) */
  MIN_HOURS: 1,

  /** Max deadline hours (30 days = 720 hours) */
  MAX_HOURS: 720,
} as const;

// ============================================
// PAYMENT DEADLINE BY CUSTOMER TYPE
// ============================================

/**
 * Payment deadline by customer type (hours)
 */
export const PAYMENT_DEADLINE_BY_CUSTOMER_TYPE: Record<string, number> = {
  VIP: 72, // 3 days
  ENTERPRISE: 48, // 2 days
  STANDARD: 24, // 1 day
} as const;

// ============================================
// PAYMENT DEADLINE BY RESELLER TIER
// ============================================

/**
 * Payment deadline by reseller tier (hours)
 */
export const PAYMENT_DEADLINE_BY_RESELLER_TIER: Record<string, number> = {
  DIAMOND: 168, // 7 days
  GOLD: 120, // 5 days
  SILVER: 72, // 3 days
  BRONZE: 48, // 2 days
} as const;

// ============================================
// REMINDER TYPES
// ============================================

export const PAYMENT_REMINDER_TYPE = {
  /** 6 hours before deadline */
  FIRST_REMINDER: 'FIRST_REMINDER',
  /** 2 hours before deadline */
  SECOND_REMINDER: 'SECOND_REMINDER',
  /** 30 minutes before deadline */
  URGENT_REMINDER: 'URGENT_REMINDER',
} as const;

export type PaymentReminderTypeValue =
  (typeof PAYMENT_REMINDER_TYPE)[keyof typeof PAYMENT_REMINDER_TYPE];

/**
 * Get reminder type based on hours before deadline
 * Note: This is a utility function, not a constant, so it's defined in utils
 */
export const REMINDER_TYPE_THRESHOLDS = {
  FIRST: 6, // >= 6 hours → FIRST_REMINDER
  SECOND: 2, // >= 2 hours → SECOND_REMINDER
  // < 2 hours → URGENT_REMINDER
} as const;

// ============================================
// JOB NAMES
// ============================================

export const ORDER_PAYMENT_QUEUE = 'order-payment-queue';

export const PAYMENT_DEADLINE_JOB = {
  /** Check single order deadline */
  DEADLINE_CHECK: 'payment-deadline-check',
  /** Send payment reminder */
  REMINDER: 'payment-reminder',
  /** Scan all overdue orders */
  OVERDUE_SCAN: 'payment-overdue-scan',
} as const;

// ============================================
// JOB ID GENERATORS
// ============================================

/**
 * Generate job ID for payment deadline check
 */
export const GET_DEADLINE_CHECK_JOB_ID = (orderId: string): string =>
  `deadline-check-${orderId}`;

/**
 * Generate job ID for payment reminder
 */
export const GET_REMINDER_JOB_ID = (
  orderId: string,
  hoursBeforeDeadline: number,
): string => `reminder-${orderId}-${hoursBeforeDeadline}`;

// ============================================
// VALID STATUS TRANSITIONS (New Flow)
// ============================================

/**
 * Valid status transitions for new payment flow
 *
 * Flow:
 * DRAFT → CONFIRMED → PROCESSING → COMPLETED | LOCKED
 * LOCKED → COMPLETED (after late payment)
 */
export const VALID_STATUS_TRANSITIONS_NEW_FLOW: Record<
  string,
  readonly string[]
> = {
  DRAFT: ['CONFIRMED', 'TRIAL', 'CANCELED'],
  CONFIRMED: ['PROCESSING', 'CANCELED'],
  PROCESSING: ['COMPLETED', 'LOCKED', 'CANCELED', 'REFUND', 'REFUND_PARTIAL'],
  LOCKED: ['COMPLETED', 'CANCELED'],
  COMPLETED: ['REFUND', 'REFUND_PARTIAL'],
  TRIAL: ['TRIAL_EXPIRED', 'PENDING_PAYMENT', 'CANCELED'],
  TRIAL_EXPIRED: ['PENDING_PAYMENT', 'CANCELED'],
  CANCELED: [],
  REFUND: [],
  REFUND_PARTIAL: [],
} as const;
