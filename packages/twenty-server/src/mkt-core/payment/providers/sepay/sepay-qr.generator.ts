/**
 * SePay QR Code Generator
 *
 * Generates VietQR payment URLs via SePay gateway.
 * Uses the SePay QR API format.
 */

import { Injectable, Logger } from '@nestjs/common';

import { QrCodeResult } from 'src/mkt-core/payment/types/payment-provider.interface';
import {
  SepayQrParams,
  SepayQrTemplate,
} from 'src/mkt-core/payment/providers/sepay/sepay.types';

// ============================================
// CONSTANTS
// ============================================

const SEPAY_QR_BASE_URL = 'https://qr.sepay.vn/img';
const DEFAULT_TEMPLATE: SepayQrTemplate = 'qronly';

// ============================================
// GENERATOR SERVICE
// ============================================

@Injectable()
export class SepayQrGenerator {
  private readonly logger = new Logger(SepayQrGenerator.name);

  /**
   * Generate SePay VietQR URL
   *
   * @param params - QR generation parameters
   * @returns QR code result with URL or error
   */
  generate(params: SepayQrParams): QrCodeResult {
    try {
      const validationError = this.validateParams(params);

      if (validationError) {
        return {
          success: false,
          errorMessage: validationError,
        };
      }

      const qrCodeUrl = this.buildQrUrl(params);

      this.logger.log(`Generated SePay QR URL for order ${params.orderCode}`);

      return {
        success: true,
        qrCodeUrl,
      };
    } catch (error) {
      this.logger.error('Error generating SePay QR code:', error);

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate QR generation parameters
   */
  private validateParams(params: SepayQrParams): string | null {
    const { account, bank, amount, orderCode } = params;

    if (!account || !bank) {
      return 'Missing required parameters: account, bank';
    }

    if (!amount || amount <= 0) {
      return 'Invalid amount: must be positive';
    }

    if (!orderCode) {
      return 'Missing order code';
    }

    return null;
  }

  /**
   * Build the SePay QR URL
   */
  private buildQrUrl(params: SepayQrParams): string {
    const {
      account,
      bank,
      virtualAccount,
      amount,
      orderCode,
      description,
      template,
    } = params;

    // Build description: use VA prefix if provided, otherwise use description or orderCode
    const des = this.buildDescription(virtualAccount, orderCode, description);

    // Build URL parameters
    const urlParams = new URLSearchParams({
      acc: account,
      bank: bank,
      amount: String(amount),
      des: des,
      template: template ?? DEFAULT_TEMPLATE,
      download: 'false',
    });

    return `${SEPAY_QR_BASE_URL}?${urlParams.toString()}`;
  }

  /**
   * Build description for QR code
   *
   * Priority:
   * 1. VA + orderCode (if VA provided)
   * 2. description (if provided)
   * 3. orderCode (fallback)
   */
  private buildDescription(
    virtualAccount?: string,
    orderCode?: string,
    description?: string,
  ): string {
    if (virtualAccount) {
      return `${virtualAccount} ${orderCode ?? ''}`.trim();
    }

    return description ?? orderCode ?? '';
  }
}
