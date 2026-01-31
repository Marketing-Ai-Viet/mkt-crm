import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { paymentConfig } from 'src/mkt-core/payment/config';
import { SEPAY_AUTH_MESSAGES } from 'src/mkt-core/payment/messages';

/**
 * SepayAuthService - Handles SEPay webhook authentication
 *
 * Responsibilities:
 * - Validate API key from Authorization header
 * - Compare against configured webhook API key
 *
 * Does NOT handle:
 * - IP whitelist validation (handled by IpWhitelistGuard)
 * - JWT/OAuth authentication
 */
@Injectable()
export class SepayAuthService {
  private static readonly API_KEY_PREFIX = 'Apikey ';

  private readonly logger = new Logger(SepayAuthService.name);

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
  ) {}

  /**
   * Validate authorization header and extract API key
   *
   * @param authorization - Authorization header value (format: "Apikey {key}")
   * @throws UnauthorizedException if validation fails
   */
  validateAuthorizationHeader(authorization: string | undefined): void {
    if (!authorization) {
      throw new UnauthorizedException(
        SEPAY_AUTH_MESSAGES.ERROR.AUTHORIZATION_REQUIRED,
      );
    }

    if (!authorization.startsWith(SepayAuthService.API_KEY_PREFIX)) {
      throw new UnauthorizedException(
        SEPAY_AUTH_MESSAGES.ERROR.INVALID_AUTH_FORMAT,
      );
    }

    const apiKey = authorization
      .substring(SepayAuthService.API_KEY_PREFIX.length)
      .trim();

    if (!apiKey) {
      throw new UnauthorizedException(
        SEPAY_AUTH_MESSAGES.ERROR.API_KEY_REQUIRED,
      );
    }

    if (!this.isValidApiKey(apiKey)) {
      throw new UnauthorizedException(
        SEPAY_AUTH_MESSAGES.ERROR.INVALID_API_KEY,
      );
    }

    this.logger.log(SEPAY_AUTH_MESSAGES.LOG.VALIDATION_SUCCESS);
  }

  /**
   * Validate API key against configured webhook API key
   *
   * @param apiKey - The API key to validate
   * @returns true if API key is valid
   */
  private isValidApiKey(apiKey: string): boolean {
    const validApiKey = this.config.sepay.webhookApiKey;

    if (!validApiKey) {
      this.logger.warn(SEPAY_AUTH_MESSAGES.ERROR.API_KEY_NOT_CONFIGURED);

      return false;
    }

    const isValid = apiKey === validApiKey;

    if (!isValid) {
      this.logger.warn(SEPAY_AUTH_MESSAGES.LOG.INVALID_API_KEY);
    }

    return isValid;
  }
}
