/**
 * Payment status types
 */
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL' // Partial payment received
  | 'OVERPAID' // More than expected amount
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED';

/**
 * Payment status constants
 */
export const MKT_PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  OVERPAID: 'OVERPAID',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  EXPIRED: 'EXPIRED',
} as const;

/**
 * Order payment status for tracking payment progress
 */
export type OrderPaymentStatus =
  | 'UNPAID'
  | 'PARTIAL_PAID'
  | 'FULLY_PAID'
  | 'OVERPAID'
  | 'REFUNDED';

/**
 * Order payment status constants
 */
export const ORDER_PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PARTIAL_PAID: 'PARTIAL_PAID',
  FULLY_PAID: 'FULLY_PAID',
  OVERPAID: 'OVERPAID',
  REFUNDED: 'REFUNDED',
} as const;
