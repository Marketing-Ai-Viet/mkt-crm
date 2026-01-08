import { Injectable, Logger } from '@nestjs/common';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  LOCK_CACHE_PREFIX,
  REDIS_LOG_CONTEXT,
} from 'src/mkt-core/infrastructure/redis/constants';

// ============================================
// TYPES
// ============================================

/**
 * Lock configuration options
 */
export type LockOptions = {
  /** Lock timeout in milliseconds (auto-release after this time) */
  timeoutMs?: number;
  /** Retry interval in milliseconds when waiting for lock */
  retryIntervalMs?: number;
  /** Maximum wait time in milliseconds (0 = no wait, try once) */
  maxWaitMs?: number;
  /** Unique lock owner identifier (for safe release) */
  ownerId?: string;
};

/**
 * Result of lock acquisition attempt
 */
export type LockAcquireResult = {
  acquired: boolean;
  lockKey: string;
  ownerId: string;
  expiresAt?: Date;
  waitedMs?: number;
};

/**
 * Result of lock release attempt
 */
export type ReleaseResult = {
  released: boolean;
  reason?: 'success' | 'not_owner' | 'not_found' | 'error';
};

/**
 * Lock handle for managing acquired lock
 */
export type LockHandle = {
  lockKey: string;
  ownerId: string;
  expiresAt: Date;
  release: () => Promise<ReleaseResult>;
  extend: (additionalMs: number) => Promise<boolean>;
  isExpired: () => boolean;
};

/**
 * Stored lock data in Redis
 */
type LockData = {
  ownerId: string;
  acquiredAt: string;
  expiresAt: string;
};

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_LOCK_OPTIONS: Required<LockOptions> = {
  timeoutMs: 30000, // 30 seconds
  retryIntervalMs: 100, // 100ms between retries
  maxWaitMs: 0, // No wait by default (try once)
  ownerId: '', // Will be generated if not provided
};

const LOCK_KEY_PREFIX = LOCK_CACHE_PREFIX.GENERAL;

/**
 * Redis Distributed Lock Service
 *
 * Provides distributed locking for coordinating access to shared resources.
 *
 * Features:
 * - Automatic lock expiration (prevents deadlocks)
 * - Owner verification (only owner can release)
 * - Lock extension (for long-running operations)
 * - Wait with retry (for acquiring contested locks)
 * - Callback pattern (auto-release after operation)
 *
 * @example
 * ```typescript
 * // Simple lock
 * const handle = await lockService.acquire('order:123');
 * if (handle) {
 *   try {
 *     // Critical section
 *   } finally {
 *     await handle.release();
 *   }
 * }
 *
 * // Lock with callback (recommended)
 * const result = await lockService.withLock('payment:456', async () => {
 *   // Critical section - lock auto-released
 *   return processPayment();
 * });
 *
 * // Lock with wait
 * const handle = await lockService.acquire('resource:789', {
 *   maxWaitMs: 5000, // Wait up to 5 seconds
 *   timeoutMs: 60000, // Lock expires after 60 seconds
 * });
 * ```
 */
