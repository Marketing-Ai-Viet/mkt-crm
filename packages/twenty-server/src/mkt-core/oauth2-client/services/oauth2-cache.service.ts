import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DateTime } from 'luxon';

import {
  RedisCacheService,
  CacheStats,
  CacheInstance,
} from 'src/mkt-core/infrastructure/redis';
import {
  OAUTH2_CACHE_DEFAULTS,
  OAUTH2_LOG_CONTEXT,
  OAUTH2_SUCCESS_MESSAGES,
} from 'src/mkt-core/oauth2-client/constants';
import { OAuth2Token } from 'src/mkt-core/oauth2-client/types';

// Re-export CacheStats as OAuth2CacheStats for backward compatibility
export type OAuth2CacheStats = CacheStats;

const OAUTH2_CACHE_NAME = 'oauth2-token';

/**
 * OAuth2 Cache Service
 *
 * Wrapper around RedisCacheService with OAuth2-specific token handling.
 * Provides token expiration validation on top of cache operations.
 */
@Injectable()
export class OAuth2CacheService {
  private readonly logger = new Logger(OAUTH2_LOG_CONTEXT);
  private readonly redisTtlMs: number;
  private readonly cache: CacheInstance<OAuth2Token>;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService,
  ) {
    const redisTtlSeconds =
      this.configService.get<number>('oauth2Client.cache.redisTtlSeconds') ??
      OAUTH2_CACHE_DEFAULTS.REDIS_TTL_SECONDS;

    this.redisTtlMs = redisTtlSeconds * 1000;

    // Create a named cache instance for OAuth2 tokens
    // Note: Namespace 'mkt:oauth2' already provides context, so use minimal prefix
    this.cache = this.redisCacheService.createCache<OAuth2Token>(
      OAUTH2_CACHE_NAME,
      { keyPrefix: 'token:' },
    );
  }

  async getToken(key: string): Promise<OAuth2Token | undefined> {
    const token = await this.cache.get(key);

    if (token && !this.isExpired(token)) {
      this.logger.debug(OAUTH2_SUCCESS_MESSAGES.CACHE_HIT_LRU());

      return token;
    }

    return undefined;
  }

  async setToken(key: string, token: OAuth2Token): Promise<void> {
    await this.cache.set(key, token, this.redisTtlMs);
  }

  async invalidateToken(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    await this.cache.clearByPattern(pattern);
  }

  getStats(): OAuth2CacheStats {
    return this.redisCacheService.getStats();
  }

  isRedisConnected(): boolean {
    return this.redisCacheService.isRedisConnected();
  }

  // ==================== Utility Methods ====================

  private isExpired(token: OAuth2Token): boolean {
    const expiresAt = DateTime.fromJSDate(token.expiresAt);

    return DateTime.utc() >= expiresAt;
  }
}
