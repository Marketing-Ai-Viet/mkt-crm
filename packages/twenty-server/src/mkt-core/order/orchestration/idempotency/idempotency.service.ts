import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { InjectCacheStorage } from 'src/engine/core-modules/cache-storage/decorators/cache-storage.decorator';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonParse, safeJsonStringify } from 'src/mkt-core/utils/json.util';

import {
  DuplicateCheckResult,
  IDEMPOTENCY_ACTION,
  IDEMPOTENCY_CONFIG,
  IdempotencyKey,
  IdempotencyRecord,
} from './idempotency.types';

/**
 * IdempotencyService - Prevents duplicate order processing
 *
 * Features:
 * - Generate idempotency keys from request data
 * - Check for duplicate requests
 * - Distributed locking for concurrent requests
 * - Store and retrieve processing results
 *
 * Usage:
 * 1. Generate or receive idempotency key
 * 2. Check for duplicate (return cached response if exists)
 * 3. Acquire lock
 * 4. Store pending status
 * 5. Execute operation
 * 6. Store success/failure
 * 7. Release lock
 */
// TODO : Xử lý trường hợp cache storage bị lỗi (vd: redis down) và khi muốn tạo 2 đơn hàng giống nhau liên tiếp cho 1 khách hàng
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectCacheStorage(CacheStorageNamespace.MktOrder)
    private readonly cacheStorage: CacheStorageService,
  ) {}

  /**
   * Generate idempotency key from request data
   *
   * @param workspaceId - Workspace identifier
   * @param action - Action type from IDEMPOTENCY_ACTION enum
   * @param requestBody - Request payload to hash
   * @returns Generated idempotency key
   */
  generateKey(
    workspaceId: string,
    action: IDEMPOTENCY_ACTION,
    requestBody: unknown,
  ): IdempotencyKey {
    const requestHash = this.hashRequest(requestBody);

    return `${workspaceId}:${action}:${requestHash}`;
  }

  /**
   * Check if request is duplicate and return cached response
   *
   * @param key - Idempotency key to check
   * @returns Object with isDuplicate flag and cached record if exists
   */
  async checkDuplicate<T>(
    key: IdempotencyKey,
  ): Promise<DuplicateCheckResult<T>> {
    const cacheKey = this.getCacheKey(key);
    const cached = await this.cacheStorage.get<string>(cacheKey);

    if (!cached) {
      return { isDuplicate: false };
    }

    const parseResult = safeJsonParse<IdempotencyRecord<T>>(cached);

    if (!parseResult.success) {
      this.logger.warn(`Failed to parse idempotency record: ${key}`);

      return { isDuplicate: false };
    }

    this.logger.log(
      `Found duplicate request: ${key}, status: ${parseResult.data.status}`,
    );

    return { isDuplicate: true, record: parseResult.data };
  }

  /**
   * Acquire distributed lock for processing request
   * Prevents concurrent processing of same idempotency key
   *
   * @param key - Idempotency key
   * @returns True if lock acquired, false if already locked
   */
  async acquireLock(key: IdempotencyKey): Promise<boolean> {
    const lockKey = this.getLockKey(key);

    const acquired = await this.cacheStorage.acquireLock(
      lockKey,
      IDEMPOTENCY_CONFIG.LOCK_TIMEOUT_MS,
    );

    if (acquired) {
      this.logger.log(`Acquired lock for: ${key}`);
    } else {
      this.logger.warn(`Failed to acquire lock for: ${key} (already locked)`);
    }

    return acquired;
  }

  /**
   * Release lock after processing
   *
   * @param key - Idempotency key
   */
  async releaseLock(key: IdempotencyKey): Promise<void> {
    const lockKey = this.getLockKey(key);

    await this.cacheStorage.releaseLock(lockKey);
    this.logger.log(`Released lock for: ${key}`);
  }

  /**
   * Store pending status before execution
   * Called after acquiring lock, before starting operation
   *
   * @param key - Idempotency key
   * @param requestBody - Original request body for hash verification
   */
  async storePending(key: IdempotencyKey, requestBody: unknown): Promise<void> {
    const requestHash = this.hashRequest(requestBody);
    const record: IdempotencyRecord = {
      key,
      status: 'PENDING',
      createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      requestHash,
    };

    await this.storeRecord(key, record);
    this.logger.log(`Stored pending status for: ${key}`);
  }

  /**
   * Store successful result
   * Called after operation completes successfully
   *
   * @param key - Idempotency key
   * @param response - Response data to cache
   */
  async storeSuccess<T>(key: IdempotencyKey, response: T): Promise<void> {
    const record = await this.getRecord<T>(key);

    if (!record) {
      this.logger.warn(`No pending record found for: ${key}`);

      return;
    }

    record.status = 'COMPLETED';
    record.completedAt = DateTimeUtils.toISO(DateTimeUtils.now());
    record.response = response;

    await this.storeRecord(key, record);
    this.logger.log(`Stored success for: ${key}`);
  }

  /**
   * Store failed result
   * Called when operation fails
   *
   * @param key - Idempotency key
   * @param error - Error message
   */
  async storeFailed(key: IdempotencyKey, error: string): Promise<void> {
    const record = await this.getRecord(key);

    if (!record) {
      this.logger.warn(`No pending record found for: ${key}`);

      return;
    }

    record.status = 'FAILED';
    record.completedAt = DateTimeUtils.toISO(DateTimeUtils.now());
    record.error = error;

    await this.storeRecord(key, record);
    this.logger.log(`Stored failure for: ${key}`);
  }

  /**
   * Wait for pending request to complete
   * Used when duplicate request detected with PENDING status
   *
   * @param key - Idempotency key
   * @param maxWaitMs - Maximum wait time in ms (default: 30000)
   * @param pollIntervalMs - Poll interval in ms (default: 500)
   * @returns Completed record or null if timeout
   */
  async waitForCompletion<T>(
    key: IdempotencyKey,
    maxWaitMs = 30000,
    pollIntervalMs = 500,
  ): Promise<IdempotencyRecord<T> | null> {
    const startTime = DateTimeUtils.toMillis(DateTimeUtils.now());
    const endTime = startTime + maxWaitMs;

    while (DateTimeUtils.toMillis(DateTimeUtils.now()) < endTime) {
      const record = await this.getRecord<T>(key);

      if (record && record.status !== 'PENDING') {
        return record;
      }

      await this.delay(pollIntervalMs);
    }

    this.logger.warn(`Timeout waiting for completion: ${key}`);

    return null;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private getCacheKey(key: IdempotencyKey): string {
    return `${IDEMPOTENCY_CONFIG.KEY_PREFIX}:${key}`;
  }

  private getLockKey(key: IdempotencyKey): string {
    return `${IDEMPOTENCY_CONFIG.LOCK_PREFIX}:${key}`;
  }

  private hashRequest(requestBody: unknown): string {
    const bodyString = safeJsonStringify(requestBody) ?? '';

    return createHash('sha256').update(bodyString).digest('hex').slice(0, 16);
  }

  private async getRecord<T>(
    key: IdempotencyKey,
  ): Promise<IdempotencyRecord<T> | null> {
    const cacheKey = this.getCacheKey(key);
    const cached = await this.cacheStorage.get<string>(cacheKey);

    if (!cached) {
      return null;
    }

    const parseResult = safeJsonParse<IdempotencyRecord<T>>(cached);

    return parseResult.success ? parseResult.data : null;
  }

  private async storeRecord<T>(
    key: IdempotencyKey,
    record: IdempotencyRecord<T>,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(key);
    const value = safeJsonStringify(record);

    if (!value) {
      this.logger.error(`Failed to serialize record: ${key}`);

      return;
    }

    await this.cacheStorage.set(
      cacheKey,
      value,
      IDEMPOTENCY_CONFIG.TTL_SECONDS * 1000,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
