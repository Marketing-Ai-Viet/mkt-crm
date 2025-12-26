/**
 * SePay Payment Provider
 *
 * Implementation of IPaymentProvider for SePay VietQR payments.
 * Supports QR code generation and webhook-based payment confirmation.
 */

import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import {
  InitializePaymentRequest,
  InitializePaymentResult,
  QrCodeRequest,
  QrCodeResult,
  ValidationResult,
} from 'src/mkt-core/payment/interfaces/payment-provider.interface';

import { BasePaymentProvider } from 'src/mkt-core/payment/providers/base/base-payment.provider';
import { sepayConfig } from 'src/mkt-core/payment/providers/sepay/sepay.config';
import { SepayQrGenerator } from 'src/mkt-core/payment/providers/sepay/sepay-qr.generator';
import {
  PAYMENT_PROVIDER_TYPE,
  ProviderCapabilities,
} from 'src/mkt-core/payment/types/provider.types';

// ============================================
// CONSTANTS
// ============================================

const SEPAY_REQUIRED_FIELDS = ['account', 'bank'] as const;

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

@Injectable()
export class SepayProvider extends BasePaymentProvider {
  readonly providerType = PAYMENT_PROVIDER_TYPE.SEPAY_QR;
  readonly displayName = 'SePay QR (VietQR)';
  readonly capabilities: ProviderCapabilities = {
    supportsQrCode: true,
    supportsRefund: false,
    supportsRecurring: false,
    supportsPartialPayment: false,
    supportsWebhook: true,
    supportsPullStatus: false, // SePay uses push via webhook only
  };

  constructor(
    @Inject(sepayConfig.KEY)
    private readonly config: ConfigType<typeof sepayConfig>,
    private readonly qrGenerator: SepayQrGenerator,
  ) {
    super('SepayProvider');
  }

  /**
   * Check if provider is enabled based on configuration
   */
  isEnabled(): boolean {
    const validation = this.validateConfiguration();

    return validation.valid;
  }

  /**
   * Validate required configuration fields
   */
  validateConfiguration(): ValidationResult {
    return this.validateRequiredFields(
      {
        account: this.config.account,
        bank: this.config.bank,
      },
      [...SEPAY_REQUIRED_FIELDS],
    );
  }

  /**
   * Initialize payment by generating QR code
   */
  async initializePayment(
    request: InitializePaymentRequest,
  ): Promise<InitializePaymentResult> {
    this.logAction('Initialize payment', {
      orderCode: request.orderCode,
      amount: request.amount,
    });

    try {
      const qrResult = await this.generateQrCode({
        amount: request.amount,
        orderCode: request.orderCode,
        description: request.description,
        expiresIn: request.expiresIn,
      });

      if (!qrResult.success) {
        return {
          success: false,
          errorMessage: qrResult.errorMessage,
        };
      }

      return {
        success: true,
        qrCodeUrl: qrResult.qrCodeUrl,
        expiresAt: qrResult.expiresAt,
      };
    } catch (error) {
      this.logError('Initialize payment', error);

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate QR code using SepayQrGenerator
   */
  protected async doGenerateQrCode(
    request: QrCodeRequest,
  ): Promise<QrCodeResult> {
    return this.qrGenerator.generate({
      account: this.config.account,
      bank: this.config.bank,
      virtualAccount: this.config.virtualAccount,
      amount: request.amount,
      orderCode: request.orderCode,
      description: request.description,
    });
  }

  /**
   * Get the workspace ID configured for this provider
   */
  getWorkspaceId(): string {
    return this.config.workspaceId;
  }

  /**
   * Check if webhook authentication is enabled
   */
  isWebhookAuthEnabled(): boolean {
    return this.config.authEnabled;
  }

  /**
   * Get the webhook API key for validation
   */
  getWebhookApiKey(): string {
    return this.config.webhookApiKey;
  }
}
