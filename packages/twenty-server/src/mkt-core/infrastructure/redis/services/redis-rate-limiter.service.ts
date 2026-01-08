import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  REDIS_LOG_CONTEXT,
  REDIS_RATE_LIMITER_DEFAULTS,
} from 'src/mkt-core/infrastructure/redis/constants';
import {
  RateLimiterConfig,
  RateLimitException,
  RateLimitStatus,
} from 'src/mkt-core/infrastructure/redis/types';

// ============================================
// REDIS STATE TYPE
// ============================================

type RedisRateLimitState = {
  attempts: number[]; // Timestamps in milliseconds
  windowStartMs: number;
};

/**
 * Distributed Rate Limiter using Redis
 *
 * Uses sliding window algorithm for accurate rate limiting.
 * Falls back to in-memory when Redis is unavailable.
 */
@Injectable()
export class RedisRateLimiterService {
  private readonly logger = new Logger(`${REDIS_LOG_CONTEXT}:RateLimiter`);

  // In-memory fallback
  private readonly localAttempts: Map<string, DateTime[]> = new Map();

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOAuth2)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Create a rate limiter instance for a specific service
   */
  createLimiter(name: string, config: RateLimiterConfig = {}) {
    const mergedConfig = this.mergeConfig(config);
    const cacheKey = this.buildKey(name, mergedConfig.keyPrefix);

    return {
      checkLimit: () => this.checkRateLimit(cacheKey, mergedConfig),
      recordAttempt: () => this.recordAttempt(cacheKey, mergedConfig),
      getStatus: () => this.getStatus(cacheKey, mergedConfig),
      reset: () => this.reset(cacheKey),
    };
  }

  /**
   * Check if rate limit allows request
   * @throws RateLimitException if limit exceeded
   */
  async checkRateLimit(
    key: string,
    config: RateLimiterConfig = {},
  ): Promise<void> {
    const mergedConfig = this.mergeConfig(config);

    if (!mergedConfig.enabled) {
      return;
    }

    const attempts = await this.getAttempts(key, mergedConfig);
    const validAttempts = this.cleanupOldAttempts(
      attempts,
      mergedConfig.windowMs,
    );

    if (validAttempts.length >= mergedConfig.maxAttempts) {
      const oldestAttempt = validAttempts[0];
      const retryAfterMs =
        oldestAttempt + mergedConfig.windowMs - DateTime.utc().toMillis();

      throw new RateLimitException(Math.max(0, retryAfterMs));
    }
  }

  /**
   * Record an attempt
   */
  async recordAttempt(
    key: string,
    config: RateLimiterConfig = {},
  ): Promise<void> {
    const mergedConfig = this.mergeConfig(config);

    if (!mergedConfig.enabled) {
      return;
    }

    const attempts = await this.getAttempts(key, mergedConfig);
    const validAttempts = this.cleanupOldAttempts(
      attempts,
      mergedConfig.windowMs,
    );

    validAttempts.push(DateTime.utc().toMillis());

    await this.setAttempts(key, validAttempts, mergedConfig);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(
    key: string,
    config: RateLimiterConfig = {},
  ): Promise<RateLimitStatus> {
    const mergedConfig = this.mergeConfig(config);
    const attempts = await this.getAttempts(key, mergedConfig);
    const validAttempts = this.cleanupOldAttempts(
      attempts,
      mergedConfig.windowMs,
    );

    const isLimited = validAttempts.length >= mergedConfig.maxAttempts;
    let retryAfterMs: number | undefined;

    if (isLimited && validAttempts.length > 0) {
      const oldestAttempt = validAttempts[0];

      retryAfterMs = Math.max(
        0,
        oldestAttempt + mergedConfig.windowMs - DateTime.utc().toMillis(),
      );
    }

    return {
      enabled: mergedConfig.enabled,
      currentAttempts: validAttempts.length,
      maxAttempts: mergedConfig.maxAttempts,
      windowMs: mergedConfig.windowMs,
      isLimited,
      retryAfterMs,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    this.localAttempts.delete(key);

    try {
      await this.cacheStorage.del(key);
    } catch {
      this.logger.debug('Redis unavailable during reset');
    }

    this.logger.debug(`Rate limiter [${key}] reset`);
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  private async getAttempts(
    key: string,
    _config: Required<RateLimiterConfig>,
  ): Promise<number[]> {
    try {
      const cached = await this.cacheStorage.get<RedisRateLimitState>(key);

      if (cached?.attempts) {
        return cached.attempts;
      }
    } catch {
      this.logger.debug('Redis unavailable, using local state');
    }

    // Fallback to local state
    const localAttempts = this.localAttempts.get(key) ?? [];

    return localAttempts.map((dt) => dt.toMillis());
  }

  private async setAttempts(
    key: string,
    attempts: number[],
    config: Required<RateLimiterConfig>,
  ): Promise<void> {
    // Update local state
    this.localAttempts.set(
      key,
      attempts.map((ts) => DateTime.fromMillis(ts)),
    );

    try {
      const state: RedisRateLimitState = {
        attempts,
        windowStartMs: DateTime.utc().toMillis(),
      };

      await this.cacheStorage.set(key, state, config.windowMs);
    } catch {
      this.logger.debug('Redis unavailable, using local state only');
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private cleanupOldAttempts(attempts: number[], windowMs: number): number[] {
    const cutoffTime = DateTime.utc().toMillis() - windowMs;

    return attempts.filter((ts) => ts > cutoffTime);
  }

  private mergeConfig(config: RateLimiterConfig): Required<RateLimiterConfig> {
    return {
      enabled: config.enabled ?? REDIS_RATE_LIMITER_DEFAULTS.ENABLED,
      maxAttempts:
        config.maxAttempts ?? REDIS_RATE_LIMITER_DEFAULTS.MAX_ATTEMPTS,
      windowMs: config.windowMs ?? REDIS_RATE_LIMITER_DEFAULTS.WINDOW_MS,
      keyPrefix: config.keyPrefix ?? REDIS_RATE_LIMITER_DEFAULTS.KEY_PREFIX,
    };
  }

  private buildKey(name: string, prefix: string): string {
    return `${prefix}${name}`;
  }
}
