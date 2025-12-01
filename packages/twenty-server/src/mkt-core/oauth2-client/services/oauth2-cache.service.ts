import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DateTime } from 'luxon';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import {
  OAUTH2_CACHE_DEFAULTS,
  OAUTH2_ERROR_MESSAGES,
  OAUTH2_LOG_CONTEXT,
  OAUTH2_REDIS_HEALTH_DEFAULTS,
  OAUTH2_SUCCESS_MESSAGES,
} from 'src/mkt-core/oauth2-client/constants';
import {
  OAuth2CacheStats,
  OAuth2Token,
} from 'src/mkt-core/oauth2-client/types';

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

    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V): void {
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
      expiresAt: DateTime.utc().plus({ milliseconds: this.ttlMs }),
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

@Injectable()
export class OAuth2CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OAUTH2_LOG_CONTEXT);
  private readonly lruCache: SimpleLRUCache<string, OAuth2Token>;
  private readonly lruMax: number;
  private readonly lruTtlMs: number;
  private readonly redisTtlMs: number;

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

  // Timestamp tracking để xử lý race condition
  private lastSuccessAt?: DateTime;

  // Health check config
  private readonly healthCheckEnabled: boolean;
  private readonly healthCheckIntervalMs: number;
  private readonly healthCheckTimeoutMs: number;
  private readonly unhealthyThreshold: number;

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOAuth2)
    private readonly cacheStorage: CacheStorageService,
    private readonly configService: ConfigService,
  ) {
    // Cache config
    this.lruMax =
      this.configService.get<number>('oauth2Client.cache.lruMax') ??
      OAUTH2_CACHE_DEFAULTS.LRU_MAX;
    this.lruTtlMs =
      this.configService.get<number>('oauth2Client.cache.lruTtlMs') ??
      OAUTH2_CACHE_DEFAULTS.LRU_TTL_MS;
    const redisTtlSeconds =
      this.configService.get<number>('oauth2Client.cache.redisTtlSeconds') ??
      OAUTH2_CACHE_DEFAULTS.REDIS_TTL_SECONDS;

    this.redisTtlMs = redisTtlSeconds * 1000;

    this.lruCache = new SimpleLRUCache<string, OAuth2Token>({
      max: this.lruMax,
      ttl: this.lruTtlMs,
    });

    // Health check config
    this.healthCheckEnabled =
      this.configService.get<boolean>('oauth2Client.redisHealth.enabled') ??
      OAUTH2_REDIS_HEALTH_DEFAULTS.ENABLED;
    this.healthCheckIntervalMs =
      this.configService.get<number>('oauth2Client.redisHealth.intervalMs') ??
      OAUTH2_REDIS_HEALTH_DEFAULTS.INTERVAL_MS;
    this.healthCheckTimeoutMs =
      this.configService.get<number>('oauth2Client.redisHealth.timeoutMs') ??
      OAUTH2_REDIS_HEALTH_DEFAULTS.TIMEOUT_MS;
    this.unhealthyThreshold =
      this.configService.get<number>(
        'oauth2Client.redisHealth.unhealthyThreshold',
      ) ?? OAUTH2_REDIS_HEALTH_DEFAULTS.UNHEALTHY_THRESHOLD;
  }

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

  async getToken(key: string): Promise<OAuth2Token | undefined> {
    const lruToken = this.lruCache.get(key);

    if (lruToken && !this.isExpired(lruToken)) {
      this.logger.debug(OAUTH2_SUCCESS_MESSAGES.CACHE_HIT_LRU());

      return lruToken;
    }

    // Skip Redis nếu đang unhealthy để tránh timeout không cần thiết
    if (!this.redisConnected) {
      this.logger.debug('Redis unhealthy, skipping Redis lookup');

      return undefined;
    }

    try {
      const redisToken = await this.cacheStorage.get<OAuth2Token>(key);

      this.markRedisSuccess();

      if (redisToken && !this.isExpired(redisToken)) {
        this.logger.debug(OAUTH2_SUCCESS_MESSAGES.CACHE_HIT_REDIS());
        this.lruCache.set(key, redisToken);

        return redisToken;
      }
    } catch (error) {
      this.markRedisError();
      this.logger.warn(OAUTH2_ERROR_MESSAGES.REDIS_UNAVAILABLE());
    }

    return undefined;
  }

  async setToken(key: string, token: OAuth2Token): Promise<void> {
    this.lruCache.set(key, token);

    // Skip Redis nếu đang unhealthy
    if (!this.redisConnected) {
      this.logger.debug('Redis unhealthy, skipping Redis write');

      return;
    }

    try {
      await this.cacheStorage.set(key, token, this.redisTtlMs);
      this.markRedisSuccess();
    } catch (error) {
      this.markRedisError();
      this.logger.warn(OAUTH2_ERROR_MESSAGES.REDIS_UNAVAILABLE());
    }
  }

  async invalidateToken(key: string): Promise<void> {
    this.lruCache.delete(key);

    // Skip Redis nếu đang unhealthy
    if (!this.redisConnected) {
      this.logger.debug('Redis unhealthy, skipping Redis delete');

      return;
    }

    try {
      await this.cacheStorage.del(key);
      this.markRedisSuccess();
    } catch (error) {
      this.markRedisError();
      this.logger.warn(OAUTH2_ERROR_MESSAGES.REDIS_UNAVAILABLE());
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    this.lruCache.clear();

    // Skip Redis nếu đang unhealthy
    if (!this.redisConnected) {
      this.logger.debug('Redis unhealthy, skipping Redis flush');

      return;
    }

    try {
      await this.cacheStorage.flushByPattern(pattern);
      this.markRedisSuccess();
    } catch (error) {
      this.markRedisError();
      this.logger.warn(OAUTH2_ERROR_MESSAGES.REDIS_UNAVAILABLE());
    }
  }

  getStats(): OAuth2CacheStats {
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

  // ==================== Health Check Methods ====================

  private validateHealthCheckConfig(): void {
    const errors: string[] = [];

    if (this.healthCheckTimeoutMs >= this.healthCheckIntervalMs) {
      errors.push(
        `timeoutMs (${this.healthCheckTimeoutMs}) must be < intervalMs (${this.healthCheckIntervalMs})`,
      );
    }

    if (
      this.healthCheckIntervalMs < OAUTH2_REDIS_HEALTH_DEFAULTS.MIN_INTERVAL_MS
    ) {
      errors.push(
        `intervalMs (${this.healthCheckIntervalMs}) too low, minimum ${OAUTH2_REDIS_HEALTH_DEFAULTS.MIN_INTERVAL_MS}ms`,
      );
    }

    if (
      this.healthCheckTimeoutMs > OAUTH2_REDIS_HEALTH_DEFAULTS.MAX_TIMEOUT_MS
    ) {
      errors.push(
        `timeoutMs (${this.healthCheckTimeoutMs}) too high, maximum ${OAUTH2_REDIS_HEALTH_DEFAULTS.MAX_TIMEOUT_MS}ms`,
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
      this.logger.log('OAuth2CacheService destroyed');

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

    this.logger.log('OAuth2CacheService destroyed');
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

    // Chỉ update nếu không có success từ real operation gần hơn
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

    // Nếu có success từ real operation sau khi health check bắt đầu,
    // không tăng consecutiveFailures vì Redis thực sự đang hoạt động
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

  // ==================== Redis State Methods ====================

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

  // ==================== Utility Methods ====================

  private isExpired(token: OAuth2Token): boolean {
    const expiresAt =
      token.expiresAt instanceof Date
        ? DateTime.fromJSDate(token.expiresAt)
        : DateTime.fromISO(String(token.expiresAt));

    return DateTime.utc() >= expiresAt;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
