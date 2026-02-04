/**
 * Payment Reminder Types
 *
 * Internal type definitions for payment reminder service.
 */

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { PaymentReminderErrorCode } from 'src/mkt-core/order/constants/payment-reminder.constants';

// ============================================
// CONTEXT TYPES
// ============================================

/**
 * Workspace context for payment reminder operations
 */
export type PaymentReminderContext = {
  workspaceId: string;
  userId: string;
  userLevel?: number;
};

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Result of order validation for reminder
 */
export type OrderValidationResult = {
  valid: boolean;
  errorCode?: PaymentReminderErrorCode;
  errorContext?: Record<string, unknown>;
};

// ============================================
// EMAIL DATA TYPES
// ============================================

/**
 * Data for building reminder email template
 */
export type ReminderEmailData = {
  customer_name: string;
  order_code: string;
  total_amount: string;
  paid_amount: string;
  remaining_amount: string;
  payment_deadline: string;
  days_overdue: number;
  payment_url?: string;
  qr_code_url?: string;
  company_name: string;
  support_email: string;
  reminder_count: number;
  custom_note?: string;
};

// ============================================
// IDEMPOTENCY TYPES
// ============================================

/**
 * Result of idempotency check
 */
export type IdempotencyCheckResult<T> = {
  isDuplicate: boolean;
  previousResult?: T;
};

// ============================================
// FILTER TYPES (Internal)
// ============================================

/**
 * Internal filter options for querying orders
 */
export type PaymentReminderFilterOptions = {
  status?: ORDER_STATUS;
  paymentStatus?: ORDER_PAYMENT_STATUS;
  daysPastDeadline?: number;
  maxRemindersSent?: number;
  excludeConfirmed?: boolean;
};

// ============================================
// SEND OPTIONS TYPES
// ============================================

/**
 * Options for sending a single reminder
 */
export type SendReminderOptions = {
  orderId: string;
  idempotencyKey?: string;
  templateKey?: string;
  note?: string;
  forceResend?: boolean;
};

/**
 * Options for sending bulk reminders
 */
export type SendBulkReminderOptions = {
  orderIds?: string[];
  filter?: PaymentReminderFilterOptions;
  templateKey?: string;
  dryRun?: boolean;
};

// ============================================
// RESULT TYPES (Internal)
// ============================================

/**
 * Internal result for single reminder send
 */
export type SendReminderResult = {
  orderId: string;
  orderCode?: string;
  customerEmail?: string;
  sentAt?: string;
  reminderCount: number;
  previousReminderCount: number;
};

/**
 * Internal result item for bulk reminder
 */
export type BulkReminderResultItem = {
  orderId: string;
  orderCode?: string;
  sent: boolean;
  skipped: boolean;
  skipReason?: string;
  sentAt?: string;
};

/**
 * Internal result for bulk reminder send
 */
export type SendBulkReminderResult = {
  totalProcessed: number;
  totalSent: number;
  totalSkipped: number;
  totalFailed: number;
  isDryRun: boolean;
  results: BulkReminderResultItem[];
};

// ============================================
// QUERY RESULT TYPES
// ============================================

/**
 * Order data for reminder query
 */
export type OrderNeedingReminder = {
  id: string;
  orderCode: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentDeadline?: string;
  remindersSent: number;
  lastReminderAt?: string;
  daysPastDeadline: number;
  status: ORDER_STATUS;
  paymentStatus: ORDER_PAYMENT_STATUS;
  canSendReminder: boolean;
};

/**
 * Paginated result for orders needing reminder
 */
export type PaginatedOrdersNeedingReminder = {
  orders: OrderNeedingReminder[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
};

// ============================================
// SKIP REASONS
// ============================================

/**
 * Reasons for skipping an order in bulk send
 */
export const SKIP_REASON = {
  DRY_RUN: 'DRY_RUN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EMAIL_FAILED: 'EMAIL_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type SkipReason = (typeof SKIP_REASON)[keyof typeof SKIP_REASON];
