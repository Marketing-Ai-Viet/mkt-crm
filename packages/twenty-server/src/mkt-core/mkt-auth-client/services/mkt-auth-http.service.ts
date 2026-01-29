import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';

import * as https from 'https';

import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  MKT_AUTH_CLIENT_CONFIG_KEY,
  MktAuthClientConfigFactoryResult,
} from 'src/mkt-core/mkt-auth-client/configs';
import {
  MKT_AUTH_LOG_CONTEXT,
  MKT_AUTH_HTTP_CONFIG,
  MKT_AUTH_EVENTS,
  TOKEN_INVALIDATION_REASONS,
} from 'src/mkt-core/mkt-auth-client/constants';
import {
  MktAuthReloginTriggeredEvent,
  MktAuthReloginSuccessEvent,
  MktAuthReloginFailedEvent,
  HttpMethod,
  RequestOptions,
  ApiResponse,
  RetryContext,
  MKT_AUTH_ERROR_CODE,
  MktAuthException,
  MktAuthenticationException,
  MktAuthorizationException,
  MktNotFoundException,
  MktRateLimitException,
  MktServerUnavailableException,
  MktNetworkException,
} from 'src/mkt-core/mkt-auth-client/types';

import { MktAuthClientService } from './mkt-auth-client.service';

/**
 * MKT Auth HTTP Service
 *
 * HTTP client with automatic Bearer token injection and error handling.
 * Implements Better Auth pattern: re-login on 401 (no refresh token).
 *
 * Features:
 * - Automatic Bearer token injection
 * - 401 handling: invalidate token → re-login → retry (once)
 * - 429 handling: retry with retry-after header
 * - 5xx handling: retry with exponential backoff
 * - Request/response logging
 *
 * @example
 * ```typescript
 * // GET request
 * const products = await httpService.get<Product[]>('/api/products');
 *
 * // POST request
 * const order = await httpService.post<Order>('/api/orders', { productId: '123' });
 *
 * // With options
 * const data = await httpService.get<Data>('/api/data', {
 *   params: { page: 1 },
 *   timeout: 5000,
 * });
 * ```
 */
@Injectable()
export class MktAuthHttpService {
  private readonly logger = new Logger(`${MKT_AUTH_LOG_CONTEXT}:Http`);

  // HTTPS agent for self-signed certificate support
  private readonly httpsAgent: https.Agent;

