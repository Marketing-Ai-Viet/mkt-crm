import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

// ============================================
// PAYMENT STATUS
// ============================================

/**
 * Payment Status - Trạng thái thanh toán của đơn hàng
 *
 * Tính toán từ tổng payments đã CONFIRMED:
 * - PENDING: paidAmount = 0
 * - PARTIAL: 0 < paidAmount < totalAmount
 * - PAID: paidAmount = totalAmount
 * - OVERPAID: paidAmount > totalAmount
 */
export enum PAYMENT_STATUS {
  /** Chưa thanh toán */
  PENDING = 'PENDING',

  /** Thanh toán một phần */
  PARTIAL = 'PARTIAL',

  /** Đã thanh toán đủ */
  PAID = 'PAID',

  /** Thanh toán thừa */
  OVERPAID = 'OVERPAID',
}

export const PAYMENT_STATUS_OPTIONS = {
  status: PAYMENT_STATUS,
  options: [
    {
      value: PAYMENT_STATUS.PENDING,
      label: 'Chưa thanh toán',
      color: 'gray' as TagColor,
      position: 0,
    },
    {
      value: PAYMENT_STATUS.PARTIAL,
      label: 'Thanh toán một phần',
      color: 'orange' as TagColor,
      position: 1,
    },
    {
      value: PAYMENT_STATUS.PAID,
      label: 'Đã thanh toán',
      color: 'green' as TagColor,
      position: 2,
    },
    {
      value: PAYMENT_STATUS.OVERPAID,
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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if payment status allows license creation
 */
export const IS_PAYMENT_COMPLETE = (status: PAYMENT_STATUS): boolean =>
  status === PAYMENT_STATUS.PAID || status === PAYMENT_STATUS.OVERPAID;

/**
 * Check if order has any payment
 */
export const HAS_PAYMENT = (status: PAYMENT_STATUS): boolean =>
  status !== PAYMENT_STATUS.PENDING;
