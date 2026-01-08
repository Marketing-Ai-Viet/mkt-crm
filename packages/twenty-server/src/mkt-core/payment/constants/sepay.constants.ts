import { PaymentMethodType } from 'src/mkt-core/payment-method/types';

/**
 * SEPay Payment Method Constants
 * Used for identifying SEPay/QR Code payment methods
 */

// Payment method type for QR Code payments (SEPay)
export const SEPAY_PAYMENT_METHOD_TYPE: PaymentMethodType = 'QR_CODE';

// SEPay payment method name (for backward compatibility)
export const SEPAY_PAYMENT_METHOD_NAME = 'SEPay QR';

// Default QR code expiry duration in seconds (5 minutes)
export const SEPAY_DEFAULT_DURATION = 300;

// SEPay QR code URL template
export const SEPAY_QR_URL_TEMPLATE =
  'https://qr.sepay.vn/img?acc={acc}&bank={bank}&amount={amount}&des={va} {orderCode}&template=qronly&download=false';

// Environment variable keys
export const SEPAY_ENV_KEYS = {
  ACCOUNT: 'SEPAY_ACC',
  BANK: 'SEPAY_BANK',
  VA: 'SEPAY_VA',
  WEBHOOK_API_KEY: 'SEPAY_WEBHOOK_API_KEY',
  WORKSPACE_ID: 'SEPAY_WORKSPACE_ID',
  AUTH_ENABLED: 'SEPAY_AUTH_ENABLED',
} as const;

// Webhook response messages
export const SEPAY_WEBHOOK_MESSAGES = {
  ALREADY_PROCESSED: 'Transaction already processed',
  ORDER_NOT_FOUND: 'Order not found',
  AMOUNT_MISMATCH: 'Amount mismatch',
  SUCCESS: 'Payment processed successfully',
  PARTIAL: 'Partial payment received',
  NO_PAYMENT: 'No payment found for order',
} as const;

// Webhook response status types
export type SepayWebhookStatus =
  | 'MATCHED'
  | 'UNMATCHED'
  | 'PARTIAL'
  | 'ALREADY_PROCESSED'
  | 'NO_PAYMENT';

// Payment page template defaults
export const SEPAY_TEMPLATE_DEFAULTS = {
  COMPANY_NAME: 'MKT CRM',
  DEFAULT_CUSTOMER_NAME: 'Khách hàng',
  DEFAULT_EXPIRY_TEXT: '" - trong vòng 24h"',
  DEFAULT_CURRENCY: 'VND',
} as const;

// Vietnam timezone for date formatting
export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
