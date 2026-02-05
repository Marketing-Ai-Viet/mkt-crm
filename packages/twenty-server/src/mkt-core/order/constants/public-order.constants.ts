import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { PAYMENT_TRANSACTION_STATUS } from 'src/mkt-core/payment/constants/payment-status.constants';

// ============================================
// PUBLIC ORDER - ORDER CODE VALIDATION
// ============================================

/**
 * Order code format: PREFIX-YYYYMMDD-SEQUENCE
 * Example: MKT-20250205-000123
 */
export const ORDER_CODE_PATTERN = /^[A-Z]{2,5}-\d{8}-\d{6}$/;

// ============================================
// PUBLIC ORDER - ANTI-ENUMERATION
// ============================================

export const ANTI_ENUMERATION = {
  MIN_DELAY_MS: 50,
  MAX_DELAY_MS: 150,
} as const;

// ============================================
// PUBLIC ORDER - STATUS WHITELISTS
// ============================================

/**
 * Order statuses cho phep hien thi trang thanh toan
 */
export const PAYABLE_ORDER_STATUSES = new Set<ORDER_STATUS>([
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PENDING_PAYMENT,
]);

/**
 * Payment statuses cho phep hien thi trang thanh toan
 */
export const PAYABLE_PAYMENT_STATUSES = new Set<ORDER_PAYMENT_STATUS>([
  ORDER_PAYMENT_STATUS.PENDING,
  ORDER_PAYMENT_STATUS.PARTIAL,
]);

/**
 * Payment transaction statuses duoc coi la "active" (dang cho xu ly)
 */
export const ACTIVE_PAYMENT_TRANSACTION_STATUSES = new Set<string>([
  PAYMENT_TRANSACTION_STATUS.PENDING,
  PAYMENT_TRANSACTION_STATUS.PROCESSING,
]);

// ============================================
// PUBLIC ORDER - ERROR CODES
// ============================================

export const PUBLIC_ORDER_ERROR_CODE = {
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_NOT_PAYABLE: 'ORDER_NOT_PAYABLE',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_ALREADY_COMPLETED: 'ORDER_ALREADY_COMPLETED',
  ORDER_ALREADY_PAID: 'ORDER_ALREADY_PAID',
  ORDER_PAYMENT_VOIDED: 'ORDER_PAYMENT_VOIDED',
  ORDER_PAYMENT_REFUNDED: 'ORDER_PAYMENT_REFUNDED',
  NO_ACTIVE_PAYMENT: 'NO_ACTIVE_PAYMENT',
} as const;

export type PublicOrderErrorCode =
  (typeof PUBLIC_ORDER_ERROR_CODE)[keyof typeof PUBLIC_ORDER_ERROR_CODE];

// ============================================
// PUBLIC ORDER - ERROR MESSAGES
// ============================================

export const PUBLIC_ORDER_ERROR_MESSAGE: Record<PublicOrderErrorCode, string> =
  {
    [PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_FOUND]:
      'Không tìm thấy thông tin thanh toán',
    [PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_PAYABLE]:
      'Đơn hàng chưa sẵn sàng để thanh toán',
    [PUBLIC_ORDER_ERROR_CODE.ORDER_CANCELLED]: 'Đơn hàng đã bị hủy',
    [PUBLIC_ORDER_ERROR_CODE.ORDER_ALREADY_COMPLETED]: 'Đơn hàng đã hoàn tất',
    [PUBLIC_ORDER_ERROR_CODE.ORDER_ALREADY_PAID]: 'Đơn hàng đã được thanh toán',
    [PUBLIC_ORDER_ERROR_CODE.ORDER_PAYMENT_VOIDED]:
      'Thanh toán cho đơn hàng đã bị hủy',
    [PUBLIC_ORDER_ERROR_CODE.ORDER_PAYMENT_REFUNDED]:
      'Đơn hàng đã được hoàn tiền',
    [PUBLIC_ORDER_ERROR_CODE.NO_ACTIVE_PAYMENT]:
      'Không có thông tin thanh toán khả dụng',
  };

// ============================================
// PUBLIC ORDER - STATUS → ERROR MAPPING
// ============================================

/**
 * Map order status -> error code cho cac status KHONG cho phep thanh toan
 */
export const ORDER_STATUS_ERROR_MAP: Partial<
  Record<ORDER_STATUS, PublicOrderErrorCode>
> = {
  [ORDER_STATUS.DRAFT]: PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_PAYABLE,
  [ORDER_STATUS.PROCESSING]: PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_PAYABLE,
  [ORDER_STATUS.CANCELED]: PUBLIC_ORDER_ERROR_CODE.ORDER_CANCELLED,
  [ORDER_STATUS.COMPLETED]: PUBLIC_ORDER_ERROR_CODE.ORDER_ALREADY_COMPLETED,
};

/**
 * Map payment status -> error code cho cac status KHONG cho phep thanh toan
 */
export const PAYMENT_STATUS_ERROR_MAP: Partial<
  Record<ORDER_PAYMENT_STATUS, PublicOrderErrorCode>
> = {
  [ORDER_PAYMENT_STATUS.PAID]: PUBLIC_ORDER_ERROR_CODE.ORDER_ALREADY_PAID,
  [ORDER_PAYMENT_STATUS.OVERPAID]: PUBLIC_ORDER_ERROR_CODE.ORDER_ALREADY_PAID,
};

// ============================================
// PUBLIC ORDER - PII MASKING
// ============================================

export const PII_MASK = {
  EMAIL_VISIBLE_PREFIX: 2,
  PHONE_VISIBLE_SUFFIX: 4,
  MASK_CHAR: '*',
} as const;

// ============================================
// PUBLIC ORDER - DEFAULTS
// ============================================

export const PUBLIC_ORDER_DEFAULTS = {
  CURRENCY: 'VND',
  CUSTOMER_NAME: 'Khách hàng',
  COMPANY_NAME: 'Marketing AI Việt Nam',
} as const;

// ============================================
// PUBLIC ORDER - LOG CONTEXT
// ============================================

export const PUBLIC_ORDER_LOG_CONTEXT = 'OrderPublicService';
