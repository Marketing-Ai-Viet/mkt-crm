import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

import { AxiosRequestConfig, AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import {
  OAUTH2_HTTP_DEFAULTS,
  OAUTH2_LOG_CONTEXT,
} from 'src/mkt-core/oauth2-client/constants';
import { UserContext } from 'src/mkt-core/oauth2-client/types';

import { OAuth2ClientService } from './oauth2-client.service';

@Injectable()
export class OAuth2HttpService {
  private readonly logger = new Logger(OAUTH2_LOG_CONTEXT);
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly oauth2ClientService: OAuth2ClientService,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries =
      this.configService.get<number>('oauth2Client.http.maxRetries') ??
      OAUTH2_HTTP_DEFAULTS.MAX_RETRIES;
    this.retryDelayMs =
      this.configService.get<number>('oauth2Client.http.retryDelayMs') ??
      OAUTH2_HTTP_DEFAULTS.RETRY_DELAY_MS;
    this.timeoutMs =
      this.configService.get<number>('oauth2Client.http.timeoutMs') ??
      OAUTH2_HTTP_DEFAULTS.TIMEOUT_MS;
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    userContext?: UserContext,
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const token = await this.oauth2ClientService.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.get<T>(
          url,
          this.buildConfig(config, token, userContext),
        ),
      );

      return response.data;
    });
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    userContext?: UserContext,
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const token = await this.oauth2ClientService.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.post<T>(
          url,
          data,
          this.buildConfig(config, token, userContext),
        ),
      );

      return response.data;
    });
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    userContext?: UserContext,
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const token = await this.oauth2ClientService.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.put<T>(
          url,
          data,
          this.buildConfig(config, token, userContext),
        ),
      );

      return response.data;
    });
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    userContext?: UserContext,
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const token = await this.oauth2ClientService.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.patch<T>(
          url,
          data,
          this.buildConfig(config, token, userContext),
        ),
      );

      return response.data;
    });
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
    userContext?: UserContext,
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const token = await this.oauth2ClientService.getAccessToken();
      const response = await firstValueFrom(
        this.httpService.delete<T>(
          url,
          this.buildConfig(config, token, userContext),
        ),
      );

      return response.data;
    });
  }

  private buildConfig(
    config?: AxiosRequestConfig,
    token?: string,
    userContext?: UserContext,
  ): AxiosRequestConfig {
    const headers: Record<string, string> = {
      ...(config?.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (userContext?.userId) {
      headers['X-User-Id'] = userContext.userId;
    }

    if (userContext?.userName) {
      headers['X-User-Name'] = userContext.userName;
    }

    return {
      ...config,
      headers,
      timeout: config?.timeout ?? this.timeoutMs,
    };
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    // maxRetries = number of retries after first attempt
    // Total attempts = 1 (initial) + maxRetries
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        if (this.isUnauthorizedError(error)) {
          this.logger.debug('Received 401, invalidating token and retrying...');
          await this.oauth2ClientService.invalidateToken();
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateDelayWithJitter(attempt);

          this.logger.debug(
            `Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`,
          );
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  private calculateDelayWithJitter(attempt: number): number {
    const baseDelay = this.retryDelayMs * Math.pow(2, attempt);
    // Add random jitter: 0-20% of base delay
    const jitter = baseDelay * Math.random() * 0.2;

    return Math.floor(baseDelay + jitter);
  }

  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Don't retry client errors (4xx) except 401, 408, 429
    if (this.isNonRetryableClientError(error)) {
      return false;
    }

    if (this.isUnauthorizedError(error)) {
      return true;
    }

    if (this.isRetryableError(error)) {
      return true;
    }

    return false;
  }

  private isNonRetryableClientError(error: unknown): boolean {
    if (!(error instanceof AxiosError)) {
      return false;
    }

    const status = error.response?.status;

    if (!status || status < 400 || status >= 500) {
      return false;
    }

    // Allow retry for 401 (Unauthorized), 408 (Request Timeout), 429 (Too Many Requests)
    const retryableClientErrors = [401, 408, 429];

    return !retryableClientErrors.includes(status);
  }

  private isUnauthorizedError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return error.response?.status === 401;
    }

    return false;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;

      if (status && status >= 500) {
        return true;
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return true;
      }
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
