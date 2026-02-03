import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

// ============================================
// ORDER PAYMENT STATUS
// ============================================

/**
 * Order Payment Status - Trạng thái thanh toán của đơn hàng
 *
 * Khác với PAYMENT_TRANSACTION_STATUS (payment module) - trạng thái của từng giao dịch
 *
 * Tính toán từ tổng payments đã CONFIRMED:
 * - PENDING: paidAmount = 0
 * - PARTIAL: 0 < paidAmount < totalAmount
 * - PAID: paidAmount = totalAmount
 * - OVERPAID: paidAmount > totalAmount
 */
export enum ORDER_PAYMENT_STATUS {
  /** Chưa thanh toán */
  PENDING = 'PENDING',

  /** Thanh toán một phần */
  PARTIAL = 'PARTIAL',

  /** Đã thanh toán đủ */
  PAID = 'PAID',

  /** Thanh toán thừa */
  OVERPAID = 'OVERPAID',
}

/**
 * @deprecated Use ORDER_PAYMENT_STATUS instead
 */
export type PAYMENT_STATUS = ORDER_PAYMENT_STATUS;
export const PAYMENT_STATUS = ORDER_PAYMENT_STATUS;

// ============================================
// OPTIONS FOR UI
// ============================================

export const ORDER_PAYMENT_STATUS_OPTIONS = {
  status: ORDER_PAYMENT_STATUS,
  options: [
    {
      value: ORDER_PAYMENT_STATUS.PENDING,
      label: 'Chưa thanh toán',
      color: 'gray' as TagColor,
      position: 0,
    },
    {
      value: ORDER_PAYMENT_STATUS.PARTIAL,
      label: 'Thanh toán một phần',
      color: 'orange' as TagColor,
      position: 1,
    },
    {
      value: ORDER_PAYMENT_STATUS.PAID,
      label: 'Đã thanh toán',
      color: 'green' as TagColor,
      position: 2,
    },
    {
      value: ORDER_PAYMENT_STATUS.OVERPAID,
      label: 'Thanh toán thừa',
      color: 'blue' as TagColor,
      position: 3,
    },
  ],
  labels: {
    EN: {
      PENDING: 'Pending',
      PARTIAL: 'Partial',
      PAID: 'Paid',
      OVERPAID: 'Overpaid',
    },
    VI: {
      PENDING: 'Chưa thanh toán',
      PARTIAL: 'Thanh toán một phần',
      PAID: 'Đã thanh toán',
      OVERPAID: 'Thanh toán thừa',
    },
  },
};

/**
 * @deprecated Use ORDER_PAYMENT_STATUS_OPTIONS instead
 */
export const PAYMENT_STATUS_OPTIONS = ORDER_PAYMENT_STATUS_OPTIONS;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if order payment status allows license creation
 */
export const IS_ORDER_PAYMENT_COMPLETE = (
  status: ORDER_PAYMENT_STATUS,
): boolean =>
  status === ORDER_PAYMENT_STATUS.PAID ||
  status === ORDER_PAYMENT_STATUS.OVERPAID;

/**
 * @deprecated Use IS_ORDER_PAYMENT_COMPLETE instead
 */
export const IS_PAYMENT_COMPLETE = IS_ORDER_PAYMENT_COMPLETE;

/**
 * Check if order has any payment
 */
export const HAS_ORDER_PAYMENT = (status: ORDER_PAYMENT_STATUS): boolean =>
  status !== ORDER_PAYMENT_STATUS.PENDING;

/**
 * @deprecated Use HAS_ORDER_PAYMENT instead
 */
export const HAS_PAYMENT = HAS_ORDER_PAYMENT;
