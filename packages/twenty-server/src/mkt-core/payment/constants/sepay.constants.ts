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
