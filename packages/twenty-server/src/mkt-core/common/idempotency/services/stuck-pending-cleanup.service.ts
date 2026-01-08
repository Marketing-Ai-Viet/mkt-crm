import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  DEFAULT_ACTION_CONFIG,
  IDEMPOTENCY_GLOBAL_CONFIG,
} from 'src/mkt-core/common/idempotency/configs/idempotency.config';
import { IdempotencyCacheRepository } from 'src/mkt-core/common/idempotency/repositories';
import {
  IdempotencyRecord,
  StuckPendingRecord,
} from 'src/mkt-core/common/idempotency/types/idempotency.types';

/**
 * Service to clean up stuck PENDING records
 *
 * Records can get stuck in PENDING state when:
 * - Process crashes after storing PENDING but before COMPLETED/FAILED
 * - Network issues prevent storing final status
 * - Lock expires but process continues (should not happen normally)
 *
 * This service runs periodically to:
 * 1. Find PENDING records older than (lockTimeout + graceTime)
 * 2. Mark them as EXPIRED
 * 3. Log for monitoring/alerting
 */
@Injectable()
export class StuckPendingCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(StuckPendingCleanupService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private readonly cacheRepository: IdempotencyCacheRepository) {}

  onModuleInit(): void {
    this.startCleanupInterval();
  }

  onModuleDestroy(): void {
    this.stopCleanupInterval();
  }

  /**
   * Start periodic cleanup
   */
  startCleanupInterval(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(
      () => this.runCleanup(),
      IDEMPOTENCY_GLOBAL_CONFIG.cleanupIntervalMs,
    );

    this.logger.log(
      `Cleanup interval started (every ${IDEMPOTENCY_GLOBAL_CONFIG.cleanupIntervalMs / 1000}s)`,
    );
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log('Cleanup interval stopped');
    }
  }

  /**
   * Run cleanup once
   */
  async runCleanup(): Promise<number> {
    if (this.isRunning) {
      this.logger.debug('Cleanup already running, skipping');

      return 0;
    }

    this.isRunning = true;

    try {
      const stuckRecords = await this.findStuckPendingRecords();

      if (stuckRecords.length === 0) {
        return 0;
      }

      this.logger.warn(`Found ${stuckRecords.length} stuck PENDING records`);

      let cleanedCount = 0;

      for (const stuckRecord of stuckRecords) {
        const success = await this.markAsExpired(stuckRecord);

        if (success) {
          cleanedCount++;
        }
      }

      this.logger.log(`Cleaned up ${cleanedCount} stuck PENDING records`);

      return cleanedCount;
    } catch (error) {
      this.logger.error('Error during cleanup', error);

      return 0;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Find all stuck PENDING records
   */
  private async findStuckPendingRecords(): Promise<StuckPendingRecord[]> {
    const stuckRecords: StuckPendingRecord[] = [];

    const scanResult = await this.cacheRepository.scanAllKeys(1000);

    if (!scanResult.success) {
      this.logger.error('Error scanning keys');

      return stuckRecords;
    }

    const keys = scanResult.data;
    const now = DateTimeUtils.toMillis(DateTimeUtils.now());
    const maxAge =
      DEFAULT_ACTION_CONFIG.lockTimeoutMs +
      DEFAULT_ACTION_CONFIG.stuckPendingGraceMs;

    for (const fullKey of keys) {
      const recordResult =
        await this.cacheRepository.getRecordByFullKey<unknown>(fullKey);

      if (!recordResult.success || !recordResult.data) {
        continue;
      }

      const record = recordResult.data;

      if (record.status !== 'PENDING') {
        continue;
      }

      const createdAt = DateTimeUtils.fromISO(record.createdAt);
      const ageMs = now - DateTimeUtils.toMillis(createdAt);

      if (ageMs > maxAge) {
        stuckRecords.push({
          key: record.key,
          createdAt: record.createdAt,
          domain: record.domain,
          action: record.action,
          workspaceId: record.workspaceId,
          ageMs,
        });
      }
    }

    return stuckRecords;
  }

  /**
   * Mark stuck record as EXPIRED
   */
  private async markAsExpired(
    stuckRecord: StuckPendingRecord,
  ): Promise<boolean> {
    const fullKey = this.cacheRepository.buildRecordKey(stuckRecord.key);
    const recordResult =
      await this.cacheRepository.getRecordByFullKey<unknown>(fullKey);

    if (!recordResult.success || !recordResult.data) {
      return false;
    }

    const record = recordResult.data;

    // Double check it's still PENDING
    if (record.status !== 'PENDING') {
      return false;
    }

    // Update to EXPIRED
    const updatedRecord: IdempotencyRecord = {
      ...record,
      status: 'EXPIRED',
      completedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
      error: `Stuck PENDING cleanup: record was pending for ${Math.round(stuckRecord.ageMs / 1000)}s`,
    };

    // Calculate remaining TTL
    const expiresAt = DateTimeUtils.fromISO(record.expiresAt);
    const now = DateTimeUtils.now();
    const remainingTtlMs =
      DateTimeUtils.toMillis(expiresAt) - DateTimeUtils.toMillis(now);

    if (remainingTtlMs <= 0) {
      return false;
    }

    const setResult = await this.cacheRepository.setRecordByFullKey(
      fullKey,
      updatedRecord,
      remainingTtlMs,
    );

    if (!setResult.success) {
      this.logger.error(`Error marking record as expired: ${stuckRecord.key}`);

      return false;
    }

    this.logger.warn(
      `Marked as EXPIRED: ${stuckRecord.key} ` +
        `(domain: ${stuckRecord.domain}, action: ${stuckRecord.action}, ` +
        `age: ${Math.round(stuckRecord.ageMs / 1000)}s)`,
    );

    return true;
  }

  /**
   * Get cleanup statistics
   */
  async getStats(): Promise<{
    pendingCount: number;
    stuckCount: number;
    completedCount: number;
    failedCount: number;
    expiredCount: number;
  }> {
    const stats = {
      pendingCount: 0,
      stuckCount: 0,
      completedCount: 0,
      failedCount: 0,
      expiredCount: 0,
    };

    const scanResult = await this.cacheRepository.scanAllKeys(1000);

    if (!scanResult.success) {
      this.logger.error('Error getting stats');

      return stats;
    }

    const keys = scanResult.data;
    const now = DateTimeUtils.toMillis(DateTimeUtils.now());
    const maxAge =
      DEFAULT_ACTION_CONFIG.lockTimeoutMs +
      DEFAULT_ACTION_CONFIG.stuckPendingGraceMs;

    for (const fullKey of keys) {
      const recordResult =
        await this.cacheRepository.getRecordByFullKey<unknown>(fullKey);

      if (!recordResult.success || !recordResult.data) {
        continue;
      }

      const record = recordResult.data;

      switch (record.status) {
        case 'PENDING': {
          stats.pendingCount++;
          const createdAt = DateTimeUtils.fromISO(record.createdAt);
          const ageMs = now - DateTimeUtils.toMillis(createdAt);

          if (ageMs > maxAge) {
            stats.stuckCount++;
          }
          break;
        }

        case 'COMPLETED':
          stats.completedCount++;
          break;

        case 'FAILED':
          stats.failedCount++;
          break;

        case 'EXPIRED':
          stats.expiredCount++;
          break;
      }
    }

    return stats;
  }
}
