/**
 * SEPay VA Provider
 *
 * Implementation of IVAProvider for SEPay Virtual Account service.
 * Handles VA creation, status checking, and deactivation via SEPay API.
 */

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { firstValueFrom, catchError, timeout } from 'rxjs';

import {
  IVAProvider,
  CreateVARequest,
  CreateVAResponse,
  VAStatus,
} from 'src/mkt-core/payment/domain/ports';
import { transferModeConfig } from 'src/mkt-core/payment/config';
import {
  SEPAY_VA_DEFAULTS,
  SEPAY_VA_ENV_KEYS,
  SEPAY_VA_API_ENDPOINTS,
  SEPAY_VA_ERROR_MESSAGES,
} from 'src/mkt-core/payment/constants/sepay-va.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  VAProviderApiException,
  VAProviderNotConfiguredException,
} from 'src/mkt-core/payment/exceptions';

// ============================================
// TYPES
// ============================================

type SepayVAConfig = {
  apiUrl: string;
  apiKey: string;
  merchantId: string;
  bankCode: string;
  timeoutMs: number;
};

type SepayCreateVAApiResponse = {
  code: string;
  message: string;
  data?: {
    vaNumber: string;
    bankCode: string;
    bankName: string;
    accountName: string;
    qrCodeUrl?: string;
    expiresAt: string;
  };
};

