/**
 * Payment Provider Interface
 *
 * Core interface that all payment providers must implement.
 * Defines contract for payment operations.
 */

import {
  PaymentProviderType,
  ProviderCapabilities,
} from 'src/mkt-core/payment/types/provider.types';

/**
 * Customer information for payment
 */
export type CustomerInfo = {
  name?: string;
  email?: string;
  phone?: string;
};

/**
 * Configuration validation result
 */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Request to initialize a new payment
 */
export type InitializePaymentRequest = {
  orderId: string;
  orderCode: string;
  amount: number;
  currency: string;
  description?: string;
  customerInfo?: CustomerInfo;
  metadata?: Record<string, unknown>;
  /** Duration in seconds before payment expires */
  expiresIn?: number;
};

/**
 * Result of payment initialization
 */
export type InitializePaymentResult = {
  success: boolean;
  providerTransactionId?: string;
  qrCodeUrl?: string;
  paymentUrl?: string;
  expiresAt?: string;
  rawResponse?: unknown;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Request to generate QR code
 */
export type QrCodeRequest = {
  amount: number;
  orderCode: string;
  description?: string;
  expiresIn?: number;
};

/**
 * Result of QR code generation
 */
export type QrCodeResult = {
  success: boolean;
  qrCodeUrl?: string;
  qrCodeBase64?: string;
  expiresAt?: string;
  errorMessage?: string;
};

/**
 * Payment status
 *
 * Matches PAYMENT_TRANSACTION_STATUS constants:
 * PENDING → CONFIRMED → (REFUNDED | PARTIALLY_REFUNDED)
 * PENDING → REJECTED
 * PENDING → FAILED | CANCELLED | EXPIRED
 */
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED' // Legacy status, prefer CONFIRMED for new code
  | 'CONFIRMED'
  | 'FAILED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PARTIAL'
  | 'OVERPAID';

/**
 * Payment status query result
 */
export type PaymentStatusResult = {
  success: boolean;
  status: PaymentStatus;
  paidAmount?: number;
  paidAt?: string;
  providerTransactionId?: string;
  rawResponse?: unknown;
  errorMessage?: string;
};

/**
 * Refund request
 */
export type RefundRequest = {
  transactionId: string;
  amount: number;
  reason?: string;
};

/**
 * Refund result
 */
export type RefundResult = {
  success: boolean;
  refundTransactionId?: string;
  refundedAmount?: number;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Cancel payment result
 */
export type CancelPaymentResult = {
  success: boolean;
  errorMessage?: string;
};

/**
 * Core interface that all payment providers must implement
 */
export type IPaymentProvider = {
  /**
   * Provider type identifier
   */
  readonly providerType: PaymentProviderType;

  /**
   * Human-readable provider name
   */
  readonly displayName: string;

  /**
   * Provider capabilities
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Check if provider is enabled and configured
   */
  isEnabled(): boolean;

  /**
   * Initialize payment and return payment details
   */
  initializePayment(
    request: InitializePaymentRequest,
  ): Promise<InitializePaymentResult>;

  /**
   * Generate QR code URL if supported
   */
  generateQrCode(request: QrCodeRequest): Promise<QrCodeResult>;

  /**
   * Query payment status from provider
   */
  queryPaymentStatus(transactionId: string): Promise<PaymentStatusResult>;

  /**
   * Cancel/void a pending payment
   */
  cancelPayment(transactionId: string): Promise<CancelPaymentResult>;

  /**
   * Process refund if supported
   */
  refundPayment(request: RefundRequest): Promise<RefundResult>;

  /**
   * Validate provider-specific configuration
   */
  validateConfiguration(): ValidationResult;
};
