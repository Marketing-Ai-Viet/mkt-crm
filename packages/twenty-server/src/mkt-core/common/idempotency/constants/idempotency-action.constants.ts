/**
 * Idempotency Action Constants
 *
 * Định nghĩa các action names sử dụng trong idempotency service.
 * Đảm bảo nhất quán giữa:
 * - IdempotencyService calls
 * - ACTION_CONFIGS trong idempotency.config.ts
 *
 * Format: {domain}:{action} -> được kết hợp trong getActionConfig()
 */

// ============================================
// ORDER DOMAIN ACTIONS
// ============================================

export const IDEMPOTENCY_ORDER_ACTION = {
  /** Tạo đơn hàng mới với items */
  CREATE_ORDER: 'createOrder',

  /** Xác nhận thanh toán đơn hàng */
  CONFIRM_ORDER: 'confirmOrder',

  /** Cập nhật trạng thái đơn hàng */
  UPDATE_ORDER_STATUS: 'updateOrderStatus',

  /** Hoàn tiền đơn hàng */
  REFUND_ORDER: 'refundOrder',
} as const;

export type IdempotencyOrderAction =
  (typeof IDEMPOTENCY_ORDER_ACTION)[keyof typeof IDEMPOTENCY_ORDER_ACTION];

// ============================================
// PAYMENT DOMAIN ACTIONS
// ============================================

export const IDEMPOTENCY_PAYMENT_ACTION = {
  /** Tạo payment record */
  CREATE_PAYMENT: 'createPayment',

  /** Xử lý thanh toán */
  PROCESS_PAYMENT: 'processPayment',

  /** Hoàn tiền payment */
  REFUND_PAYMENT: 'refundPayment',
} as const;

export type IdempotencyPaymentAction =
  (typeof IDEMPOTENCY_PAYMENT_ACTION)[keyof typeof IDEMPOTENCY_PAYMENT_ACTION];

// ============================================
// LICENSE DOMAIN ACTIONS
// ============================================

export const IDEMPOTENCY_LICENSE_ACTION = {
  /** Tạo license mới */
  CREATE_LICENSE: 'createLicense',

  /** Gia hạn license */
  RENEW_LICENSE: 'renewLicense',

  /** Kích hoạt license */
  ACTIVATE_LICENSE: 'activateLicense',
} as const;

export type IdempotencyLicenseAction =
  (typeof IDEMPOTENCY_LICENSE_ACTION)[keyof typeof IDEMPOTENCY_LICENSE_ACTION];

// ============================================
// INVOICE DOMAIN ACTIONS
// ============================================

export const IDEMPOTENCY_INVOICE_ACTION = {
  /** Tạo hóa đơn */
  CREATE_INVOICE: 'createInvoice',

  /** Gửi hóa đơn */
  SEND_INVOICE: 'sendInvoice',
} as const;

export type IdempotencyInvoiceAction =
  (typeof IDEMPOTENCY_INVOICE_ACTION)[keyof typeof IDEMPOTENCY_INVOICE_ACTION];

// ============================================
// ALL ACTIONS (for validation)
// ============================================

export const IDEMPOTENCY_ACTION = {
  ORDER: IDEMPOTENCY_ORDER_ACTION,
  PAYMENT: IDEMPOTENCY_PAYMENT_ACTION,
  LICENSE: IDEMPOTENCY_LICENSE_ACTION,
  INVOICE: IDEMPOTENCY_INVOICE_ACTION,
} as const;
