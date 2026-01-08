import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import {
  MKT_SYNC_CONFIG,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import { MktProductSyncService } from 'src/mkt-core/mkt-product-integration/services/mkt-product-sync.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Scheduled job for syncing products and packages from MKT Server
 *
 * Default: Every 30 minutes (configurable via MKT_SCHEDULED_SYNC_CRON)
 *
 * Environment variables:
 * - MKT_SCHEDULED_SYNC_ENABLED: Enable/disable scheduled sync (default: true)
 * - MKT_SCHEDULED_SYNC_CRON: Cron expression (default: '0 *\/30 * * * *')
 */
@Injectable()
export class MktProductScheduledSyncJob {
  private readonly logger = new Logger(
    `${MKT_PRODUCT_LOG_CONTEXT}:ScheduledSync`,
  );

  constructor(private readonly syncService: MktProductSyncService) {}

  /**
   * Cron job handler for scheduled product sync
   */
  @Cron(MKT_SYNC_CONFIG.SCHEDULED_SYNC_CRON)
  async handleScheduledSync(): Promise<void> {
    if (!MKT_SYNC_CONFIG.SCHEDULED_SYNC_ENABLED) {
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
        this.logger.debug(
          `Scheduled sync skipped: recent sync exists (${timeSinceLastSync}ms ago)`,
        );

        return;
      }
    }

    this.logger.log('Scheduled sync triggered');

    try {
      const result = await this.syncService.syncAllProductsAndPackages();

      this.logger.log(
        `Scheduled sync completed: ${result.productsCount} products, ${result.packagesCount} packages in ${result.duration}ms`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(
          `Scheduled sync completed with ${result.errors.length} errors`,
        );
      }
    } catch (error) {
      this.logger.error('Scheduled sync failed', error);
    }
  }
}
