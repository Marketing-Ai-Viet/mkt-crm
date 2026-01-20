import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CacheWarmerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/cache-warmer.service';

/**
 * Job data interface for cache warmer job
 */
export type CacheWarmerJobData = {
  workspaceId: string;
};

/**
 * Cache Warmer Cron Job
 *
 * Handles scheduled cache warming for RBAC enforcers.
 *
 * Schedule: Every hour (registered via RbacCronCommand)
 * Purpose: Fallback mechanism to ensure caches stay warm
 *          if PG NOTIFY misses updates
 *
 * This job uses the @Processor pattern to ensure it only runs on Worker,
 * avoiding duplicate execution on both Server and Worker.
 *
 * @see CacheWarmerService for actual warming logic
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class CacheWarmerJob {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:CacheWarmerJob`);

  constructor(private readonly cacheWarmerService: CacheWarmerService) {}

  /**
   * Process handler for scheduled hourly cache resync
   * Fallback mechanism if PG NOTIFY misses updates
   */
  @Process(CacheWarmerJob.name)
  @SentryCronMonitor(CacheWarmerJob.name, CronExpression.EVERY_HOUR)
  async handle(data: CacheWarmerJobData): Promise<void> {
    const { workspaceId } = data;
    const status = this.cacheWarmerService.getStatus();

    if (!status.enabled) {
      this.logger.debug('Cache warmer disabled', { workspaceId });

      return;
    }

    this.logger.log('Starting scheduled hourly cache resync', { workspaceId });

    try {
      const result = await this.cacheWarmerService.warmAllCaches();

      this.logger.log('Scheduled resync completed', {
        workspaceId,
        warmed: result.warmed,
        totalWorkspaces: result.totalWorkspaces,
        latencyMs: result.latencyMs,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Scheduled resync failed', {
        workspaceId,
        error: errorMessage,
      });

      throw error;
    }
  }
}