type SepayVAStatusApiResponse = {
  code: string;
  message: string;
  data?: {
    vaNumber: string;
    isActive: boolean;
    isPaid: boolean;
    paidAmount?: number;
    paidAt?: string;
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getEnvString = (key: string, defaultValue: string): string =>
  process.env[key] ?? defaultValue;

const getEnvNumber = (key: string, defaultValue: number): number =>
  Number(process.env[key]) || defaultValue;

const buildSepayVAConfig = (): SepayVAConfig => ({
  apiUrl: getEnvString(SEPAY_VA_ENV_KEYS.API_URL, SEPAY_VA_DEFAULTS.API_URL),
  apiKey: getEnvString(SEPAY_VA_ENV_KEYS.API_KEY, ''),
  merchantId: getEnvString(SEPAY_VA_ENV_KEYS.MERCHANT_ID, ''),
  bankCode: getEnvString(
    SEPAY_VA_ENV_KEYS.BANK_CODE,
    SEPAY_VA_DEFAULTS.BANK_CODE,
  ),
  timeoutMs: getEnvNumber(
    SEPAY_VA_ENV_KEYS.TIMEOUT_MS,
    SEPAY_VA_DEFAULTS.TIMEOUT_MS,
  ),
});

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

/**
 * SepayVAProvider
 *
 * Implements IVAProvider for SEPay Virtual Account integration.
 *
 * Features:
 * - Create virtual accounts for order payments
 * - Check VA payment status
 * - Deactivate expired or paid VAs
 * - Health check for provider availability
 *
 * Configuration:
 * - SEPAY_VA_API_URL: API base URL
 * - SEPAY_VA_API_KEY: API authentication key
 * - SEPAY_VA_MERCHANT_ID: Merchant identifier
 * - SEPAY_VA_BANK_CODE: Default bank code (BIDV)
 * - SEPAY_VA_TIMEOUT_MS: Request timeout (default: 30000ms)
 */
@Injectable()
export class SepayVAProvider implements IVAProvider {
  private readonly logger = new Logger(SepayVAProvider.name);
  private readonly config: SepayVAConfig;

  readonly providerName = 'SEPAY';

  constructor(
    @Optional() private readonly httpService: HttpService | null,
    @Inject(transferModeConfig.KEY)
    private readonly transferConfig: ConfigType<typeof transferModeConfig>,
  ) {
    this.config = buildSepayVAConfig();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Create a new virtual account
   */
  async createVA(request: CreateVARequest): Promise<CreateVAResponse> {
    this.logger.log({
      message: 'Creating VA via SEPay',
      orderId: request.orderId,
      orderCode: request.orderCode,
      amount: request.amount,
    });

    this.validateConfig();

    // If no HTTP service is available (mock mode), return simulated response
    if (!this.httpService) {
      return this.createMockVAResponse(request);
    }

    try {
      const url = `${this.config.apiUrl}${SEPAY_VA_API_ENDPOINTS.CREATE_VA}`;

      const response = await firstValueFrom(
        this.httpService
          .post<SepayCreateVAApiResponse>(
            url,
            {
              merchantId: this.config.merchantId,
              orderCode: request.orderCode,
              orderId: request.orderId,
              amount: request.amount,
              bankCode: this.config.bankCode,
              expiryMinutes:
                request.expiryMinutes ??
                this.transferConfig.va.expiryHours * 60,
              metadata: request.metadata,
            },
            {
              headers: this.getAuthHeaders(),
            },
          )
          .pipe(
            timeout(this.config.timeoutMs),
            catchError((error) => {
              throw this.handleApiError(error, 'createVA');
            }),
          ),
      );

      const apiResponse = response.data;

      if (apiResponse.code !== '00' || !apiResponse.data) {
        throw new VAProviderApiException(
          apiResponse.message ?? SEPAY_VA_ERROR_MESSAGES.API_ERROR,
          this.providerName,
          undefined,
          apiResponse,
        );
      }

      this.logger.log({
        message: 'VA created successfully',
        vaNumber: apiResponse.data.vaNumber,
        orderId: request.orderId,
      });

      return {
        vaNumber: apiResponse.data.vaNumber,
        bankCode: apiResponse.data.bankCode,
        bankName: apiResponse.data.bankName,
        accountName: apiResponse.data.accountName,
        qrCodeUrl: apiResponse.data.qrCodeUrl,
        expiresAt: apiResponse.data.expiresAt,
        providerResponse: apiResponse as unknown as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.error({
        message: 'Failed to create VA',
        orderId: request.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Get VA status from provider
   */
  async getVAStatus(vaNumber: string): Promise<VAStatus> {
    this.logger.debug({
      message: 'Getting VA status',
      vaNumber,
    });

    this.validateConfig();

    // If no HTTP service is available (mock mode), return simulated response
    if (!this.httpService) {
      return this.createMockVAStatus(vaNumber);
    }

    try {
      const url = `${this.config.apiUrl}${SEPAY_VA_API_ENDPOINTS.GET_VA_STATUS.replace(':vaNumber', vaNumber)}`;

      const response = await firstValueFrom(
        this.httpService
          .get<SepayVAStatusApiResponse>(url, {
            headers: this.getAuthHeaders(),
          })
          .pipe(
            timeout(this.config.timeoutMs),
            catchError((error) => {
              throw this.handleApiError(error, 'getVAStatus');
            }),
          ),
      );

      const apiResponse = response.data;

      if (apiResponse.code !== '00' || !apiResponse.data) {
        throw new VAProviderApiException(
          apiResponse.message ?? SEPAY_VA_ERROR_MESSAGES.API_ERROR,
          this.providerName,
          undefined,
          apiResponse,
        );
      }

      return {
        vaNumber: apiResponse.data.vaNumber,
        isActive: apiResponse.data.isActive,
        isPaid: apiResponse.data.isPaid,
        paidAmount: apiResponse.data.paidAmount,
        paidAt: apiResponse.data.paidAt,
      };
    } catch (error) {
      this.logger.error({
        message: 'Failed to get VA status',
        vaNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Deactivate VA
   */
  async deactivateVA(vaNumber: string): Promise<void> {
    this.logger.log({
      message: 'Deactivating VA',
      vaNumber,
    });

    this.validateConfig();

    // If no HTTP service is available (mock mode), just log
    if (!this.httpService) {
      this.logger.debug({
        message: 'VA deactivation simulated (mock mode)',
        vaNumber,
      });

      return;
    }

    try {
      const url = `${this.config.apiUrl}${SEPAY_VA_API_ENDPOINTS.DEACTIVATE_VA.replace(':vaNumber', vaNumber)}`;

      await firstValueFrom(
        this.httpService
          .post(
            url,
            {},
            {
              headers: this.getAuthHeaders(),
            },
          )
          .pipe(
            timeout(this.config.timeoutMs),
            catchError((error) => {
              throw this.handleApiError(error, 'deactivateVA');
            }),
          ),
      );

      this.logger.log({
        message: 'VA deactivated successfully',
        vaNumber,
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to deactivate VA',
        vaNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    // If VA is not enabled, provider is not available
    if (!this.transferConfig.va.enabled) {
      return false;
    }

    // Check if required config is present
    if (!this.config.apiKey || !this.config.merchantId) {
      this.logger.debug('SEPay VA config incomplete - running in mock mode');

      // Return true for mock mode to allow testing
      return true;
    }

    // If no HTTP service, we're in mock mode
    if (!this.httpService) {
      return true;
    }

    try {
      const url = `${this.config.apiUrl}${SEPAY_VA_API_ENDPOINTS.HEALTH_CHECK}`;

      const response = await firstValueFrom(
        this.httpService.get(url).pipe(
          timeout(5000), // Short timeout for health check
          catchError(() => {
            return [{ status: 503 }];
          }),
        ),
      );

      return response.status === 200;
    } catch {
      return false;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
      'X-Merchant-Id': this.config.merchantId,
    };
  }

  /**
   * Validate that required config is present
   */
  private validateConfig(): void {
    // In mock mode (no API key), skip validation
    if (!this.config.apiKey && !this.config.merchantId) {
      return;
    }

    if (!this.config.apiUrl) {
      throw new VAProviderNotConfiguredException('SEPay VA API URL');
    }
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: unknown, operation: string): Error {
    const message = error instanceof Error ? error.message : 'Unknown error';

    this.logger.error({
      message: `SEPay VA API error during ${operation}`,
      error: message,
    });

    return new VAProviderApiException(
      `${SEPAY_VA_ERROR_MESSAGES.API_ERROR}: ${message}`,
      this.providerName,
      (error as { response?: { status?: number } })?.response?.status,
      (error as { response?: { data?: unknown } })?.response?.data,
    );
  }

  /**
   * Create mock VA response for testing/development
   */
  private createMockVAResponse(request: CreateVARequest): CreateVAResponse {
    const expiryHours =
      (request.expiryMinutes ?? this.transferConfig.va.expiryHours * 60) / 60;
    const expiresAt = DateTimeUtils.toISO(
      DateTimeUtils.add(DateTimeUtils.now(), { hours: expiryHours }),
    );

    // Generate mock VA number based on order code
    const mockVaNumber = `VA${request.orderCode
      .replace(/[^0-9]/g, '')
      .slice(0, 10)
      .padEnd(10, '0')}`;

    this.logger.debug({
      message: 'Created mock VA response',
      vaNumber: mockVaNumber,
      orderId: request.orderId,
    });

    return {
      vaNumber: mockVaNumber,
      bankCode: SEPAY_VA_DEFAULTS.BANK_CODE,
      bankName: SEPAY_VA_DEFAULTS.BANK_NAME,
      accountName: SEPAY_VA_DEFAULTS.ACCOUNT_NAME,
      expiresAt,
      providerResponse: {
        mock: true,
        createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      },
    };
  }

  /**
   * Create mock VA status for testing/development
   */
  private createMockVAStatus(vaNumber: string): VAStatus {
    return {
      vaNumber,
      isActive: true,
      isPaid: false,
    };
  }
}
