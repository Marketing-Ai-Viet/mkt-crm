/**
 * BIDV Payment Provider
 *
 * Implementation of IPaymentProvider for BIDV SePay Business payments.
 * Supports QR code generation via BIDV SePay API.
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
import { BidvApiClient } from 'src/mkt-core/payment/providers/bidv/bidv-api.client';
import { bidvConfig } from 'src/mkt-core/payment/providers/bidv/bidv.config';
import {
  PAYMENT_PROVIDER_TYPE,
  ProviderCapabilities,
} from 'src/mkt-core/payment/types/provider.types';

// ============================================
// CONSTANTS
// ============================================

const BIDV_REQUIRED_FIELDS = ['apiUrl', 'authToken'] as const;

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

@Injectable()
export class BidvProvider extends BasePaymentProvider {
  readonly providerType = PAYMENT_PROVIDER_TYPE.BIDV_SEPAY;
  readonly displayName = 'BIDV SePay';
  readonly capabilities: ProviderCapabilities = {
    supportsQrCode: true,
    supportsRefund: false,
    supportsRecurring: false,
    supportsPartialPayment: false,
    supportsWebhook: true, // Uses same webhook as SePay
    supportsPullStatus: false,
  };

  constructor(
    @Inject(bidvConfig.KEY)
    private readonly config: ConfigType<typeof bidvConfig>,
    private readonly apiClient: BidvApiClient,
  ) {
    super('BidvProvider');
  }

  /**
   * Check if provider is enabled based on configuration
   */
  isEnabled(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const validation = this.validateConfiguration();

    return validation.valid;
  }

  /**
   * Validate required configuration fields
   */
  validateConfiguration(): ValidationResult {
    return this.validateRequiredFields(
      {
        apiUrl: this.config.apiUrl,
        authToken: this.config.authToken,
      },
      [...BIDV_REQUIRED_FIELDS],
    );
  }

  /**
   * Initialize payment by generating QR code via BIDV API
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
   * Generate QR code using BIDV API
   */
  protected async doGenerateQrCode(
    request: QrCodeRequest,
  ): Promise<QrCodeResult> {
    const result = await this.apiClient.generateQrCode({
      amount: request.amount,
      orderCode: request.orderCode,
      duration: request.expiresIn ?? this.config.defaultDuration,
      withQrCode: true,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        errorMessage: result.errorMessage ?? 'Failed to generate QR code',
      };
    }

    const { qr_code_url, qr_code, expired_at } = result.data;

    return {
      success: true,
      qrCodeUrl: qr_code_url || qr_code || '',
      expiresAt: expired_at || undefined,
    };
  }

  /**
   * Get the workspace ID configured for this provider
   */
  getWorkspaceId(): string {
    return this.config.workspaceId;
  }

  /**
   * Get the default QR code duration in seconds
   */
  getDefaultDuration(): number {
    return this.config.defaultDuration;
  }
}
