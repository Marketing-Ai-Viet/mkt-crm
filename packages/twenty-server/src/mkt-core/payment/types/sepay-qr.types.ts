/**
 * SEPay QR Types
 *
 * Types cho SEPay QR code generation và QR page rendering.
 */

import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/workspace-entities/mkt-payment-method.workspace-entity';

// ============================================
// QR CODE GENERATION TYPES
// ============================================

/**
 * QR code generation result
 */
export type QrCodeGenerationResult = {
  /** Generated QR code URL */
  qrCodeUrl: string;
  /** Expiration time for BIDV API mode (ISO string) */
  expiredAt: string | null;
};

/**
 * QR code generation input
 */
export type QrCodeGenerationInput = {
  /** Payment method entity to check if SEPay type */
  paymentMethod?: MktPaymentMethodWorkspaceEntity;
  /** Payment amount */
  amount: number;
  /** Order code for reference */
  orderCode: string;
  /** Payment duration in seconds (for BIDV API mode) */
  duration?: number;
};

/**
 * Empty QR result constant
 */
export const EMPTY_QR_RESULT: QrCodeGenerationResult = {
  qrCodeUrl: '',
  expiredAt: null,
};

// ============================================
// QR PAGE TYPES
// ============================================

/**
 * Template variables for QR payment page
 */
export type QrPageTemplateVariables = {
  customer_name: string;
  order_code: string;
  amount: string;
  currency: string;
  qr_code_url: string;
  expired_at: string;
  company_name: string;
};

/**
 * Result from generating QR page
 */
export type QrPageResult = {
  success: true;
  htmlContent: string;
};
