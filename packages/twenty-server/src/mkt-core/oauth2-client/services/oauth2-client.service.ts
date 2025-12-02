import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';

import {
  OAUTH2_CACHE_DEFAULTS,
  OAUTH2_LOG_CONTEXT,
  OAUTH2_SUCCESS_MESSAGES,
  OAUTH2_ERROR_MESSAGES,
} from 'src/mkt-core/oauth2-client/constants';
import {
  CircuitBreakerOpenException,
  OAuth2ErrorCode,
  OAuth2Exception,
  OAuth2HealthCheckResult,
  OAuth2Token,
  OAuth2TokenMetadata,
  OAuth2TokenResponse,
  RateLimitException,
} from 'src/mkt-core/oauth2-client/types';

import { OAuth2CacheService } from './oauth2-cache.service';
import { OAuth2LockService } from './oauth2-lock.service';
import { OAuth2RateLimiterService } from './oauth2-rate-limiter.service';
import { OAuth2CircuitBreakerService } from './oauth2-circuit-breaker.service';

@Injectable()
export class OAuth2ClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OAUTH2_LOG_CONTEXT);
  private readonly serverUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes: string;
  private readonly tokenEndpoint: string;
  private readonly refreshThresholdSeconds: number;
  private readonly refreshIntervalMs: number;
  private readonly httpTimeoutMs: number;

  private refreshInterval?: ReturnType<typeof setTimeout>;
  private lastRefreshedAt?: DateTime;
  private refreshCount = 0;
  private consecutiveRefreshFailures = 0;
  private readonly maxBackoffMs = 300000; // 5 minutes max backoff

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly cacheService: OAuth2CacheService,
    private readonly lockService: OAuth2LockService,
    private readonly rateLimiterService: OAuth2RateLimiterService,
    private readonly circuitBreakerService: OAuth2CircuitBreakerService,
  ) {
    this.serverUrl =
      this.configService.get<string>('oauth2Client.serverUrl') ?? '';
    this.clientId =
      this.configService.get<string>('oauth2Client.clientId') ?? '';
    this.clientSecret =
      this.configService.get<string>('oauth2Client.clientSecret') ?? '';
    this.scopes = this.configService.get<string>('oauth2Client.scopes') ?? '';
    this.tokenEndpoint =
      this.configService.get<string>('oauth2Client.tokenEndpoint') ??
      '/oauth/token';
    this.refreshThresholdSeconds =
      this.configService.get<number>('oauth2Client.refresh.thresholdSeconds') ??
      300;
    this.refreshIntervalMs =
      this.configService.get<number>('oauth2Client.refresh.intervalMs') ??
      30000;
    this.httpTimeoutMs =
      this.configService.get<number>('oauth2Client.http.timeoutMs') ?? 10000;
  }

  async onModuleInit(): Promise<void> {
    // Skip if clientId or clientSecret not configured
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'OAuth2 client credentials not configured. Skipping token initialization.',
      );

      return;
    }

    // Fetch initial token on startup
    await this.initializeToken();

    // Start background refresh
    if (this.refreshIntervalMs > 0) {
      this.startBackgroundRefresh();
    }
  }

  private async initializeToken(): Promise<void> {
    try {
      this.logger.log('Initializing OAuth2 token on startup...');
      await this.getAccessToken();

      const expirySeconds = await this.getTokenExpirySeconds();

      this.logger.log(
        `OAuth2 token initialized successfully (expires in ${expirySeconds}s)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to initialize OAuth2 token on startup: ${errorMessage}. ` +
          'Token will be fetched on first API request.',
      );
    }
  }

  private async getTokenExpirySeconds(): Promise<number> {
    const cacheKey = this.getCacheKey();
    const token = await this.cacheService.getToken(cacheKey);

    if (!token) {
      return 0;
    }

    const expiresAt =
      token.expiresAt instanceof Date
        ? DateTime.fromJSDate(token.expiresAt)
        : DateTime.fromISO(String(token.expiresAt));

    return Math.max(
      0,
      Math.floor(expiresAt.diff(DateTime.utc()).as('seconds')),
    );
  }

  onModuleDestroy(): void {
    this.stopBackgroundRefresh();
  }

  async getAccessToken(): Promise<string> {
    const cacheKey = this.getCacheKey();
    const cachedToken = await this.cacheService.getToken(cacheKey);

    // Token còn valid và chưa cần refresh
    if (cachedToken && !this.shouldRefresh(cachedToken)) {
      const ttl = this.getSecondsUntilExpiry(cachedToken);

      this.logger.debug(`Using cached token (TTL: ${ttl}s)`);

      return cachedToken.accessToken;
    }

    // Cần fetch token mới (không có token hoặc cần refresh)
    return this.lockService.executeWithLock(
      `oauth2:refresh:${this.clientId}`,
      async () => {
        // Double-check sau khi acquire lock (có thể đã được refresh bởi request khác)
        const recheckedToken = await this.cacheService.getToken(cacheKey);

        if (recheckedToken && !this.shouldRefresh(recheckedToken)) {
          const ttl = this.getSecondsUntilExpiry(recheckedToken);

          this.logger.debug(
            `Token already refreshed by another request (TTL: ${ttl}s)`,
          );

          return recheckedToken.accessToken;
        }

        // Fetch token mới
        const newToken = await this.fetchNewToken();

        await this.cacheService.setToken(cacheKey, newToken);
        this.lastRefreshedAt = DateTime.utc();
        this.refreshCount++;

        return newToken.accessToken;
      },
    );
  }

  async invalidateToken(): Promise<void> {
    const cacheKey = this.getCacheKey();

    await this.cacheService.invalidateToken(cacheKey);
    this.logger.log(OAUTH2_SUCCESS_MESSAGES.TOKEN_INVALIDATED());
  }

  async getTokenMetadata(): Promise<OAuth2TokenMetadata | null> {
    const cacheKey = this.getCacheKey();
    const token = await this.cacheService.getToken(cacheKey);

    if (!token) {
      return null;
    }

    const expiresAt =
      token.expiresAt instanceof Date
        ? DateTime.fromJSDate(token.expiresAt)
        : DateTime.fromISO(String(token.expiresAt));
    const issuedAt =
      token.issuedAt instanceof Date
        ? DateTime.fromJSDate(token.issuedAt)
        : DateTime.fromISO(String(token.issuedAt));
    const expiresIn = Math.max(
      0,
      Math.floor(expiresAt.diff(DateTime.utc()).as('seconds')),
    );

    return {
      valid: expiresIn > 0,
      expiresIn,
      scopes: token.scopes,
      issuedAt: issuedAt.toJSDate(),
      expiresAt: expiresAt.toJSDate(),
      lastRefreshedAt: this.lastRefreshedAt?.toJSDate() ?? issuedAt.toJSDate(),
      refreshCount: this.refreshCount,
    };
  }

  async healthCheck(): Promise<OAuth2HealthCheckResult> {
    const cacheKey = this.getCacheKey();
    const token = await this.cacheService.getToken(cacheKey);
    const cacheStats = this.cacheService.getStats();
    const circuitBreakerStatus = this.circuitBreakerService.getStatus();
    const rateLimitStatus = this.rateLimiterService.getStatus();

    let tokenInfo: OAuth2HealthCheckResult['token'] = { valid: false };

    if (token) {
      const expiresAt =
        token.expiresAt instanceof Date
          ? DateTime.fromJSDate(token.expiresAt)
          : DateTime.fromISO(String(token.expiresAt));
      const expiresIn = Math.max(
        0,
        Math.floor(expiresAt.diff(DateTime.utc()).as('seconds')),
      );

      tokenInfo = {
        valid: expiresIn > 0,
        expiresIn,
        scopes: token.scopes,
      };
    }

    let status: OAuth2HealthCheckResult['status'] = 'healthy';

    if (circuitBreakerStatus.state === 'OPEN') {
      status = 'unhealthy';
    } else if (!tokenInfo.valid || circuitBreakerStatus.state === 'HALF_OPEN') {
      status = 'degraded';
    }

    return {
      status,
      token: tokenInfo,
      cache: cacheStats,
      circuitBreaker: circuitBreakerStatus,
      rateLimit: rateLimitStatus,
    };
  }

  private async fetchNewToken(): Promise<OAuth2Token> {
    this.rateLimiterService.checkRateLimit();
    this.rateLimiterService.recordAttempt();

    return this.circuitBreakerService.execute(async () => {
      const tokenUrl = `${this.serverUrl}${this.tokenEndpoint}`;
      const scopesArray = this.scopes
        ? this.scopes.split(',').map((s) => s.trim())
        : [];
      const requestBody = {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: scopesArray,
      };

      // Debug logging
      this.logger.log(`[OAuth2 Debug] Token Endpoint: ${tokenUrl}`);
      this.logger.log(`[OAuth2 Debug] Server URL: ${this.serverUrl}`);
      this.logger.log(`[OAuth2 Debug] Client ID: ${this.clientId}`);
      this.logger.log(
        `[OAuth2 Debug] Client Secret: ${this.clientSecret ? '***' + this.clientSecret.slice(-4) : 'NOT SET'}`,
      );
      this.logger.log(`[OAuth2 Debug] Scopes: ${JSON.stringify(scopesArray)}`);
      this.logger.log(
        `[OAuth2 Debug] Request Body: ${JSON.stringify(requestBody)}`,
      );
      this.logger.log(`[OAuth2 Debug] Timeout: ${this.httpTimeoutMs}ms`);

      try {
        const response = await firstValueFrom(
          this.httpService.post<OAuth2TokenResponse>(tokenUrl, requestBody, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: this.httpTimeoutMs,
          }),
        );

        this.logger.log(`[OAuth2 Debug] Response Status: ${response.status}`);
        this.logger.log(
          `[OAuth2 Debug] Response Data: ${JSON.stringify(response.data)}`,
        );

        const tokenResponse = response.data;
        const token = this.parseTokenResponse(tokenResponse);

        this.logger.log(
          OAUTH2_SUCCESS_MESSAGES.TOKEN_ACQUIRED(token.expiresIn, token.scopes),
        );

        return token;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        // Debug error logging
        this.logger.error(
          `[OAuth2 Debug] Error Type: ${error?.constructor?.name}`,
        );
        this.logger.error(`[OAuth2 Debug] Error Message: ${errorMessage}`);

        if (error && typeof error === 'object') {
          if ('code' in error) {
            this.logger.error(
              `[OAuth2 Debug] Error Code: ${(error as { code?: string }).code}`,
            );
          }
          if ('response' in error) {
            const axiosError = error as {
              response?: {
                status?: number;
                statusText?: string;
                data?: unknown;
              };
            };

            this.logger.error(
              `[OAuth2 Debug] Response Status: ${axiosError.response?.status} ${axiosError.response?.statusText}`,
            );
            this.logger.error(
              `[OAuth2 Debug] Response Data: ${JSON.stringify(axiosError.response?.data)}`,
            );

            if (axiosError.response?.data) {
              throw OAuth2Exception.fromErrorResponse(
                axiosError.response.data as {
                  error: (typeof OAuth2ErrorCode)[keyof typeof OAuth2ErrorCode];
                  error_description?: string;
                },
              );
            }
          }
        }

        throw new OAuth2Exception(OAuth2ErrorCode.SERVER_ERROR, errorMessage);
      }
    });
  }

  private parseTokenResponse(response: OAuth2TokenResponse): OAuth2Token {
    const now = DateTime.utc();
    const expiresAt = now.plus({ seconds: response.expires_in }).toJSDate();
    const scopes = response.scope ? response.scope.split(' ') : [];

    return {
      accessToken: response.access_token,
      tokenType: response.token_type,
      expiresIn: response.expires_in,
      expiresAt,
      scopes,
      issuedAt: now.toJSDate(),
    };
  }

  /**
   * Kiểm tra token có cần refresh không.
   * Token cần refresh nếu:
   * 1. Đã expired (TTL <= 0)
   * 2. Sắp expired trong refreshThresholdSeconds
   */
  private shouldRefresh(token: OAuth2Token): boolean {
    const secondsUntilExpiry = this.getSecondsUntilExpiry(token);

    // Token đã expired
    if (secondsUntilExpiry <= 0) {
      this.logger.debug('Token expired, needs refresh');

      return true;
    }

    // Token sắp expired trong threshold
    if (secondsUntilExpiry <= this.refreshThresholdSeconds) {
      this.logger.debug(
        `Token expires in ${secondsUntilExpiry}s (threshold: ${this.refreshThresholdSeconds}s), needs refresh`,
      );

      return true;
    }

    return false;
  }

  /**
   * Kiểm tra token có còn valid để sử dụng không.
   * Khác với shouldRefresh(), method này chỉ check token đã expired chưa,
   * không tính đến threshold.
   */
  private isTokenExpired(token: OAuth2Token): boolean {
    return this.getSecondsUntilExpiry(token) <= 0;
  }

  /**
   * Tính số giây còn lại trước khi token hết hạn.
   */
  private getSecondsUntilExpiry(token: OAuth2Token): number {
    const expiresAt =
      token.expiresAt instanceof Date
        ? DateTime.fromJSDate(token.expiresAt)
        : DateTime.fromISO(String(token.expiresAt));

    return Math.floor(expiresAt.diff(DateTime.utc()).as('seconds'));
  }

  private getCacheKey(): string {
    return `${OAUTH2_CACHE_DEFAULTS.REDIS_KEY_PREFIX}:${this.clientId}`;
  }

  private startBackgroundRefresh(): void {
    this.scheduleNextRefresh(this.refreshIntervalMs);
    this.logger.log(
      `Background token refresh started (interval: ${this.refreshIntervalMs}ms)`,
    );
  }

  private scheduleNextRefresh(delayMs: number): void {
    this.refreshInterval = setTimeout(async () => {
      await this.executeBackgroundRefresh();
    }, delayMs);
  }

  private async executeBackgroundRefresh(): Promise<void> {
    try {
      const cacheKey = this.getCacheKey();
      const token = await this.cacheService.getToken(cacheKey);

      if (token && this.shouldRefresh(token)) {
        this.logger.debug('Background refresh triggered');
        await this.getAccessToken();
        this.consecutiveRefreshFailures = 0;
      }

      // Success or no refresh needed - schedule next check at normal interval
      this.scheduleNextRefresh(this.refreshIntervalMs);
    } catch (error) {
      this.consecutiveRefreshFailures++;
      const nextDelay = this.calculateBackoffDelay(error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(
        `${OAUTH2_ERROR_MESSAGES.TOKEN_REFRESH_FAILED(errorMessage)} ` +
          `(failures: ${this.consecutiveRefreshFailures}, next retry in ${nextDelay}ms)`,
      );

      // Schedule next attempt with backoff
      this.scheduleNextRefresh(nextDelay);
    }
  }

  private calculateBackoffDelay(error: unknown): number {
    // For circuit breaker open or rate limit, use longer backoff
    if (
      error instanceof CircuitBreakerOpenException ||
      error instanceof RateLimitException
    ) {
      // Use exponential backoff with jitter, capped at maxBackoffMs
      const baseDelay =
        this.refreshIntervalMs * Math.pow(2, this.consecutiveRefreshFailures);
      const jitter = baseDelay * Math.random() * 0.2;

      return Math.min(baseDelay + jitter, this.maxBackoffMs);
    }

    // For other errors, use moderate backoff
    const baseDelay =
      this.refreshIntervalMs * Math.pow(1.5, this.consecutiveRefreshFailures);
    const jitter = baseDelay * Math.random() * 0.2;

    return Math.min(baseDelay + jitter, this.maxBackoffMs);
  }

  private stopBackgroundRefresh(): void {
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval);
      this.refreshInterval = undefined;
      this.logger.log('Background token refresh stopped');
    }
  }
}
