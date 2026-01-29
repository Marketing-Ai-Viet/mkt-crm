import { Inject, Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonParse, safeJsonStringify } from 'src/mkt-core/utils/json.util';
import {
  MKT_AUTH_LOG_CONTEXT,
  MKT_AUTH_CACHE_PREFIX,
} from 'src/mkt-core/mkt-auth-client/constants';
import {
  MKT_AUTH_CLIENT_CONFIG_KEY,
  MktAuthClientConfigFactoryResult,
} from 'src/mkt-core/mkt-auth-client/configs';
import {
  MktAuthTokenData,
  LocalCacheEntry,
  CacheMetrics,
} from 'src/mkt-core/mkt-auth-client/types';

/**
 * MKT Auth Cache Service
 *
 * Provides two-tier caching for authentication tokens:
 * - Local in-memory cache (fast, single-instance)
 * - Redis distributed cache (shared across instances)
 *
 * Cache lookup order:
 * 1. Check local cache → return if valid
 * 2. Check Redis cache → populate local cache and return
 * 3. Return null (cache miss)
 *
 * @example
 * ```typescript
 * // Get token from cache
 * const token = await cacheService.get();
 *
 * // Set token in cache
 * await cacheService.set(tokenData);
 *
 * // Clear cache
 * await cacheService.clear();
 * ```
 */
@Injectable()
export class MktAuthCacheService {
  private readonly logger = new Logger(`${MKT_AUTH_LOG_CONTEXT}:Cache`);

  // Local in-memory cache (single token)
  private localCache: LocalCacheEntry<MktAuthTokenData> | null = null;

  // Computed Redis TTL (serverTtlMs - bufferMs)
  private readonly redisTtlMs: number;

  // Metrics for monitoring
  private readonly metrics: CacheMetrics = {
    localHits: 0,
    redisHits: 0,
    misses: 0,
  };

  constructor(
    @Inject(MKT_AUTH_CLIENT_CONFIG_KEY)
    private readonly config: MktAuthClientConfigFactoryResult,
    @InjectCacheStorage(CacheStorageNamespace.MktAuth)
    private readonly cacheStorage: CacheStorageService,
  ) {
    // Compute Redis TTL from token config
    this.redisTtlMs =
      this.config.token.serverTtlMs - this.config.token.bufferMs;
    this.logger.debug(
      `Initialized with redisTtlMs: ${this.redisTtlMs}ms ` +
        `(server: ${this.config.token.serverTtlMs}ms - buffer: ${this.config.token.bufferMs}ms)`,
    );
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get token from cache (local first, then Redis)
   */
  async get(): Promise<MktAuthTokenData | null> {
    // Check local in-memory cache first
    const localToken = this.getFromLocalCache();

    if (localToken) {
      this.metrics.localHits++;
      this.logger.debug('Cache HIT (local)');

      return localToken;
    }

    // Try Redis
    const redisToken = await this.getFromRedisCache();

    if (redisToken) {
      // Populate local cache
      this.setLocalCache(redisToken);
      this.metrics.redisHits++;
      this.logger.debug('Cache HIT (Redis)');

      return redisToken;
    }

    this.metrics.misses++;
    this.logger.debug('Cache MISS');

    return null;
  }

  /**
   * Set token in cache (both local and Redis)
   */
  async set(token: MktAuthTokenData): Promise<void> {
    // Set local in-memory cache
    this.setLocalCache(token);

    // Set Redis cache
    await this.setRedisCache(token);

    this.logger.debug('Token cached (local + Redis)');
  }

  /**
   * Clear token from all caches
   */
  async clear(): Promise<void> {
    // Clear local cache
    this.localCache = null;

    // Clear Redis cache
    try {
      await this.cacheStorage.del(MKT_AUTH_CACHE_PREFIX.TOKEN);
      this.logger.debug('Cache cleared');
    } catch (error) {
      this.logger.warn('Failed to clear Redis cache', error);
    }
  }

  /**
   * Check if token exists in local cache
   */
  hasLocalToken(): boolean {
    return this.getFromLocalCache() !== null;
  }

  /**
   * Check if token is expiring soon
   */
  isExpiringSoon(token: MktAuthTokenData, thresholdMs: number): boolean {
    const expiresAt = DateTimeUtils.fromISO(token.expiresAt);
    const now = DateTimeUtils.now();
    const threshold = DateTimeUtils.add(now, { milliseconds: thresholdMs });

    return (
      DateTimeUtils.toMillis(expiresAt) <= DateTimeUtils.toMillis(threshold)
    );
  }

  /**
   * Get computed Redis TTL
   */
  getRedisTtlMs(): number {
    return this.redisTtlMs;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics.localHits = 0;
    this.metrics.redisHits = 0;
    this.metrics.misses = 0;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private getFromLocalCache(): MktAuthTokenData | null {
    if (!this.localCache) {
      return null;
    }

    const now = DateTimeUtils.toMillis(DateTimeUtils.now());

    // Check if local cache expired
    if (now >= this.localCache.expiresAt) {
      this.localCache = null;

      return null;
    }

    // Check if token itself expired
    if (this.isTokenExpired(this.localCache.value)) {
      this.localCache = null;

      return null;
    }

    return this.localCache.value;
  }

  private async getFromRedisCache(): Promise<MktAuthTokenData | null> {
    try {
      const cached = await this.cacheStorage.get<string>(
        MKT_AUTH_CACHE_PREFIX.TOKEN,
      );

      if (!cached) {
        return null;
      }

      const parseResult = safeJsonParse<MktAuthTokenData>(cached, {
        logger: this.logger,
        context: 'Parse cached token',
      });

      if (!parseResult.success) {
        // Invalid cache data, clear it
        await this.cacheStorage.del(MKT_AUTH_CACHE_PREFIX.TOKEN);

        return null;
      }

      const token = parseResult.data;

      // Check if token expired
      if (this.isTokenExpired(token)) {
        this.logger.debug('Cached token expired, clearing');
        await this.cacheStorage.del(MKT_AUTH_CACHE_PREFIX.TOKEN);

        return null;
      }

      return token;
    } catch (error) {
      this.logger.warn('Failed to get token from Redis cache', error);

      return null;
    }
  }

  private setLocalCache(token: MktAuthTokenData): void {
    const now = DateTimeUtils.toMillis(DateTimeUtils.now());

    this.localCache = {
      value: token,
      createdAt: now,
      expiresAt: now + this.config.cache.localTtlMs,
    };
  }

  private async setRedisCache(token: MktAuthTokenData): Promise<void> {
    try {
      const jsonData = safeJsonStringify(token, {
        logger: this.logger,
        context: 'Stringify token for cache',
      });

      if (jsonData) {
        await this.cacheStorage.set(
          MKT_AUTH_CACHE_PREFIX.TOKEN,
          jsonData,
          this.redisTtlMs,
        );
        this.logger.debug(`Token saved to Redis (TTL: ${this.redisTtlMs}ms)`);
      }
    } catch (error) {
      this.logger.warn('Failed to save token to Redis cache', error);
    }
  }

  private isTokenExpired(token: MktAuthTokenData): boolean {
    const expiresAt = DateTimeUtils.fromISO(token.expiresAt);
    const now = DateTimeUtils.now();

    return DateTimeUtils.toMillis(now) >= DateTimeUtils.toMillis(expiresAt);
  }
}
