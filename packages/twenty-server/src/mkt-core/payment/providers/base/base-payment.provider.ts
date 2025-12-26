import { Logger } from '@nestjs/common';

import {
  CancelPaymentResult,
  IPaymentProvider,
  InitializePaymentRequest,
  InitializePaymentResult,
  PaymentStatusResult,
  QrCodeRequest,
  QrCodeResult,
  RefundRequest,
  RefundResult,
  ValidationResult,
} from 'src/mkt-core/payment/interfaces/payment-provider.interface';

import {
  PaymentProviderType,
  ProviderCapabilities,
} from 'src/mkt-core/payment/types/provider.types';

/**
 * BasePaymentProvider
 *
 * Abstract base class for payment providers.
 * Provides common functionality and enforces contract.
 *
 * Subclasses must implement:
 * - providerType
 * - displayName
 * - capabilities
 * - isEnabled()
 * - validateConfiguration()
 * - initializePayment()
 */
export abstract class BasePaymentProvider implements IPaymentProvider {
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  // ============================================
  // ABSTRACT PROPERTIES (must implement)
  // ============================================

  abstract readonly providerType: PaymentProviderType;
  abstract readonly displayName: string;
  abstract readonly capabilities: ProviderCapabilities;

  // ============================================
  // ABSTRACT METHODS (must implement)
  // ============================================

  abstract isEnabled(): boolean;
  abstract validateConfiguration(): ValidationResult;
  abstract initializePayment(
    request: InitializePaymentRequest,
  ): Promise<InitializePaymentResult>;

  // ============================================
  // OPTIONAL METHODS (override if supported)
  // ============================================

  /**
   * Generate QR code - override if provider supports QR
   */
  async generateQrCode(request: QrCodeRequest): Promise<QrCodeResult> {
    if (!this.capabilities.supportsQrCode) {
      return {
        success: false,
        errorMessage: `Provider ${this.providerType} does not support QR codes`,
      };
    }

    return this.doGenerateQrCode(request);
  }

  /**
   * Internal QR code generation - override in subclass
   */
  protected async doGenerateQrCode(
    _request: QrCodeRequest,
  ): Promise<QrCodeResult> {
    return {
      success: false,
      errorMessage: 'QR code generation not implemented',
    };
  }

  /**
   * Query payment status - override if provider supports pull status
   */
  async queryPaymentStatus(
    transactionId: string,
  ): Promise<PaymentStatusResult> {
    if (!this.capabilities.supportsPullStatus) {
      return {
        success: false,
        status: 'PENDING',
        errorMessage: `Provider ${this.providerType} does not support status query`,
      };
    }

    return this.doQueryPaymentStatus(transactionId);
  }

  /**
   * Internal status query - override in subclass
   */
  protected async doQueryPaymentStatus(
    _transactionId: string,
  ): Promise<PaymentStatusResult> {
    return {
      success: false,
      status: 'PENDING',
      errorMessage: 'Status query not implemented',
    };
  }

  /**
   * Cancel payment - override if provider supports cancellation
   */
  async cancelPayment(transactionId: string): Promise<CancelPaymentResult> {
    this.logger.warn(
      `Cancel not supported for ${this.providerType}: ${transactionId}`,
    );

    return {
      success: false,
      errorMessage: 'Cancel not supported by this provider',
    };
  }

  /**
   * Refund payment - override if provider supports refund
   */
  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    if (!this.capabilities.supportsRefund) {
      return {
        success: false,
        errorCode: 'REFUND_NOT_SUPPORTED',
        errorMessage: `Provider ${this.providerType} does not support refunds`,
      };
    }

    return this.doRefundPayment(request);
  }

  /**
   * Internal refund - override in subclass
   */
  protected async doRefundPayment(
    _request: RefundRequest,
  ): Promise<RefundResult> {
    return {
      success: false,
      errorMessage: 'Refund not implemented',
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Validate required config fields
   */
  protected validateRequiredFields(
    config: Record<string, unknown>,
    requiredFields: string[],
  ): ValidationResult {
    const errors: string[] = [];

    for (const field of requiredFields) {
      const value = config[field];

      if (value === undefined || value === null || value === '') {
        errors.push(`Missing required configuration: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log provider action
   */
  protected logAction(action: string, details?: Record<string, unknown>): void {
    this.logger.log(`[${this.providerType}] ${action}`, details);
  }

  /**
   * Log provider warning
   */
  protected logWarning(
    action: string,
    details?: Record<string, unknown>,
  ): void {
    this.logger.warn(`[${this.providerType}] ${action}`, details);
  }

  /**
   * Log provider error
   */
  protected logError(action: string, error: unknown): void {
    this.logger.error(`[${this.providerType}] ${action} failed`, error);
  }
}
