import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

// ============================================
// PAYMENT TRANSACTION STATUS
// ============================================

/**
 * Payment Transaction Status - Trạng thái của từng giao dịch thanh toán
 *
 * Khác với PAYMENT_STATUS (order module) - trạng thái thanh toán của đơn hàng
 *
 * Status flow:
 * PENDING → PROCESSING → CONFIRMED → (REFUNDED | PARTIALLY_REFUNDED)
 * PENDING → REJECTED
 * PENDING → FAILED
 * PENDING → CANCELLED
 */
export const PAYMENT_TRANSACTION_STATUS = {
  /** Giao dịch đang chờ xử lý */
  PENDING: 'PENDING',

  /** Giao dịch đang được xử lý */
  PROCESSING: 'PROCESSING',

  /** Giao dịch đã xác nhận thành công */
  CONFIRMED: 'CONFIRMED',

  /** Giao dịch thất bại */
  FAILED: 'FAILED',

  /** Giao dịch bị từ chối */
  REJECTED: 'REJECTED',

  /** Giao dịch đã hoàn tiền toàn bộ */
  REFUNDED: 'REFUNDED',

  /** Giao dịch đã hoàn tiền một phần */
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',

  /** Giao dịch đã hủy */
  CANCELLED: 'CANCELLED',
} as const;

export type PaymentTransactionStatus =
  (typeof PAYMENT_TRANSACTION_STATUS)[keyof typeof PAYMENT_TRANSACTION_STATUS];

// ============================================
// OPTIONS FOR UI
// ============================================

export const PAYMENT_TRANSACTION_STATUS_OPTIONS = [
  {
    value: PAYMENT_TRANSACTION_STATUS.PENDING,
    label: 'Chờ xử lý',
    position: 0,
    color: 'orange' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.PROCESSING,
    label: 'Đang xử lý',
    position: 1,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    label: 'Đã xác nhận',
    position: 2,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.REJECTED,
    label: 'Từ chối',
    position: 3,
    color: 'red' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.FAILED,
    label: 'Thất bại',
    position: 4,
    color: 'red' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.REFUNDED,
    label: 'Đã hoàn tiền',
    position: 5,
    color: 'purple' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED,
    label: 'Hoàn tiền một phần',
    position: 6,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_TRANSACTION_STATUS.CANCELLED,
    label: 'Đã hủy',
    position: 7,
    color: 'gray' as TagColor,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if transaction is successful (can count towards order paid amount)
 */
export const IS_TRANSACTION_SUCCESSFUL = (
  status: PaymentTransactionStatus,
): boolean => status === PAYMENT_TRANSACTION_STATUS.CONFIRMED;

/**
 * Final transaction statuses (cannot be changed)
 */
const FINAL_TRANSACTION_STATUSES: PaymentTransactionStatus[] = [
  PAYMENT_TRANSACTION_STATUS.CONFIRMED,
  PAYMENT_TRANSACTION_STATUS.FAILED,
  PAYMENT_TRANSACTION_STATUS.REJECTED,
  PAYMENT_TRANSACTION_STATUS.REFUNDED,
  PAYMENT_TRANSACTION_STATUS.CANCELLED,
];

/**
 * Check if transaction is in final state (cannot be changed)
 */
export const IS_TRANSACTION_FINAL = (
  status: PaymentTransactionStatus,
): boolean => FINAL_TRANSACTION_STATUSES.includes(status);
