/**
 * BIDV API Client
 *
 * HTTP client for BIDV SePay Business API.
 * Handles QR code generation via the BIDV SePay gateway.
 */

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { firstValueFrom } from 'rxjs';

import { bidvConfig } from 'src/mkt-core/payment/providers/bidv/bidv.config';
import {
  BidvSepayApiResponse,
  BidvSepayOrderData,
  BidvSepayOrderRequest,
} from 'src/mkt-core/payment/providers/bidv/bidv.types';

// ============================================
// TYPES
// ============================================

export type BidvQrGenerationParams = {
  amount: number;
  orderCode: string;
  duration?: number;
  withQrCode?: boolean;
};

export type BidvQrGenerationResult = {
  success: boolean;
  data?: BidvSepayOrderData;
  errorMessage?: string;
};

// ============================================
// API CLIENT
// ============================================

@Injectable()
export class BidvApiClient {
  private readonly logger = new Logger(BidvApiClient.name);

  constructor(
    @Inject(bidvConfig.KEY)
    private readonly config: ConfigType<typeof bidvConfig>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Generate QR code via BIDV SePay API
   */
  async generateQrCode(
    params: BidvQrGenerationParams,
  ): Promise<BidvQrGenerationResult> {
    const { amount, orderCode, duration, withQrCode = true } = params;

    this.logger.log(
      `Calling BIDV SePay API for order ${orderCode} with amount ${amount}`,
    );

    try {
      const requestData: BidvSepayOrderRequest = {
        amount,
        order_code: orderCode,
        duration: duration ?? this.config.defaultDuration,
        with_qrcode: withQrCode,
      };

      const headers = this.buildHeaders();

      const response = await firstValueFrom(
        this.httpService.post<BidvSepayApiResponse>(
          this.config.apiUrl,
          requestData,
          { headers },
        ),
      );

      if (response.data.status === 'success' && response.data.data) {
        this.logger.log(
          `Successfully generated BIDV SePay QR for order ${orderCode}, order_id: ${response.data.data.order_id}`,
        );

        return {
          success: true,
          data: response.data.data,
        };
      }

      this.logger.error(`BIDV SePay API error: ${response.data.message}`);

      return {
        success: false,
        errorMessage: response.data.message || 'Unknown API error',
      };
    } catch (error) {
      this.logger.error('Error calling BIDV SePay API:', error);

      // Extract error message from response if available
      const errorMessage = this.extractErrorMessage(error);

      return {
        success: false,
        errorMessage,
      };
    }
  }

  /**
   * Build HTTP headers for BIDV API request
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.authToken}`,
    };

    // Add cookie if configured
    if (this.config.cookie) {
      headers['Cookie'] = this.config.cookie;
    }

    return headers;
  }

  /**
   * Extract error message from API error response
   */
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;

      // Check for axios response error
      if (err.response && typeof err.response === 'object') {
        const response = err.response as Record<string, unknown>;

        if (response.data && typeof response.data === 'object') {
          const data = response.data as Record<string, unknown>;

          if (typeof data.message === 'string') {
            return data.message;
          }
        }
      }

      // Check for error message
      if (err.message && typeof err.message === 'string') {
        return err.message;
      }
    }

    return 'Unknown error';
  }
}
