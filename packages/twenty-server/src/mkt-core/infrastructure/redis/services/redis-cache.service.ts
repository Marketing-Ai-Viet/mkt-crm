import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { DateTime } from 'luxon';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  REDIS_CACHE_DEFAULTS,
  REDIS_HEALTH_DEFAULTS,
  REDIS_LOG_CONTEXT,
} from 'src/mkt-core/infrastructure/redis/constants';
import {
  CacheConfig,
  CacheInstance,
  CacheStats,
  HealthCheckConfig,
  RedisHealthStatus,
} from 'src/mkt-core/infrastructure/redis/types';

// ============================================
// LRU CACHE IMPLEMENTATION
// ============================================

type LRUCacheEntry<T> = {
  value: T;
  expiresAt: DateTime;
};

class SimpleLRUCache<K, V> {
  private readonly cache = new Map<K, LRUCacheEntry<V>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(options: { max: number; ttl: number }) {
    this.maxSize = options.max;
    this.ttlMs = options.ttl;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (DateTime.utc() > entry.expiresAt) {
      this.cache.delete(key);

      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V, customTtlMs?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;

      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: DateTime.utc().plus({
        milliseconds: customTtlMs ?? this.ttlMs,
      }),
    });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ============================================
// CACHE SERVICE OPTIONS
// ============================================

export type RedisCacheServiceOptions = CacheConfig & HealthCheckConfig;

export const REDIS_CACHE_OPTIONS = Symbol('REDIS_CACHE_OPTIONS');

/**
 * Distributed Cache Service using Redis with LRU fallback
 *
 * Features:
 * - Two-tier caching: LRU (memory) + Redis
 * - Automatic health checks with configurable intervals
 * - Graceful degradation when Redis is unavailable
 * - Namespace isolation
 */
@Injectable()
export class RedisCacheService<T = unknown>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(`${REDIS_LOG_CONTEXT}:Cache`);
  private readonly lruCache: SimpleLRUCache<string, T>;

  // Config
  private readonly lruMax: number;
  private readonly lruTtlMs: number;
  private readonly redisTtlMs: number;
  private readonly keyPrefix: string;

  // Health check config
  private readonly healthCheckEnabled: boolean;
  private readonly healthCheckIntervalMs: number;
  private readonly healthCheckTimeoutMs: number;
  private readonly unhealthyThreshold: number;

  // Redis health state
  private redisConnected = true;
  private lastRedisErrorAt?: DateTime;
  private redisFallbackCount = 0;