  constructor(
    @Inject(MKT_AUTH_CLIENT_CONFIG_KEY)
    private readonly config: MktAuthClientConfigFactoryResult,
    private readonly httpService: HttpService,
    private readonly authClientService: MktAuthClientService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: this.config.http.rejectUnauthorized,
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * HTTP GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * HTTP POST request
   */
  async post<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * HTTP PUT request
   */
  async put<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * HTTP PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  /**
   * HTTP DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // ============================================
  // PRIVATE METHODS - REQUEST HANDLING
  // ============================================

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const axiosConfig = await this.buildConfig(options);

    this.logger.debug(
      `${method} ${endpoint} (attempt: ${retryContext.attempt + 1})`,
    );

    try {
      const response = await this.executeRequest<T>(
        method,
        url,
        data,
        axiosConfig,
      );

      return this.unwrapResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(
        error,
        method,
        endpoint,
        data,
        options,
        retryContext,
      );
    }
  }

  private async buildConfig(
    options?: RequestOptions,
  ): Promise<AxiosRequestConfig> {
    const headers: Record<string, string> = {
      ...MKT_AUTH_HTTP_CONFIG.DEFAULT_HEADERS,
      ...options?.headers,
    };

    // Add Bearer token and Api-Key if auth is not skipped
    if (!options?.skipAuth) {
      const accessToken = await this.authClientService.getAccessToken();
      const apiKey = await this.authClientService.getApiKey();

      headers['Authorization'] = `Bearer ${accessToken}`;

      if (apiKey) {
        headers['Api-Key'] = apiKey;
      }
    }

    return {
      headers,
      params: options?.params,
      timeout: options?.timeout ?? MKT_AUTH_HTTP_CONFIG.REQUEST_TIMEOUT_MS,
      httpsAgent: this.httpsAgent,
    };
  }

  private async executeRequest<T>(
    method: HttpMethod,
    url: string,
    data: Record<string, unknown> | undefined,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    switch (method) {
      case 'GET':
        return firstValueFrom(
          this.httpService.get<ApiResponse<T>>(url, config),
        );
      case 'POST':
        return firstValueFrom(
          this.httpService.post<ApiResponse<T>>(url, data, config),
        );
      case 'PUT':
        return firstValueFrom(
          this.httpService.put<ApiResponse<T>>(url, data, config),
        );
      case 'PATCH':
        return firstValueFrom(
          this.httpService.patch<ApiResponse<T>>(url, data, config),
        );
      case 'DELETE':
        return firstValueFrom(
          this.httpService.delete<ApiResponse<T>>(url, config),
        );
    }
  }

  private unwrapResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const responseData = response.data;

    // If response has a 'data' property, return it
    if (
      responseData &&
      typeof responseData === 'object' &&
      'data' in responseData &&
      responseData.data !== undefined
    ) {
      return responseData.data as T;
    }

    // Otherwise, return the entire response data
    return responseData as T;
  }

  // ============================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================

  private async handleError<T>(
    error: unknown,
    method: HttpMethod,
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
  ): Promise<T> {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data as Record<string, unknown>;
    const message =
      responseData?.error ?? responseData?.message ?? axiosError.message;

    // ============================================
    // 401 HANDLING - TOKEN EXPIRED, RE-LOGIN REQUIRED
    // ============================================
    if (status === 401) {
      return this.handleUnauthorized<T>(
        method,
        endpoint,
        data,
        options,
        retryContext,
        String(message),
      );
    }

    // ============================================
    // 403 - AUTHORIZATION DENIED (no retry)
    // ============================================
    if (status === 403) {
      this.logger.warn(
        `${method} ${endpoint} - Authorization denied: ${message}`,
      );
      throw new MktAuthorizationException(String(message));
    }

    // ============================================
    // 404 - RESOURCE NOT FOUND (no retry)
    // ============================================
    if (status === 404) {
      this.logger.warn(`${method} ${endpoint} - Resource not found`);
      throw new MktNotFoundException('Resource', endpoint);
    }

    // ============================================
    // 429 - RATE LIMITED (retry with retry-after)
    // ============================================
    if (status === 429) {
      return this.handleRateLimit<T>(
        axiosError,
        method,
        endpoint,
        data,
        options,
        retryContext,
      );
    }

    // ============================================
    // 5xx - SERVER ERROR (retry with exponential backoff)
    // ============================================
    if (status && status >= 500) {
      return this.handleServerError<T>(
        status,
        method,
        endpoint,
        data,
        options,
        retryContext,
        String(message),
      );
    }

    // ============================================
    // OTHER ERRORS
    // ============================================
    this.logger.error(
      `${method} ${endpoint} failed: [${status ?? 'NETWORK'}] ${message}`,
    );

    // Network errors (no status code)
    if (!status) {
      throw new MktNetworkException(String(message));
    }

    throw new MktAuthException(
      String(message),
      MKT_AUTH_ERROR_CODE.NETWORK_ERROR,
      status,
    );
  }

  /**
   * Handle 401 Unauthorized - Token expired, need to re-login
   *
   * Flow:
   * 1. First 401 → Invalidate token → Re-login (via getAccessToken) → Retry request
   * 2. 401 after re-login → Throw MktAuthenticationException (credentials invalid)
   *
   * IMPORTANT: Only retry once after re-login to prevent infinite loop
   */
  private async handleUnauthorized<T>(
    method: HttpMethod,
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
    errorMessage?: string,
  ): Promise<T> {
    // If already re-authenticated and still 401 → credentials are invalid
    if (retryContext.hasReauthenticated) {
      this.logger.error(
        `401 after re-authentication - credentials may be invalid or account disabled`,
      );

      const failedEvent: MktAuthReloginFailedEvent = {
        reason: 'Failed after re-authentication',
        statusCode: 401,
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      };

      this.eventEmitter.emit(MKT_AUTH_EVENTS.RELOGIN_FAILED, failedEvent);

      throw new MktAuthenticationException(
        `Authentication failed after re-login: ${errorMessage}. ` +
          `Please verify MKT_AUTH_EMAIL and MKT_AUTH_PASSWORD are correct.`,
      );
    }

    // First 401 → Emit event and attempt re-authentication
    this.logger.warn(
      `Received 401 Unauthorized for ${method} ${endpoint}. ` +
        `Token may have expired. Attempting re-authentication...`,
    );

    const triggeredEvent: MktAuthReloginTriggeredEvent = {
      reason: `401 response from ${method} ${endpoint}`,
      originalRequestUrl: endpoint,
      timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
    };

    this.eventEmitter.emit(MKT_AUTH_EVENTS.RELOGIN_TRIGGERED, triggeredEvent);

    try {
      // Step 1: Invalidate cached token
      await this.authClientService.invalidateToken(
        TOKEN_INVALIDATION_REASONS.UNAUTHORIZED_RESPONSE,
      );

      // Step 2: Force re-login by getting new access token
      // getAccessToken() will detect cache miss and sign-in again
      await this.authClientService.getAccessToken();

      // Step 3: Emit success event
      const metadata = await this.authClientService.getTokenMetadata();
      const successEvent: MktAuthReloginSuccessEvent = {
        userEmail: metadata?.userEmail,
        expiresAt: metadata?.acquiredAt ?? '',
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      };

      this.eventEmitter.emit(MKT_AUTH_EVENTS.RELOGIN_SUCCESS, successEvent);

      this.logger.debug(
        `Re-authentication successful, retrying ${method} ${endpoint}...`,
      );

      // Step 4: Retry request with new token
      return this.request<T>(method, endpoint, data, options, {
        attempt: retryContext.attempt,
        hasReauthenticated: true, // Mark that we've re-authenticated
      });
    } catch (reAuthError) {
      // Re-login failed
      this.logger.error('Re-authentication failed', reAuthError);

      const failedEvent: MktAuthReloginFailedEvent = {
        reason:
          reAuthError instanceof Error
            ? reAuthError.message
            : String(reAuthError),
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
      };

      this.eventEmitter.emit(MKT_AUTH_EVENTS.RELOGIN_FAILED, failedEvent);

      throw new MktAuthenticationException(
        `Failed to re-authenticate: ${reAuthError instanceof Error ? reAuthError.message : String(reAuthError)}`,
      );
    }
  }

  /**
   * Handle 429 Rate Limit - Wait and retry if retry-after header is present
   */
  private async handleRateLimit<T>(
    axiosError: AxiosError,
    method: HttpMethod,
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
  ): Promise<T> {
    const retryAfterHeader = axiosError.response?.headers['retry-after'];
    const retryAfterMs = retryAfterHeader
      ? parseInt(retryAfterHeader, 10) * 1000
      : undefined;

    // Retry if we have retry attempts left and retry-after header
    if (retryContext.attempt < this.config.retry.maxAttempts && retryAfterMs) {
      this.logger.warn(
        `Rate limited on ${method} ${endpoint}, waiting ${Math.ceil(retryAfterMs / 1000)}s before retry...`,
      );

      await this.delay(retryAfterMs);

      return this.request<T>(method, endpoint, data, options, {
        ...retryContext,
        attempt: retryContext.attempt + 1,
      });
    }

    // No retry-after or max attempts exceeded
    this.logger.error(
      `Rate limit exceeded for ${method} ${endpoint} (no retry-after or max attempts exceeded)`,
    );
    throw new MktRateLimitException(retryAfterMs);
  }

  /**
   * Handle 5xx Server Error - Retry with exponential backoff
   */
  private async handleServerError<T>(
    status: number,
    method: HttpMethod,
    endpoint: string,
    data?: Record<string, unknown>,
    options?: RequestOptions,
    retryContext: RetryContext = { attempt: 0, hasReauthenticated: false },
    errorMessage?: string,
  ): Promise<T> {
    // Retry if we have retry attempts left
    if (retryContext.attempt < this.config.retry.maxAttempts) {
      const backoffMs = this.calculateBackoff(retryContext.attempt);

      this.logger.warn(
        `Server error ${status} for ${method} ${endpoint}, ` +
          `retrying in ${Math.ceil(backoffMs / 1000)}s (attempt ${retryContext.attempt + 1}/${this.config.retry.maxAttempts})...`,
      );

      await this.delay(backoffMs);

      return this.request<T>(method, endpoint, data, options, {
        ...retryContext,
        attempt: retryContext.attempt + 1,
      });
    }

    // Max attempts exceeded
    this.logger.error(
      `Server error ${status} for ${method} ${endpoint} after ${retryContext.attempt} retries: ${errorMessage}`,
    );
    throw new MktServerUnavailableException(
      `Server error ${status} after ${retryContext.attempt} retries: ${errorMessage}`,
    );
  }

  // ============================================
  // PRIVATE METHODS - UTILITIES
  // ============================================

  private calculateBackoff(attempt: number): number {
    const delay =
      this.config.retry.initialDelayMs *
      Math.pow(this.config.retry.backoffMultiplier, attempt);

    return Math.min(delay, this.config.retry.maxDelayMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
