import { Inject, Injectable, Logger } from '@nestjs/common';

import { RedisLockService } from 'src/mkt-core/infrastructure/redis/services/redis-lock.service';
import {
  MKT_AUTH_LOG_CONTEXT,
  MKT_AUTH_CACHE_PREFIX,
} from 'src/mkt-core/mkt-auth-client/constants';
import {
  MKT_AUTH_CLIENT_CONFIG_KEY,
  MktAuthClientConfigFactoryResult,
} from 'src/mkt-core/mkt-auth-client/configs';

// ============================================
// SERVICE
// ============================================

/**
 * MKT Auth Lock Service
 *
 * Provides distributed locking for token operations.
 * Wraps RedisLockService with MKT Auth-specific configuration.
 *
 * Use cases:
 * - Token acquisition (prevents multiple instances fetching simultaneously)
 * - Token refresh (ensures only one refresh at a time)
 * - Re-login after 401 (prevents thundering herd)
 *
 * @example
 * ```typescript
 * // Execute with lock (returns null if lock not acquired)
 * const result = await lockService.withLock(async () => {
 *   return fetchNewToken();
 * });
 *
 * // Execute with lock (throws if lock not acquired)
 * const result = await lockService.withLockRequired(async () => {
 *   return fetchNewToken();
 * });
 *
 * // Re-login lock (separate from token lock)
 * const result = await lockService.withReloginLock(async () => {
 *   return performRelogin();
 * });
 * ```
 */
@Injectable()
export class MktAuthLockService {
  private readonly logger = new Logger(`${MKT_AUTH_LOG_CONTEXT}:Lock`);

  constructor(
    @Inject(MKT_AUTH_CLIENT_CONFIG_KEY)
    private readonly config: MktAuthClientConfigFactoryResult,
    private readonly redisLockService: RedisLockService,
  ) {}

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Execute operation with distributed lock for token operations
   *
   * Returns null if lock cannot be acquired (non-blocking).
   *
   * @param operation - Async operation to execute
   * @returns Result of operation or null if lock not acquired
   */
  async withLock<T>(operation: () => Promise<T>): Promise<T | null> {
    this.logger.debug('Attempting to acquire token lock');

    const result = await this.redisLockService.tryWithLock<T>(
      MKT_AUTH_CACHE_PREFIX.LOCK_TOKEN,
      operation,
      {
        timeoutMs: this.config.lock.timeoutMs,
        maxWaitMs: this.config.lock.maxWaitMs,
        retryIntervalMs: this.config.lock.retryIntervalMs,
      },
    );

    if (result === null) {
      this.logger.debug(
        'Token lock not acquired (another instance may be refreshing)',
      );
    }

    return result;
  }

  /**
   * Execute operation with distributed lock for token operations
   *
   * Throws error if lock cannot be acquired.
   *
   * @param operation - Async operation to execute
   * @returns Result of operation
   * @throws Error if lock cannot be acquired
   */
  async withLockRequired<T>(operation: () => Promise<T>): Promise<T> {
    this.logger.debug('Acquiring token lock (required)');

    return this.redisLockService.withLock<T>(
      MKT_AUTH_CACHE_PREFIX.LOCK_TOKEN,
      operation,
      {
        timeoutMs: this.config.lock.timeoutMs,
        maxWaitMs: this.config.lock.maxWaitMs,
        retryIntervalMs: this.config.lock.retryIntervalMs,
      },
    );
  }

  /**
   * Execute operation with distributed lock for re-login operations
   *
   * Separate lock from token lock to allow re-login while token
   * operations are waiting.
   *
   * @param operation - Async operation to execute
   * @returns Result of operation or null if lock not acquired
   */
  async withReloginLock<T>(operation: () => Promise<T>): Promise<T | null> {
    this.logger.debug('Attempting to acquire re-login lock');

    const result = await this.redisLockService.tryWithLock<T>(
      MKT_AUTH_CACHE_PREFIX.LOCK_RELOGIN,
      operation,
      {
        timeoutMs: this.config.lock.timeoutMs,
        maxWaitMs: this.config.lock.maxWaitMs,
        retryIntervalMs: this.config.lock.retryIntervalMs,
      },
    );

    if (result === null) {
      this.logger.debug(
        'Re-login lock not acquired (another instance may be re-logging in)',
      );
    }

    return result;
  }

  /**
   * Check if token lock is currently held
   */
  async isTokenLocked(): Promise<boolean> {
    return this.redisLockService.isLocked(MKT_AUTH_CACHE_PREFIX.LOCK_TOKEN);
  }

  /**
   * Check if re-login lock is currently held
   */
  async isReloginLocked(): Promise<boolean> {
    return this.redisLockService.isLocked(MKT_AUTH_CACHE_PREFIX.LOCK_RELOGIN);
  }
}
