import { Inject, Injectable, Logger } from '@nestjs/common';

import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonParse, safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { IDEMPOTENCY_GLOBAL_CONFIG } from 'src/mkt-core/common/idempotency/configs/idempotency.config';
import {
  IDEMPOTENCY_CACHE_TOKEN,
  IdempotencyKey,
  IdempotencyRecord,
} from 'src/mkt-core/common/idempotency/types/idempotency.types';

/**
 * Result of cache operations
 */
export type CacheOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Repository for Idempotency cache operations
 *
 * Centralizes all Redis cache operations for idempotency:
 * - Record CRUD operations
 * - Lock management
 * - Key scanning
 * - Serialization/deserialization
 */
@Injectable()
export class IdempotencyCacheRepository {
  private readonly logger = new Logger(IdempotencyCacheRepository.name);

  constructor(
    @Inject(IDEMPOTENCY_CACHE_TOKEN)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // ============================================
  // RECORD OPERATIONS
  // ============================================

  /**
   * Get idempotency record from cache
   */
  async getRecord<T>(
    key: IdempotencyKey,
  ): Promise<CacheOperationResult<IdempotencyRecord<T> | null>> {
    try {
      const cacheKey = this.buildRecordKey(key);
      const cached = await this.cacheStorage.get<string>(cacheKey);

      if (!cached) {
        return { success: true, data: null };
      }

      const parseResult = safeJsonParse<IdempotencyRecord<T>>(cached);

      if (!parseResult.success) {
        this.logger.warn(`Failed to parse idempotency record: ${key}`);

        return { success: true, data: null };
      }

      return { success: true, data: parseResult.data };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      this.logger.error(`Failed to get record: ${key}`, error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Store idempotency record to cache
   */
  async setRecord<T>(
    key: IdempotencyKey,
    record: IdempotencyRecord<T>,
    ttlSeconds: number,
  ): Promise<CacheOperationResult<void>> {
    try {
      const cacheKey = this.buildRecordKey(key);
      const value = safeJsonStringify(record);

      if (!value) {
        return { success: false, error: 'Failed to serialize record' };
      }

      await this.cacheStorage.set(cacheKey, value, ttlSeconds * 1000);

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      this.logger.error(`Failed to set record: ${key}`, error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if record is expired
   */
  isRecordExpired(record: IdempotencyRecord): boolean {
    const now = DateTimeUtils.now();
    const expiresAt = DateTimeUtils.fromISO(record.expiresAt);

    return DateTimeUtils.toMillis(now) > DateTimeUtils.toMillis(expiresAt);
  }

  // ============================================
  // LOCK OPERATIONS
  // ============================================

  /**
   * Acquire distributed lock (legacy - without token)
   * @deprecated Use acquireLockWithToken for safer lock management
   */
  async acquireLock(
    key: IdempotencyKey,
    timeoutMs: number,
  ): Promise<CacheOperationResult<boolean>> {
    try {
      const lockKey = this.buildLockKey(key);
      const acquired = await this.cacheStorage.acquireLock(lockKey, timeoutMs);

      return { success: true, data: acquired };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      this.logger.error(`Failed to acquire lock: ${key}`, error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Release distributed lock (legacy - without token verification)
   * @deprecated Use releaseLockWithToken for safer lock management
   */
  async releaseLock(key: IdempotencyKey): Promise<CacheOperationResult<void>> {
    try {
      const lockKey = this.buildLockKey(key);

      await this.cacheStorage.releaseLock(lockKey);

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      // Don't log as error - lock will expire anyway
      this.logger.debug(`Failed to release lock (will expire): ${key}`);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Acquire distributed lock with token for safe release
   * Returns a unique token that must be used to release the lock
   */
  async acquireLockWithToken(
    key: IdempotencyKey,
    timeoutMs: number,
  ): Promise<CacheOperationResult<string | null>> {
    try {
      const lockKey = this.buildLockKey(key);
      const token = await this.cacheStorage.acquireLockWithToken(
        lockKey,
        timeoutMs,
      );

      return { success: true, data: token };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      this.logger.error(`Failed to acquire lock with token: ${key}`, error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Release distributed lock only if token matches
   * Prevents accidentally releasing another process's lock
   */
  async releaseLockWithToken(
    key: IdempotencyKey,
    token: string,
  ): Promise<CacheOperationResult<boolean>> {
    try {
      const lockKey = this.buildLockKey(key);
      const released = await this.cacheStorage.releaseLockWithToken(
        lockKey,
        token,
      );

      if (!released) {
        this.logger.debug(
          `Lock release skipped (token mismatch or expired): ${key}`,
        );
      }

      return { success: true, data: released };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      this.logger.debug(`Failed to release lock with token: ${key}`);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Extend lock TTL (heartbeat) - only if token matches
   * Use this for long-running operations to prevent lock expiration
   */
  async extendLock(
    key: IdempotencyKey,
    token: string,
    ttlMs: number,
  ): Promise<CacheOperationResult<boolean>> {
    try {
      const lockKey = this.buildLockKey(key);
      const extended = await this.cacheStorage.extendLock(
        lockKey,
        token,
        ttlMs,
      );

      return { success: true, data: extended };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      this.logger.debug(`Failed to extend lock: ${key}`);

      return { success: false, error: errorMessage };
    }
  }

  // ============================================
  // SCAN OPERATIONS
  // ============================================

  /**
   * Scan all idempotency keys
   */
  async scanAllKeys(maxKeys = 1000): Promise<CacheOperationResult<string[]>> {
    try {
      const pattern = `${IDEMPOTENCY_GLOBAL_CONFIG.keyPrefix}:*`;
      const keys = await this.cacheStorage.scanByPattern(pattern, { maxKeys });

      return { success: true, data: keys };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      this.logger.error('Failed to scan keys', error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get record by full cache key (for scan results)
   */
  async getRecordByFullKey<T>(
    fullKey: string,
  ): Promise<CacheOperationResult<IdempotencyRecord<T> | null>> {
    try {
      const cached = await this.cacheStorage.get<string>(fullKey);

      if (!cached) {
        return { success: true, data: null };
      }

      const parseResult = safeJsonParse<IdempotencyRecord<T>>(cached);

      if (!parseResult.success) {
        return { success: true, data: null };
      }

      return { success: true, data: parseResult.data };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update record by full cache key
   */
  async setRecordByFullKey<T>(
    fullKey: string,
    record: IdempotencyRecord<T>,
    ttlMs: number,
  ): Promise<CacheOperationResult<void>> {
    try {
      const value = safeJsonStringify(record);

      if (!value) {
        return { success: false, error: 'Failed to serialize record' };
      }

      await this.cacheStorage.set(fullKey, value, ttlMs);

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = this.extractErrorMessage(error);

      return { success: false, error: errorMessage };
    }
  }

  // ============================================
  // KEY BUILDERS
  // ============================================

  /**
   * Build cache key for idempotency record
   */
  buildRecordKey(key: IdempotencyKey): string {
    return `${IDEMPOTENCY_GLOBAL_CONFIG.keyPrefix}:${key}`;
  }

  /**
   * Build cache key for lock
   */
  buildLockKey(key: IdempotencyKey): string {
    return `${IDEMPOTENCY_GLOBAL_CONFIG.lockPrefix}:${key}`;
  }

  // ============================================
  // HELPERS
  // ============================================

  private extractErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
