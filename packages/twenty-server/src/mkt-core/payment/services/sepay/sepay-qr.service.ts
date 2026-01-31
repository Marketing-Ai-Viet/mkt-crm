import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { firstValueFrom } from 'rxjs';

import { paymentConfig } from 'src/mkt-core/payment/config';
import { SEPAY_DEFAULT_DURATION } from 'src/mkt-core/payment/constants';
import { SEPAY_QR_MESSAGES } from 'src/mkt-core/payment/messages';
import { SepayQrGenerator } from 'src/mkt-core/payment/providers/sepay/sepay-qr.generator';
import {
  BidvSepayApiResponse,
  BidvSepayOrderRequest,
} from 'src/mkt-core/payment/types/bidv-sepay.types';
import {
  EMPTY_QR_RESULT,
  QrCodeGenerationInput,
  QrCodeGenerationResult,
} from 'src/mkt-core/payment/types/sepay-qr.types';
import { isSepayPaymentMethod } from 'src/mkt-core/payment/utils';

// ============================================
// SERVICE
// ============================================

/**
 * SepayQrService - Unified service for SEPay QR code generation
 *
 * Supports two modes:
 * 1. SEPay Direct: Generate QR URL using SepayQrGenerator
 * 2. BIDV SEPay API: Call BIDV API to get QR with expiration
 *
 * Mode selection is based on config.bidv.enabled flag.
 *
 * @example
 * ```typescript
 * const result = await sepayQrService.generateQrCode({
 *   paymentMethod,
 *   amount: 100000,
 *   orderCode: 'MKT20240101001',
 * });
 * // Returns: { qrCodeUrl: 'https://...', expiredAt: null }
 * ```
 */
@Injectable()
export class SepayQrService {
  private readonly logger = new Logger(SepayQrService.name);

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
    private readonly httpService: HttpService,
    private readonly sepayQrGenerator: SepayQrGenerator,
  ) {}

  /**
   * Generate QR code URL for payment
   *
   * Automatically selects mode based on config:
   * - BIDV mode: calls BIDV SEPay API (has expiration)
   * - Direct mode: generates static QR URL
   *
   * @param input - QR generation parameters
   * @returns QR code URL and optional expiration
   */
  async generateQrCode(
    input: QrCodeGenerationInput,
  ): Promise<QrCodeGenerationResult> {
    this.logger.log(SEPAY_QR_MESSAGES.LOG.GENERATING);

    // Validate payment method type if provided
    if (input.paymentMethod) {
      const isSepay = isSepayPaymentMethod(
        input.paymentMethod.type,
        input.paymentMethod.name,
      );

      if (!isSepay) {
        this.logger.debug(SEPAY_QR_MESSAGES.WARN.NOT_SEPAY_METHOD);

        return { ...EMPTY_QR_RESULT };
      }
    }

    // Validate required inputs
    const validationError = this.validateInput(input);

    if (validationError) {
      this.logger.warn(validationError);

      return { ...EMPTY_QR_RESULT };
    }

    // Select generation mode based on config
    if (this.config.bidv.enabled) {
      return this.generateBidvQr(input);
    }

    return this.generateDirectQr(input);
  }

  // ============================================
  // PRIVATE METHODS - VALIDATION
  // ============================================

  /**
   * Validate QR generation input
   */
  private validateInput(input: QrCodeGenerationInput): string | null {
    if (!input.orderCode) {
      return SEPAY_QR_MESSAGES.WARN.NO_ORDER_CODE;
    }

    if (!input.amount || input.amount <= 0) {
      return SEPAY_QR_MESSAGES.WARN.INVALID_AMOUNT;
    }

    return null;
  }

  // ============================================
  // PRIVATE METHODS - DIRECT MODE
  // ============================================

  /**
   * Generate QR using SepayQrGenerator (direct mode)
   */
  private generateDirectQr(
    input: QrCodeGenerationInput,
  ): QrCodeGenerationResult {
    const { account, bank, virtualAccount } = this.config.sepay;

    if (!account || !bank) {
      this.logger.warn(SEPAY_QR_MESSAGES.WARN.SEPAY_NOT_CONFIGURED);

      return { ...EMPTY_QR_RESULT };
    }

    const result = this.sepayQrGenerator.generate({
      account,
      bank,
      virtualAccount,
      amount: input.amount,
      orderCode: input.orderCode,
    });

    if (!result.success || !result.qrCodeUrl) {
      this.logger.warn(
        result.errorMessage ?? SEPAY_QR_MESSAGES.ERROR.GENERATE_FAILED,
      );

      return { ...EMPTY_QR_RESULT };
    }

    this.logger.log(
      SEPAY_QR_MESSAGES.LOG.GENERATED_SEPAY(input.orderCode, input.amount),
    );

    return {
      qrCodeUrl: result.qrCodeUrl,
      expiredAt: null,
    };
  }

  // ============================================
  // PRIVATE METHODS - BIDV MODE
  // ============================================

  /**
   * Generate QR using BIDV SEPay API
   */
  private async generateBidvQr(
    input: QrCodeGenerationInput,
  ): Promise<QrCodeGenerationResult> {
    const { apiUrl, authToken } = this.config.bidv;

    if (!apiUrl || !authToken) {
      this.logger.warn(SEPAY_QR_MESSAGES.WARN.BIDV_NOT_CONFIGURED);

      return { ...EMPTY_QR_RESULT };
    }

    try {
      const requestData: BidvSepayOrderRequest = {
        amount: input.amount,
        order_code: input.orderCode,
        duration: input.duration ?? SEPAY_DEFAULT_DURATION,
        with_qrcode: true,
      };

      this.logger.log(
        SEPAY_QR_MESSAGES.LOG.CALLING_BIDV(input.orderCode, input.amount),
      );

      const response = await firstValueFrom(
        this.httpService.post<BidvSepayApiResponse>(apiUrl, requestData, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }),
      );

      return this.parseBidvResponse(response.data, input.orderCode);
    } catch (error) {
      this.handleBidvError(error);

      return { ...EMPTY_QR_RESULT };
    }
  }

  /**
   * Parse BIDV API response
   */
  private parseBidvResponse(
    response: BidvSepayApiResponse,
    orderCode: string,
  ): QrCodeGenerationResult {
    if (response.status !== 'success' || !response.data) {
      this.logger.error(
        SEPAY_QR_MESSAGES.ERROR.BIDV_API_ERROR(response.message),
      );

      return { ...EMPTY_QR_RESULT };
    }

    const { qr_code_url, qr_code, order_id, expired_at } = response.data;

    this.logger.log(SEPAY_QR_MESSAGES.LOG.GENERATED_BIDV(orderCode, order_id));

    return {
      qrCodeUrl: qr_code_url || qr_code || '',
      expiredAt: expired_at || null,
    };
  }

  /**
   * Handle BIDV API errors
   */
  private handleBidvError(error: unknown): void {
    this.logger.error(SEPAY_QR_MESSAGES.ERROR.BIDV_API_CALL_FAILED, error);

    const axiosError = error as { response?: { data?: unknown } };

    if (axiosError?.response?.data) {
      this.logger.error('BIDV API Response:', axiosError.response.data);
    }
  }
}
