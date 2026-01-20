import { Injectable, Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import {
  MKT_SYNC_CONFIG,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MktProductSyncService } from 'src/mkt-core/mkt-product-integration/services/mkt-product-sync.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Job data interface for product scheduled sync
 */
export type MktProductScheduledSyncJobData = {
  workspaceId: string;
};

/**
 * Scheduled job for syncing products and packages from MKT Server
 *
 * Default: Every 30 minutes (configurable via MKT_SCHEDULED_SYNC_CRON)
 *
 * Environment variables:
 * - MKT_SCHEDULED_SYNC_ENABLED: Enable/disable scheduled sync (default: true)
 * - MKT_SCHEDULED_SYNC_CRON: Cron expression (default: every 30 minutes)
 *
 * This job uses the @Processor pattern to ensure it only runs on Worker,
 * avoiding duplicate execution on both Server and Worker.
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class MktProductScheduledSyncJob {
  private readonly logger = new Logger(
    `${MKT_PRODUCT_LOG_CONTEXT}:ScheduledSync`,
  );

  constructor(private readonly syncService: MktProductSyncService) {}

  /**
   * Process handler for scheduled product sync
   * Triggered by cron job registered via MktProductSyncCronCommand
   */
  @Process(MktProductScheduledSyncJob.name)
  @SentryCronMonitor(
    MktProductScheduledSyncJob.name,
    MKT_SYNC_CONFIG.SCHEDULED_SYNC_CRON,
  )
  async handle(data: MktProductScheduledSyncJobData): Promise<void> {
    const { workspaceId } = data;

    if (!MKT_SYNC_CONFIG.SCHEDULED_SYNC_ENABLED) {
      this.logger.debug('Scheduled sync disabled', { workspaceId });

      return;
    }

    const syncStatus = this.syncService.getSyncStatus();

    // Skip if recently synced
    if (syncStatus.lastSyncAt) {
      const lastSyncDateTime = DateTimeUtils.fromDate(syncStatus.lastSyncAt);
      const timeSinceLastSync = DateTimeUtils.diffInMillis(
        lastSyncDateTime,
        DateTimeUtils.now(),
      );

      if (timeSinceLastSync < MKT_SYNC_CONFIG.MIN_SYNC_INTERVAL_MS) {
        this.logger.debug('Scheduled sync skipped: recent sync exists', {
          workspaceId,
          timeSinceLastSyncMs: timeSinceLastSync,
          minIntervalMs: MKT_SYNC_CONFIG.MIN_SYNC_INTERVAL_MS,
        });

        return;
      }
    }

    this.logger.log('Scheduled sync triggered', { workspaceId });

    try {
      const result = await this.syncService.syncAllProductsAndPackages();

      this.logger.log('Scheduled sync completed', {
        workspaceId,
        productsCount: result.productsCount,
        packagesCount: result.packagesCount,
        durationMs: result.duration,
      });

      if (result.errors.length > 0) {
        this.logger.warn('Scheduled sync completed with errors', {
          workspaceId,
          errorCount: result.errors.length,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Scheduled sync failed', {
        workspaceId,
        error: errorMessage,
      });

      throw error;
    }
  }
}
