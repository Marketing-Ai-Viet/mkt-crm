import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DateTime } from 'luxon';

import { OAUTH2_RATE_LIMIT_DEFAULTS } from 'src/mkt-core/oauth2-client/constants';
import {
  RateLimitException,
  RateLimitStatus,
} from 'src/mkt-core/oauth2-client/types';

@Injectable()
export class OAuth2RateLimiterService {
  private readonly attempts: DateTime[] = [];
  private readonly enabled: boolean;
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<boolean>('oauth2Client.rateLimit.enabled') ??
      OAUTH2_RATE_LIMIT_DEFAULTS.ENABLED;
    this.maxAttempts =
      this.configService.get<number>('oauth2Client.rateLimit.maxAttempts') ??
      OAUTH2_RATE_LIMIT_DEFAULTS.MAX_ATTEMPTS;
    this.windowMs =
      this.configService.get<number>('oauth2Client.rateLimit.windowMs') ??
      OAUTH2_RATE_LIMIT_DEFAULTS.WINDOW_MS;
  }

  checkRateLimit(): void {
    if (!this.enabled) {
      return;
    }

    this.cleanupOldAttempts();

    if (this.attempts.length >= this.maxAttempts) {
      const oldestAttempt = this.attempts[0];
      const retryAfterMs =
        oldestAttempt.toMillis() + this.windowMs - DateTime.utc().toMillis();

      throw new RateLimitException(retryAfterMs);
    }
  }

  recordAttempt(): void {
    if (!this.enabled) {
      return;
    }

    this.attempts.push(DateTime.utc());
    this.cleanupOldAttempts();
  }

  getStatus(): RateLimitStatus {
    this.cleanupOldAttempts();

    const isLimited = this.attempts.length >= this.maxAttempts;
    let retryAfterMs: number | undefined;

    if (isLimited && this.attempts.length > 0) {
      const oldestAttempt = this.attempts[0];

      retryAfterMs = Math.max(
        0,
        oldestAttempt.toMillis() + this.windowMs - DateTime.utc().toMillis(),
      );
    }

    return {
      enabled: this.enabled,
      currentAttempts: this.attempts.length,
      maxAttempts: this.maxAttempts,
      windowMs: this.windowMs,
      isLimited,
      retryAfterMs,
    };
  }

  reset(): void {
    this.attempts.length = 0;
  }

  private cleanupOldAttempts(): void {
    const cutoffTime = DateTime.utc().minus({ milliseconds: this.windowMs });

    while (this.attempts.length > 0 && this.attempts[0] < cutoffTime) {
      this.attempts.shift();
    }
  }
}
