import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  RedisRateLimiterService,
  RateLimiterConfig,
  RateLimitStatus,
  RateLimitException,
} from 'src/mkt-core/infrastructure/redis';
import {
  OAUTH2_LOG_CONTEXT,
  OAUTH2_RATE_LIMIT_DEFAULTS,
} from 'src/mkt-core/oauth2-client/constants';

// Re-export for backward compatibility
export { RateLimitException, RateLimitStatus };

const OAUTH2_RATE_LIMITER_KEY = 'oauth2-client';

/**
 * OAuth2 Rate Limiter Service
 *
 * Wrapper around RedisRateLimiterService with OAuth2-specific configuration.
 * Uses distributed Redis for rate limiting across instances.
 */
@Injectable()
export class OAuth2RateLimiterService {
  private readonly logger = new Logger(OAUTH2_LOG_CONTEXT);
  private readonly config: RateLimiterConfig;
  private readonly limiter: ReturnType<
    RedisRateLimiterService['createLimiter']
  >;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisRateLimiter: RedisRateLimiterService,
  ) {
    this.config = {
      enabled:
        this.configService.get<boolean>('oauth2Client.rateLimit.enabled') ??
        OAUTH2_RATE_LIMIT_DEFAULTS.ENABLED,
      maxAttempts:
        this.configService.get<number>('oauth2Client.rateLimit.maxAttempts') ??
        OAUTH2_RATE_LIMIT_DEFAULTS.MAX_ATTEMPTS,
      windowMs:
        this.configService.get<number>('oauth2Client.rateLimit.windowMs') ??
        OAUTH2_RATE_LIMIT_DEFAULTS.WINDOW_MS,
      keyPrefix: 'oauth2:rate-limit:',
    };

    this.limiter = this.redisRateLimiter.createLimiter(
      OAUTH2_RATE_LIMITER_KEY,
      this.config,
    );
  }

  async checkRateLimit(): Promise<void> {
    return this.limiter.checkLimit();
  }

  async recordAttempt(): Promise<void> {
    return this.limiter.recordAttempt();
  }

  async getStatus(): Promise<RateLimitStatus> {
    return this.limiter.getStatus();
  }

  async reset(): Promise<void> {
    await this.limiter.reset();
    this.logger.debug('Rate limiter reset');
  }
}
