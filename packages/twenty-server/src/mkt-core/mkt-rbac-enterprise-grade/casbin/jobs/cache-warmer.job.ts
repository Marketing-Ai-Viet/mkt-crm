import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CacheWarmerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/cache-warmer.service';

/**
 * Cache Warmer Cron Job
 *
 * Handles scheduled cache warming for RBAC enforcers.
 *
 * Schedule: Every hour
 * Purpose: Fallback mechanism to ensure caches stay warm
 *          if PG NOTIFY misses updates
 *
 * @see CacheWarmerService for actual warming logic
 */
@Injectable()
export class CacheWarmerJob {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:CacheWarmerJob`);

  constructor(private readonly cacheWarmerService: CacheWarmerService) {}

  /**
   * Scheduled hourly resync
   * Fallback mechanism if PG NOTIFY misses updates
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledResync(): Promise<void> {
    const status = this.cacheWarmerService.getStatus();

    if (!status.enabled) {
      return;
    }

    this.logger.log('Starting scheduled hourly cache resync');

    try {
      const result = await this.cacheWarmerService.warmAllCaches();

      this.logger.log(
        `Scheduled resync completed: ${result.warmed}/${result.totalWorkspaces} warmed in ${result.latencyMs}ms`,
      );
    } catch (error) {
      this.logger.error(`Scheduled resync failed: ${error}`);
    }
  }
}