@Injectable()
export class RedisLockService {
  private readonly logger = new Logger(`${REDIS_LOG_CONTEXT}:Lock`);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOrder)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Acquire a distributed lock
   *
   * @param resource - Resource identifier to lock
   * @param options - Lock options
   * @returns Lock handle if acquired, null if failed
   */
  async acquire(
    resource: string,
    options?: LockOptions,
  ): Promise<LockHandle | null> {
    const config = this.mergeOptions(options);
    const lockKey = this.buildLockKey(resource);
    const ownerId = config.ownerId || this.generateOwnerId();
    const startTime = DateTimeUtils.now();

    let waitedMs = 0;
    let shouldContinue = true;

    // Try to acquire lock with retry loop
    while (shouldContinue) {
      const acquired = await this.tryAcquireLock(lockKey, ownerId, config);

      if (acquired) {
        const expiresAtDateTime = DateTimeUtils.add(DateTimeUtils.now(), {
          milliseconds: config.timeoutMs,
        });
        const expiresAt =
          DateTimeUtils.toDate(expiresAtDateTime) ??
          DateTimeUtils.toDate(DateTimeUtils.now()) ??
          new Date();

        this.logger.debug(
          `Lock acquired: ${resource} (owner: ${ownerId}, waited: ${waitedMs}ms)`,
        );

        return this.createLockHandle(lockKey, ownerId, expiresAt);
      }

      // Check if we should keep waiting
      const nowMs = DateTimeUtils.toMillis(DateTimeUtils.now());
      const startMs = DateTimeUtils.toMillis(startTime);

      waitedMs = nowMs - startMs;

      if (waitedMs >= config.maxWaitMs) {
        this.logger.debug(
          `Lock acquisition failed: ${resource} (waited: ${waitedMs}ms)`,
        );
        shouldContinue = false;
      } else {
        // Wait before retry
        await this.delay(config.retryIntervalMs);
      }
    }

    return null;
  }

  /**
   * Try to acquire lock without waiting
   *
   * @param resource - Resource identifier to lock
   * @param options - Lock options
   * @returns Lock handle if acquired, null if already locked
   */
  async tryLock(
    resource: string,
    options?: Omit<LockOptions, 'maxWaitMs'>,
  ): Promise<LockHandle | null> {
    return this.acquire(resource, { ...options, maxWaitMs: 0 });
  }

  /**
   * Release a lock by resource name
   *
   * @param resource - Resource identifier
   * @param ownerId - Lock owner identifier
   * @returns Release result
   */
  async release(resource: string, ownerId: string): Promise<ReleaseResult> {
    const lockKey = this.buildLockKey(resource);

    return this.releaseLock(lockKey, ownerId);
  }

  /**
   * Execute operation with lock (recommended pattern)
   *
   * Automatically acquires lock before operation and releases after.
   * Throws error if lock cannot be acquired.
   *
   * @param resource - Resource identifier to lock
   * @param operation - Async operation to execute
   * @param options - Lock options
   * @returns Result of operation
   * @throws Error if lock cannot be acquired
   */
  async withLock<T>(
    resource: string,
    operation: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    const handle = await this.acquire(resource, options);

    if (!handle) {
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }

    try {
      return await operation();
    } finally {
      await handle.release();
    }
  }

  /**
   * Try to execute operation with lock
   *
   * Returns null if lock cannot be acquired (instead of throwing).
   *
   * @param resource - Resource identifier to lock
   * @param operation - Async operation to execute
   * @param options - Lock options
   * @returns Result of operation or null if lock failed
   */
  async tryWithLock<T>(
    resource: string,
    operation: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T | null> {
    const handle = await this.acquire(resource, options);

    if (!handle) {
      return null;
    }

    try {
      return await operation();
    } finally {
      await handle.release();
    }
  }

  /**
   * Check if a resource is currently locked
   *
   * @param resource - Resource identifier
   * @returns true if locked
   */
  async isLocked(resource: string): Promise<boolean> {
    const lockKey = this.buildLockKey(resource);

    try {
      const lockData = await this.cacheStorage.get<LockData>(lockKey);

      if (!lockData) {
        return false;
      }

      // Check if lock is expired
      const expiresAt = DateTimeUtils.fromISO(lockData.expiresAt);
      const now = DateTimeUtils.now();

      return DateTimeUtils.toMillis(now) < DateTimeUtils.toMillis(expiresAt);
    } catch {
      return false;
    }
  }

  /**
   * Get lock info for a resource
   *
   * @param resource - Resource identifier
   * @returns Lock data or null if not locked
   */
  async getLockInfo(resource: string): Promise<LockData | null> {
    const lockKey = this.buildLockKey(resource);

    try {
      const lockData = await this.cacheStorage.get<LockData>(lockKey);

      return lockData ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Force release a lock (admin operation)
   *
   * Use with caution - bypasses owner verification.
   *
   * @param resource - Resource identifier
   */
  async forceRelease(resource: string): Promise<void> {
    const lockKey = this.buildLockKey(resource);

    try {
      await this.cacheStorage.del(lockKey);
      this.logger.warn(`Lock force released: ${resource}`);
    } catch (error) {
      this.logger.error(`Failed to force release lock: ${resource}`, error);
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async tryAcquireLock(
    lockKey: string,
    ownerId: string,
    config: Required<LockOptions>,
  ): Promise<boolean> {
    try {
      // Check if lock exists
      const existingLock = await this.cacheStorage.get<LockData>(lockKey);

      if (existingLock) {
        // Check if expired
        const expiresAt = DateTimeUtils.fromISO(existingLock.expiresAt);
        const now = DateTimeUtils.now();

        if (DateTimeUtils.toMillis(now) < DateTimeUtils.toMillis(expiresAt)) {
          // Lock is still valid
          return false;
        }

        // Lock expired, can be taken over
        this.logger.debug(`Expired lock found, taking over: ${lockKey}`);
      }

      // Try to acquire using Redis set with NX
      const now = DateTimeUtils.now();
      const expiresAt = DateTimeUtils.add(now, {
        milliseconds: config.timeoutMs,
      });

      const lockData: LockData = {
        ownerId,
        acquiredAt: DateTimeUtils.toISO(now),
        expiresAt: DateTimeUtils.toISO(expiresAt),
      };

      // Use acquireLock from CacheStorageService for atomic operation
      const acquired = await this.cacheStorage.acquireLock(
        lockKey,
        config.timeoutMs,
      );

      if (acquired) {
        // Store lock data
        await this.cacheStorage.set(lockKey, lockData, config.timeoutMs);

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Lock acquisition error: ${lockKey}`, error);

      return false;
    }
  }

  private async releaseLock(
    lockKey: string,
    ownerId: string,
  ): Promise<ReleaseResult> {
    try {
      const lockData = await this.cacheStorage.get<LockData>(lockKey);

      if (!lockData) {
        return { released: false, reason: 'not_found' };
      }

      if (lockData.ownerId !== ownerId) {
        this.logger.warn(
          `Lock release denied: ${lockKey} (owner mismatch: ${ownerId} != ${lockData.ownerId})`,
        );

        return { released: false, reason: 'not_owner' };
      }

      await this.cacheStorage.del(lockKey);
      await this.cacheStorage.releaseLock(lockKey);

      this.logger.debug(`Lock released: ${lockKey}`);

      return { released: true, reason: 'success' };
    } catch (error) {
      this.logger.error(`Lock release error: ${lockKey}`, error);

      return { released: false, reason: 'error' };
    }
  }

  private async extendLock(
    lockKey: string,
    ownerId: string,
    additionalMs: number,
  ): Promise<boolean> {
    try {
      const lockData = await this.cacheStorage.get<LockData>(lockKey);

      if (!lockData || lockData.ownerId !== ownerId) {
        return false;
      }

      const newExpiresAt = DateTimeUtils.add(DateTimeUtils.now(), {
        milliseconds: additionalMs,
      });

      const newLockData: LockData = {
        ...lockData,
        expiresAt: DateTimeUtils.toISO(newExpiresAt),
      };

      const remainingMs =
        DateTimeUtils.toMillis(newExpiresAt) -
        DateTimeUtils.toMillis(DateTimeUtils.now());

      await this.cacheStorage.set(lockKey, newLockData, remainingMs);

      this.logger.debug(`Lock extended: ${lockKey} (+${additionalMs}ms)`);

      return true;
    } catch (error) {
      this.logger.error(`Lock extension error: ${lockKey}`, error);

      return false;
    }
  }

  private createLockHandle(
    lockKey: string,
    ownerId: string,
    expiresAt: Date,
  ): LockHandle {
    return {
      lockKey,
      ownerId,
      expiresAt,
      release: () => this.releaseLock(lockKey, ownerId),
      extend: (additionalMs: number) =>
        this.extendLock(lockKey, ownerId, additionalMs),
      isExpired: () => {
        const now = DateTimeUtils.toDate(DateTimeUtils.now());

        return now ? now > expiresAt : true;
      },
    };
  }

  private buildLockKey(resource: string): string {
    return `${LOCK_KEY_PREFIX}:${resource}`;
  }

  private generateOwnerId(): string {
    const timestamp = DateTimeUtils.toMillis(DateTimeUtils.now()).toString(36);
    const random = Math.random().toString(36).substring(2, 8);

    return `${timestamp}-${random}`;
  }

  private mergeOptions(options?: LockOptions): Required<LockOptions> {
    return {
      timeoutMs: options?.timeoutMs ?? DEFAULT_LOCK_OPTIONS.timeoutMs,
      retryIntervalMs:
        options?.retryIntervalMs ?? DEFAULT_LOCK_OPTIONS.retryIntervalMs,
      maxWaitMs: options?.maxWaitMs ?? DEFAULT_LOCK_OPTIONS.maxWaitMs,
      ownerId: options?.ownerId ?? DEFAULT_LOCK_OPTIONS.ownerId,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
