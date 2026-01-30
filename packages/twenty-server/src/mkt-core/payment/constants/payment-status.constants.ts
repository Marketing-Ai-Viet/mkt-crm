import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Payment Transaction Status
 *
 * Status flow:
 * PENDING → CONFIRMED → (REFUNDED | PARTIALLY_REFUNDED)
 * PENDING → REJECTED
 * PENDING → FAILED
 * PENDING → CANCELLED
 *
 * Note: COMPLETED is kept for backward compatibility, prefer CONFIRMED for new code
 */
export const PAYMENT_TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED', // Legacy status, use CONFIRMED for new code
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;

export type PaymentTransactionStatus =
  (typeof PAYMENT_TRANSACTION_STATUS)[keyof typeof PAYMENT_TRANSACTION_STATUS];

export const PAYMENT_STATUS_OPTIONS = [
  {
    value: PAYMENT_TRANSACTION_STATUS.PENDING,
    label: 'Pending',
    position: 0,
    color: 'orange' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.PROCESSING,
    label: 'Processing',
    position: 1,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    label: 'Confirmed',
    position: 2,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.COMPLETED,
    label: 'Completed',
    position: 3,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.REJECTED,
    label: 'Rejected',
    position: 4,
    color: 'red' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.FAILED,
    label: 'Failed',
    position: 5,
    color: 'red' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.REFUNDED,
    label: 'Refunded',
    position: 6,
    color: 'purple' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED,
    label: 'Partially Refunded',
    position: 7,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.CANCELLED,
    label: 'Cancelled',
    position: 8,
    color: 'gray' as TagColor,
  },
];
