/**
 * Payment Reminder Constants
 *
 * Configuration for manual payment reminder email feature.
 * Sync with PAYMENT_DEADLINE_CONFIG for shared values (MAX_REMINDERS).
 */

import { Duration } from 'luxon';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { PAYMENT_DEADLINE_CONFIG } from 'src/mkt-core/order/constants/payment-deadline.constants';

// ============================================
// ERROR CODES
// ============================================

export const PAYMENT_REMINDER_ERROR_CODE = {
  // Order errors
  ORDER_NOT_FOUND: 'PAYMENT_REMINDER_ORDER_NOT_FOUND',
  INVALID_ORDER_STATUS: 'PAYMENT_REMINDER_INVALID_ORDER_STATUS',
  PAYMENT_ALREADY_COMPLETE: 'PAYMENT_REMINDER_PAYMENT_ALREADY_COMPLETE',
  ORDER_ALREADY_CONFIRMED: 'PAYMENT_REMINDER_ORDER_ALREADY_CONFIRMED',

  // Customer errors
  NO_CUSTOMER_EMAIL: 'PAYMENT_REMINDER_NO_CUSTOMER_EMAIL',

  // Rate limiting errors
  MAX_REMINDERS_REACHED: 'PAYMENT_REMINDER_MAX_REMINDERS_REACHED',
  REMINDER_TOO_SOON: 'PAYMENT_REMINDER_REMINDER_TOO_SOON',

  // Idempotency errors
  DUPLICATE_REQUEST: 'PAYMENT_REMINDER_DUPLICATE_REQUEST',

  // Template errors
  TEMPLATE_NOT_FOUND: 'PAYMENT_REMINDER_TEMPLATE_NOT_FOUND',

  // System errors
  EMAIL_QUEUE_FAILED: 'PAYMENT_REMINDER_EMAIL_QUEUE_FAILED',

  // Bulk errors
  BULK_LIMIT_EXCEEDED: 'PAYMENT_REMINDER_BULK_LIMIT_EXCEEDED',
  NO_ORDERS_TO_PROCESS: 'PAYMENT_REMINDER_NO_ORDERS_TO_PROCESS',
} as const;

export type PaymentReminderErrorCode =
  (typeof PAYMENT_REMINDER_ERROR_CODE)[keyof typeof PAYMENT_REMINDER_ERROR_CODE];

// ============================================
// SUPPORTED LOCALES
// ============================================

export const PAYMENT_REMINDER_LOCALES = ['vi', 'en'] as const;

export type PaymentReminderLocale = (typeof PAYMENT_REMINDER_LOCALES)[number];

// ============================================
// VALIDATION CONFIG
// ============================================

/**
 * Valid order statuses for payment reminder
 * Only PROCESSING orders can receive reminders (new payment flow)
 */
export const VALID_ORDER_STATUSES_FOR_REMINDER = [
  ORDER_STATUS.PROCESSING,
] as const;

/**
 * Valid payment statuses for payment reminder
 * Only PENDING or PARTIAL payment orders need reminders
 */
export const VALID_PAYMENT_STATUSES_FOR_REMINDER = [
  ORDER_PAYMENT_STATUS.PENDING,
  ORDER_PAYMENT_STATUS.PARTIAL,
] as const;

// ============================================
// MAIN CONFIG
// ============================================

export const PAYMENT_REMINDER_CONFIG = {
  // ============================================
  // VALIDATION RULES
  // ============================================

  /** Order phải ở trạng thái PROCESSING (new payment flow) */
  VALID_ORDER_STATUSES: VALID_ORDER_STATUSES_FOR_REMINDER,

  /** Payment status phải chưa hoàn thành */
  VALID_PAYMENT_STATUSES: VALID_PAYMENT_STATUSES_FOR_REMINDER,

  /** Giới hạn số reminder (sync with PAYMENT_DEADLINE_CONFIG.MAX_REMINDERS) */
  MAX_REMINDERS: PAYMENT_DEADLINE_CONFIG.MAX_REMINDERS,

  /** Khoảng cách tối thiểu giữa các reminder (4 hours) */
  MIN_INTERVAL_HOURS: 4,

  /** Duration object cho MIN_INTERVAL */
  get MIN_INTERVAL(): Duration {
    return Duration.fromObject({ hours: this.MIN_INTERVAL_HOURS });
  },

  // ============================================
  // BULK LIMITS
  // ============================================

  /** Max orders per bulk request */
  BULK_LIMIT: 50,

  // ============================================
  // TEMPLATE
  // ============================================

  /** Default template key */
  DEFAULT_TEMPLATE_KEY: 'payment_reminder',

  /** Supported locales */
  SUPPORTED_LOCALES: PAYMENT_REMINDER_LOCALES,

  /** Default locale */
  DEFAULT_LOCALE: 'vi' as PaymentReminderLocale,

  // ============================================
  // INPUT VALIDATION
  // ============================================

  /** Max note length (sanitized) */
  MAX_NOTE_LENGTH: 500,

  /** Idempotency key TTL (seconds) - 1 hour */
  IDEMPOTENCY_TTL_SECONDS: 3600,

  // ============================================
  // CACHE KEYS
  // ============================================

  /** Cache key prefix for idempotency */
  IDEMPOTENCY_KEY_PREFIX: 'payment-reminder',
} as const;

// ============================================
// ERROR MESSAGES
// ============================================

export const PAYMENT_REMINDER_ERROR_MESSAGES: Record<
  PaymentReminderErrorCode,
  string
> = {
  [PAYMENT_REMINDER_ERROR_CODE.ORDER_NOT_FOUND]: 'Order not found',
  [PAYMENT_REMINDER_ERROR_CODE.INVALID_ORDER_STATUS]:
    'Order status is not valid for reminder. Only PROCESSING orders can receive reminders.',
  [PAYMENT_REMINDER_ERROR_CODE.PAYMENT_ALREADY_COMPLETE]:
    'Payment is already complete. No reminder needed.',
  [PAYMENT_REMINDER_ERROR_CODE.ORDER_ALREADY_CONFIRMED]:
    'Order payment has already been confirmed by sale or accounting.',
  [PAYMENT_REMINDER_ERROR_CODE.NO_CUSTOMER_EMAIL]:
    'Customer has no email address.',
  [PAYMENT_REMINDER_ERROR_CODE.MAX_REMINDERS_REACHED]:
    'Maximum number of reminders has been reached.',
  [PAYMENT_REMINDER_ERROR_CODE.REMINDER_TOO_SOON]:
    'Reminder sent too recently. Please wait before sending another.',
  [PAYMENT_REMINDER_ERROR_CODE.DUPLICATE_REQUEST]:
    'Duplicate request detected. This reminder has already been sent.',
  [PAYMENT_REMINDER_ERROR_CODE.TEMPLATE_NOT_FOUND]: 'Email template not found.',
  [PAYMENT_REMINDER_ERROR_CODE.EMAIL_QUEUE_FAILED]:
    'Failed to queue reminder email.',
  [PAYMENT_REMINDER_ERROR_CODE.BULK_LIMIT_EXCEEDED]:
    'Bulk request exceeds maximum allowed orders.',
  [PAYMENT_REMINDER_ERROR_CODE.NO_ORDERS_TO_PROCESS]:
    'No orders match the specified criteria.',
};

/**
 * Get error message for error code
 */
export const GET_PAYMENT_REMINDER_ERROR_MESSAGE = (
  code: PaymentReminderErrorCode,
): string => {
  return PAYMENT_REMINDER_ERROR_MESSAGES[code] ?? 'Unknown error';
};