  // Health check state
  private lastHealthCheckAt?: DateTime;
  private healthCheckLatencyMs?: number;
  private consecutiveFailures = 0;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private isHealthCheckRunning = false;
  private lastSuccessAt?: DateTime;

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOAuth2)
    private readonly cacheStorage: CacheStorageService,
  ) {
    // Use default options - override with configure() method
    this.lruMax = REDIS_CACHE_DEFAULTS.LRU_MAX;
    this.lruTtlMs = REDIS_CACHE_DEFAULTS.LRU_TTL_MS;
    this.redisTtlMs = REDIS_CACHE_DEFAULTS.REDIS_TTL_SECONDS * 1000;
    this.keyPrefix = REDIS_CACHE_DEFAULTS.KEY_PREFIX;

    this.lruCache = new SimpleLRUCache<string, T>({
      max: this.lruMax,
      ttl: this.lruTtlMs,
    });

    // Health check defaults
    this.healthCheckEnabled = REDIS_HEALTH_DEFAULTS.ENABLED;
    this.healthCheckIntervalMs = REDIS_HEALTH_DEFAULTS.INTERVAL_MS;
    this.healthCheckTimeoutMs = REDIS_HEALTH_DEFAULTS.TIMEOUT_MS;
    this.unhealthyThreshold = REDIS_HEALTH_DEFAULTS.UNHEALTHY_THRESHOLD;
  }

  /**
   * Create a configured cache instance for specific use case
   */
  createCache<V = T>(
    name: string,
    options: RedisCacheServiceOptions = {},
  ): CacheInstance<V> {
    const keyPrefix = options.keyPrefix ?? `${this.keyPrefix}${name}:`;

    return {
      get: (key: string) =>
        this.get(`${keyPrefix}${key}`) as Promise<V | undefined>,
      set: (key: string, value: V, ttlMs?: number) =>
        this.set(`${keyPrefix}${key}`, value as unknown as T, ttlMs),
      delete: (key: string) => this.delete(`${keyPrefix}${key}`),
      clearByPattern: (pattern: string) =>
        this.clearByPattern(`${keyPrefix}${pattern}`),
    };
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async onModuleInit(): Promise<void> {
    if (!this.healthCheckEnabled) {
      return;
    }

    this.validateHealthCheckConfig();
    await this.performHealthCheck();
    this.startHealthCheckLoop();
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }

  // ============================================
  // PUBLIC CACHE API
  // ============================================

  /**
   * Get value from cache (LRU first, then Redis)
   */
  async get(key: string): Promise<T | undefined> {
    const fullKey = this.buildKey(key);

    // Check LRU first
    const lruValue = this.lruCache.get(fullKey);

    if (lruValue !== undefined) {
      this.logger.debug(`Cache HIT (LRU): ${key}`);

      return lruValue;
    }

    // Skip Redis if unhealthy
    if (!this.redisConnected) {
      this.logger.debug('Redis unhealthy, skipping Redis lookup');

      return undefined;
    }

    try {
      const redisValue = await this.cacheStorage.get<T>(fullKey);

      this.markRedisSuccess();

      if (redisValue !== undefined && redisValue !== null) {
        this.logger.debug(`Cache HIT (Redis): ${key}`);
        this.lruCache.set(fullKey, redisValue);

        return redisValue;
      }
    } catch {
      this.markRedisError();
      this.logger.warn('Redis unavailable during get');
    }

    return undefined;
  }

  /**
   * Set value in cache (both LRU and Redis)
   */
  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const effectiveTtlMs = ttlMs ?? this.redisTtlMs;

    this.lruCache.set(fullKey, value, Math.min(effectiveTtlMs, this.lruTtlMs));

    if (!this.redisConnected) {
      this.logger.debug('Redis unhealthy, skipping Redis write');

      return;
    }

    try {
      await this.cacheStorage.set(fullKey, value, effectiveTtlMs);
      this.markRedisSuccess();
    } catch {
      this.markRedisError();
      this.logger.warn('Redis unavailable during set');
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);

    this.lruCache.delete(fullKey);

    if (!this.redisConnected) {
      this.logger.debug('Redis unhealthy, skipping Redis delete');

      return;
    }

    try {
      await this.cacheStorage.del(fullKey);
      this.markRedisSuccess();
    } catch {
      this.markRedisError();
      this.logger.warn('Redis unavailable during delete');
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern: string): Promise<void> {
    this.lruCache.clear();

    if (!this.redisConnected) {
      this.logger.debug('Redis unhealthy, skipping Redis flush');

      return;
    }

    try {
      await this.cacheStorage.flushByPattern(`${this.keyPrefix}${pattern}`);
      this.markRedisSuccess();
    } catch {
      this.markRedisError();
      this.logger.warn('Redis unavailable during flush');
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.lruCache.clear();
  }

  // ============================================
  // STATUS & STATS
  // ============================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      lru: {
        size: this.lruCache.size,
        maxSize: this.lruMax,
      },
      redis: {
        connected: this.redisConnected,
        lastErrorAt: this.lastRedisErrorAt?.toJSDate(),
        lastHealthCheckAt: this.lastHealthCheckAt?.toJSDate(),
        latencyMs: this.healthCheckLatencyMs,
        fallbackCount: this.redisFallbackCount,
        consecutiveFailures: this.consecutiveFailures,
      },
    };
  }

  /**
   * Get Redis health status
   */
  getHealthStatus(): RedisHealthStatus {
    return {
      connected: this.redisConnected,
      lastErrorAt: this.lastRedisErrorAt?.toJSDate(),
      lastHealthCheckAt: this.lastHealthCheckAt?.toJSDate(),
      latencyMs: this.healthCheckLatencyMs,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.redisConnected;
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  private validateHealthCheckConfig(): void {
    const errors: string[] = [];

    if (this.healthCheckTimeoutMs >= this.healthCheckIntervalMs) {
      errors.push(
        `timeoutMs (${this.healthCheckTimeoutMs}) must be < intervalMs (${this.healthCheckIntervalMs})`,
      );
    }

    if (this.healthCheckIntervalMs < REDIS_HEALTH_DEFAULTS.MIN_INTERVAL_MS) {
      errors.push(
        `intervalMs (${this.healthCheckIntervalMs}) too low, minimum ${REDIS_HEALTH_DEFAULTS.MIN_INTERVAL_MS}ms`,
      );
    }

    if (this.healthCheckTimeoutMs > REDIS_HEALTH_DEFAULTS.MAX_TIMEOUT_MS) {
      errors.push(
        `timeoutMs (${this.healthCheckTimeoutMs}) too high, maximum ${REDIS_HEALTH_DEFAULTS.MAX_TIMEOUT_MS}ms`,
      );
    }

    if (this.unhealthyThreshold < 1) {
      errors.push(
        `unhealthyThreshold (${this.unhealthyThreshold}) must be >= 1`,
      );
    }

    if (errors.length > 0) {
      throw new Error(
        `Invalid Redis health check config:\n- ${errors.join('\n- ')}`,
      );
    }
  }

  private startHealthCheckLoop(): void {
    this.healthCheckInterval = setInterval(
      () => this.safePerformHealthCheck(),
      this.healthCheckIntervalMs,
    );
    this.logger.log(
      `Redis health check started (interval: ${this.healthCheckIntervalMs}ms)`,
    );
  }

  private stopHealthCheckLoop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      this.logger.log('Redis health check stopped');
    }
  }

  private async gracefulShutdown(): Promise<void> {
    this.stopHealthCheckLoop();

    if (!this.isHealthCheckRunning) {
      this.logger.log('RedisCacheService destroyed');

      return;
    }

    this.logger.debug(
      'Waiting for health check to complete before shutdown...',
    );

    const maxWaitMs = this.healthCheckTimeoutMs + 1000;
    const startTime = DateTime.utc();

    while (this.isHealthCheckRunning) {
      const elapsedMs = DateTime.utc().diff(startTime).as('milliseconds');

      if (elapsedMs >= maxWaitMs) {
        this.logger.warn(
          `Health check still running after ${maxWaitMs}ms, proceeding with shutdown`,
        );
        break;
      }
      await this.delay(100);
    }

    this.logger.log('RedisCacheService destroyed');
  }

  private async safePerformHealthCheck(): Promise<void> {
    if (this.isHealthCheckRunning) {
      this.logger.debug('Health check skipped - previous check still running');

      return;
    }

    this.isHealthCheckRunning = true;
    try {
      await this.performHealthCheck();
    } finally {
      this.isHealthCheckRunning = false;
    }
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = DateTime.utc();

    try {
      await this.cacheStorage.ping({ timeoutMs: this.healthCheckTimeoutMs });
      this.updateHealthCheckSuccess(startTime);
    } catch (error) {
      this.updateHealthCheckFailure(error, startTime);
    }
  }

  private updateHealthCheckSuccess(startTime: DateTime): void {
    const now = DateTime.utc();

    if (this.lastSuccessAt && startTime < this.lastSuccessAt) {
      this.logger.debug(
        'Health check success ignored - newer real operation already succeeded',
      );

      return;
    }

    this.lastHealthCheckAt = now;
    this.lastSuccessAt = now;
    this.healthCheckLatencyMs = Math.round(
      now.diff(startTime).as('milliseconds'),
    );
    this.consecutiveFailures = 0;
    this.redisConnected = true;

    this.logger.debug(
      `Redis health check passed (latency: ${this.healthCheckLatencyMs}ms)`,
    );
  }

  private updateHealthCheckFailure(error: unknown, startTime: DateTime): void {
    const now = DateTime.utc();

    if (this.lastSuccessAt && startTime < this.lastSuccessAt) {
      this.logger.debug(
        'Health check failure ignored - real operation succeeded during check',
      );

      return;
    }

    this.consecutiveFailures++;
    this.lastRedisErrorAt = now;
    this.lastHealthCheckAt = now;

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (this.consecutiveFailures >= this.unhealthyThreshold) {
      this.redisConnected = false;
      this.logger.warn(
        `Redis marked unhealthy after ${this.consecutiveFailures} consecutive failures: ${errorMessage}`,
      );
    } else {
      this.logger.debug(
        `Redis health check failed (${this.consecutiveFailures}/${this.unhealthyThreshold}): ${errorMessage}`,
      );
    }
  }

  // ============================================
  // REDIS STATE
  // ============================================

  private markRedisError(): void {
    this.redisFallbackCount++;
    this.lastRedisErrorAt = DateTime.utc();
  }

  private markRedisSuccess(): void {
    this.lastSuccessAt = DateTime.utc();
    this.redisConnected = true;

    if (this.consecutiveFailures > 0) {
      this.consecutiveFailures = 0;
      this.logger.debug('Redis connection restored via real operation');
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
