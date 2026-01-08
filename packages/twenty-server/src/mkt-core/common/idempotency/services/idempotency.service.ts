import { Injectable, Logger } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  getActionConfig,
  IDEMPOTENCY_GLOBAL_CONFIG,
  IdempotencyActionConfig,
} from 'src/mkt-core/common/idempotency/configs/idempotency.config';
import { IdempotencyCacheRepository } from 'src/mkt-core/common/idempotency/repositories';
import {
  CacheFailureMode,
  DuplicateCheckResult,
  IdempotencyContext,
  IdempotencyDomain,
  IdempotencyExecuteResult,
  IdempotencyKey,
  IdempotencyRecord,
} from 'src/mkt-core/common/idempotency/types/idempotency.types';
import {
  canonicalHash,
  sanitizeResponseForCache,
} from 'src/mkt-core/utils/canonical-hash.util';

/**
 * Generic Idempotency Service
 *
 * Prevents duplicate processing across all domains (Order, Payment, License, etc.)
 *
 * Features:
 * - Canonical hash generation (sorted keys, excludes volatile fields)
 * - Per-action configuration (TTL, lock timeout, failure mode)
 * - Response size limiting and sanitization
 * - FAIL_SAFE/FAIL_STRICT modes
 * - Client-provided idempotency keys (X-Idempotency-Key header)
 * - Distributed locking
 *
 * @example
 * ```typescript
 * // Execute with idempotency protection
 * const result = await idempotencyService.executeWithIdempotency(
 *   {
 *     workspaceId: 'ws_123',
 *     domain: 'order',
 *     action: 'createOrder',
 *     requestBody: input,
 *   },
 *   async () => orderService.create(input),
 * );
 * ```
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly cacheRepository: IdempotencyCacheRepository) {}

  /**
   * Execute operation with full idempotency protection
   *
   * This is the recommended high-level API that handles:
   * 1. Key generation
   * 2. Duplicate check
   * 3. Lock acquisition
   * 4. Pending status
   * 5. Operation execution
   * 6. Success/failure storage
   * 7. Lock release
   */
  async executeWithIdempotency<T>(
    context: IdempotencyContext,
    operation: () => Promise<T>,
  ): Promise<IdempotencyExecuteResult<T>> {
    const config = this.getConfig(context.domain, context.action);
    const effectiveFailureMode =
      context.operationOptions?.failureMode ?? config.failureMode;

    // Generate key
    const key = this.generateKey(context);

    // Check for duplicate
    const duplicateResult = await this.checkDuplicate<T>(
      key,
      effectiveFailureMode,
    );

    if (duplicateResult.isDuplicate && duplicateResult.record) {
      const { record } = duplicateResult;

      // Handle based on status
      if (record.status === 'COMPLETED' && record.response) {
        this.logger.log(`Returning cached response for: ${key}`);

        return {
          data: record.response,
          fromCache: true,
          key,
          cacheAvailable: duplicateResult.cacheAvailable,
        };
      }

      if (record.status === 'PENDING') {
        // Wait for completion
        const completed = await this.waitForCompletion<T>(
          key,
          config.lockTimeoutMs,
        );

        if (completed?.response) {
          return {
            data: completed.response,
            fromCache: true,
            key,
            cacheAvailable: true,
          };
        }

        // Pending timed out - allow retry
      }

      // FAILED status - allow retry
    }

    // Execute with lock
    return this.executeWithLock(key, context, config, operation);
  }

  /**
   * Generate idempotency key from context
   */
  generateKey(context: IdempotencyContext): IdempotencyKey {
    const { workspaceId, domain, action, requestBody, options } = context;

    // Use client-provided key if valid
    if (options?.clientKey) {
      if (IDEMPOTENCY_GLOBAL_CONFIG.headerFormat.test(options.clientKey)) {
        return this.formatKey(workspaceId, domain, action, options.clientKey);
      }

      this.logger.warn(
        `Invalid client idempotency key format: ${options.clientKey}`,
      );
    }

    // Generate canonical hash
    const hash = canonicalHash(requestBody);

    // Add nonce or timestamp for bypass
    if (options?.bypassIdempotency) {
      const timestamp = DateTimeUtils.toMillis(DateTimeUtils.now());

      return this.formatKey(
        workspaceId,
        domain,
        action,
        hash,
        String(timestamp),
      );
    }

    if (options?.nonce) {
      return this.formatKey(workspaceId, domain, action, hash, options.nonce);
    }

    return this.formatKey(workspaceId, domain, action, hash);
  }

  /**
   * Check if request is duplicate
   */
  async checkDuplicate<T>(
    key: IdempotencyKey,
    failureMode: CacheFailureMode = 'FAIL_SAFE',
  ): Promise<DuplicateCheckResult<T>> {
    const result = await this.cacheRepository.getRecord<T>(key);

    if (!result.success) {
      return this.handleCacheError<DuplicateCheckResult<T>>(
        'checkDuplicate',
        key,
        result.error,
        failureMode,
        { isDuplicate: false, cacheAvailable: false },
      );
    }

    const record = result.data;

    if (!record) {
      return { isDuplicate: false, cacheAvailable: true };
    }

    // Check if expired
    if (this.cacheRepository.isRecordExpired(record)) {
      this.logger.log(`Record expired: ${key}`);

      return { isDuplicate: false, cacheAvailable: true };
    }

    this.logger.log(`Found duplicate: ${key}, status: ${record.status}`);

    return { isDuplicate: true, record, cacheAvailable: true };
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(
    key: IdempotencyKey,
    timeoutMs: number,
    failureMode: CacheFailureMode = 'FAIL_SAFE',
  ): Promise<boolean> {
    const result = await this.cacheRepository.acquireLock(key, timeoutMs);

    if (!result.success) {
      return this.handleCacheError<boolean>(
        'acquireLock',
        key,
        result.error,
        failureMode,
        true, // FAIL_SAFE: assume acquired
      );
    }

    if (result.data) {
      this.logger.log(`Lock acquired: ${key}`);
    } else {
      this.logger.warn(`Lock already held: ${key}`);
    }

    return result.data;
  }

  /**
   * Release lock
   */
  async releaseLock(key: IdempotencyKey): Promise<void> {
    const result = await this.cacheRepository.releaseLock(key);

    if (result.success) {
      this.logger.log(`Lock released: ${key}`);
    }
    // Failure is logged in repository, lock will expire anyway
  }

  /**
   * Store pending status
   */
  async storePending(
    key: IdempotencyKey,
    context: IdempotencyContext,
    config: IdempotencyActionConfig,
    failureMode: CacheFailureMode = 'FAIL_SAFE',
  ): Promise<void> {
    const now = DateTimeUtils.now();
    const expiresAt = DateTimeUtils.add(now, { seconds: config.ttlSeconds });

    const record: IdempotencyRecord = {
      key,
      domain: context.domain,
      action: context.action,
      workspaceId: context.workspaceId,
      status: 'PENDING',
      createdAt: DateTimeUtils.toISO(now),
      expiresAt: DateTimeUtils.toISO(expiresAt),
      requestHash: canonicalHash(context.requestBody),
    };

    const result = await this.cacheRepository.setRecord(
      key,
      record,
      config.ttlSeconds,
    );

    if (!result.success) {
      this.handleCacheError<void>(
        'storePending',
        key,
        result.error,
        failureMode,
        undefined,
      );

      return;
    }

    this.logger.log(`Stored PENDING: ${key}`);
  }

  /**
   * Store success result
   */
  async storeSuccess<T>(
    key: IdempotencyKey,
    response: T,
    config: IdempotencyActionConfig,
    failureMode: CacheFailureMode = 'FAIL_SAFE',
  ): Promise<void> {
    const getResult = await this.cacheRepository.getRecord<T>(key);
    const now = DateTimeUtils.now();

    // Sanitize response
    const sanitizedResponse = sanitizeResponseForCache(
      response as Record<string, unknown>,
      config.responseAllowedFields,
      config.maxResponseSizeBytes,
    ) as T;

    const originalSize = JSON.stringify(response).length;
    const truncated =
      (sanitizedResponse as Record<string, unknown>)?.['_truncated'] === true;

    let recordToStore: IdempotencyRecord<T>;

    if (getResult.success && getResult.data) {
      const existingRecord = getResult.data;

      existingRecord.status = 'COMPLETED';
      existingRecord.completedAt = DateTimeUtils.toISO(now);
      existingRecord.response = sanitizedResponse;
      existingRecord.responseTruncated = truncated;

      if (truncated) {
        existingRecord.originalResponseSize = originalSize;
      }

      recordToStore = existingRecord;
    } else {
      // Create new record if none exists
      const expiresAt = DateTimeUtils.add(now, { seconds: config.ttlSeconds });

      recordToStore = {
        key,
        domain: 'order',
        action: 'unknown',
        workspaceId: 'unknown',
        status: 'COMPLETED',
        createdAt: DateTimeUtils.toISO(now),
        completedAt: DateTimeUtils.toISO(now),
        expiresAt: DateTimeUtils.toISO(expiresAt),
        response: sanitizedResponse,
        requestHash: '',
        responseTruncated: truncated,
        originalResponseSize: truncated ? originalSize : undefined,
      };
    }

    const setResult = await this.cacheRepository.setRecord(
      key,
      recordToStore,
      config.ttlSeconds,
    );

    if (!setResult.success) {
      this.handleCacheError<void>(
        'storeSuccess',
        key,
        setResult.error,
        failureMode,
        undefined,
      );

      return;
    }

    this.logger.log(
      `Stored COMPLETED: ${key}${truncated ? ' (response truncated)' : ''}`,
    );
  }

  /**
   * Store failure result
   */
  async storeFailed(
    key: IdempotencyKey,
    errorMessage: string,
    config: IdempotencyActionConfig,
    failureMode: CacheFailureMode = 'FAIL_SAFE',
  ): Promise<void> {
    const getResult = await this.cacheRepository.getRecord(key);
    const now = DateTimeUtils.now();

    let recordToStore: IdempotencyRecord;

    if (getResult.success && getResult.data) {
      const existingRecord = getResult.data;

      existingRecord.status = 'FAILED';
      existingRecord.completedAt = DateTimeUtils.toISO(now);
      existingRecord.error = errorMessage;

      recordToStore = existingRecord;
    } else {
      const expiresAt = DateTimeUtils.add(now, { seconds: config.ttlSeconds });

      recordToStore = {
        key,
        domain: 'order',
        action: 'unknown',
        workspaceId: 'unknown',
        status: 'FAILED',
        createdAt: DateTimeUtils.toISO(now),
        completedAt: DateTimeUtils.toISO(now),
        expiresAt: DateTimeUtils.toISO(expiresAt),
        error: errorMessage,
        requestHash: '',
      };
    }

    const setResult = await this.cacheRepository.setRecord(
      key,
      recordToStore,
      config.ttlSeconds,
    );

    if (!setResult.success) {
      this.handleCacheError<void>(
        'storeFailed',
        key,
        setResult.error,
        failureMode,
        undefined,
      );

      return;
    }

    this.logger.log(`Stored FAILED: ${key}`);
  }

  /**
   * Wait for pending request to complete
   */
  async waitForCompletion<T>(
    key: IdempotencyKey,
    maxWaitMs: number,
    pollIntervalMs = IDEMPOTENCY_GLOBAL_CONFIG.defaultPollIntervalMs,
  ): Promise<IdempotencyRecord<T> | null> {
    const startTime = DateTimeUtils.toMillis(DateTimeUtils.now());
    const endTime = startTime + maxWaitMs;

    while (DateTimeUtils.toMillis(DateTimeUtils.now()) < endTime) {
      const result = await this.cacheRepository.getRecord<T>(key);

      if (result.success && result.data && result.data.status !== 'PENDING') {
        return result.data;
      }

      await this.delay(pollIntervalMs);
    }

    this.logger.warn(`Timeout waiting for completion: ${key}`);

    return null;
  }

  /**
   * Get configuration for action
   */
  getConfig(
    domain: IdempotencyDomain,
    action: string,
  ): IdempotencyActionConfig {
    return getActionConfig(domain, action);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async executeWithLock<T>(
    key: IdempotencyKey,
    context: IdempotencyContext,
    config: IdempotencyActionConfig,
    operation: () => Promise<T>,
  ): Promise<IdempotencyExecuteResult<T>> {
    const failureMode =
      context.operationOptions?.failureMode ?? config.failureMode;
    const lockTimeout =
      context.operationOptions?.lockTimeoutMs ?? config.lockTimeoutMs;

    // Acquire lock
    const lockAcquired = await this.acquireLock(key, lockTimeout, failureMode);

    if (!lockAcquired) {
      if (failureMode === 'FAIL_STRICT') {
        throw new Error(`Failed to acquire lock: ${key}`);
      }

      // FAIL_SAFE: proceed without lock (risky but allows operation)
      this.logger.warn(`Proceeding without lock (FAIL_SAFE): ${key}`);
    }

    try {
      // Store pending
      await this.storePending(key, context, config, failureMode);

      // Execute operation
      const result = await operation();

      // Store success
      await this.storeSuccess(key, result, config, failureMode);

      return {
        data: result,
        fromCache: false,
        key,
        cacheAvailable: true,
      };
    } catch (error) {
      // Store failure
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.storeFailed(key, errorMessage, config, failureMode);

      throw error;
    } finally {
      // Release lock
      if (lockAcquired) {
        await this.releaseLock(key);
      }
    }
  }

  /**
   * Format idempotency key
   *
   * Key format: {workspaceId}:{action}:{hash}[:suffix]
   *
   * Note: Domain is NOT included in key because:
   * - CacheStorageService namespace already provides domain context (e.g., 'mkt:order:')
   * - Including domain would create redundancy: 'mkt:order:idempotency:{ws}:order:...'
   *
   * Full key structure: {namespace}:{prefix}:{workspaceId}:{action}:{hash}
   * Example: mkt:order:idempotency:ws-123:createOrder:abc123
   *
   * @param _domain - Kept for signature compatibility (used for config lookup elsewhere)
   */
  private formatKey(
    workspaceId: string,
    _domain: string,
    action: string,
    hash: string,
    suffix?: string,
  ): IdempotencyKey {
    const base = `${workspaceId}:${action}:${hash}`;

    return suffix ? `${base}:${suffix}` : base;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleCacheError<T>(
    operation: string,
    key: IdempotencyKey,
    errorMessage: string,
    failureMode: CacheFailureMode,
    fallbackValue: T,
  ): T {
    if (failureMode === 'FAIL_STRICT') {
      this.logger.error(
        `Cache operation failed [${operation}] for key: ${key}. ` +
          `Error: ${errorMessage}. Mode: FAIL_STRICT - throwing error`,
      );

      throw new Error(
        `Idempotency cache unavailable: ${operation} failed for ${key}`,
      );
    }

    this.logger.error(
      `Cache operation failed [${operation}] for key: ${key}. ` +
        `Error: ${errorMessage}. Mode: FAIL_SAFE - continuing without protection`,
    );

    return fallbackValue;
  }
}
