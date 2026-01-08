import { PaymentMethodType } from 'src/mkt-core/payment-method/types';
import {
  SEPAY_PAYMENT_METHOD_NAME,
  SEPAY_PAYMENT_METHOD_TYPE,
} from 'src/mkt-core/payment/constants';

/**
 * Check if a payment method is SEPay/QR Code type
 * @param type - Payment method type
 * @param name - Payment method name (optional, for backward compatibility)
 */
export const isSepayPaymentMethod = (
  type?: PaymentMethodType,
  name?: string,
): boolean => {
  return (
    type === SEPAY_PAYMENT_METHOD_TYPE || name === SEPAY_PAYMENT_METHOD_NAME
  );
};
