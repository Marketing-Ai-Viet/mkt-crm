import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CrossRegionInvalidationPubSub } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/pubsub';

/**
 * Job data interface for cross-region reload job
 */
export type CrossRegionReloadJobData = {
  workspaceId: string;
};

/**
 * Cross-Region Reload Cron Job
 *
 * Handles scheduled full policy reload for cross-region consistency.
 *
 * Schedule: Every hour (registered via RbacCronCommand)
 * Purpose: Safety net to ensure eventual consistency
 *          even if Redis Pub/Sub messages are lost
 *
 * This job uses the @Processor pattern to ensure it only runs on Worker,
 * avoiding duplicate execution on both Server and Worker.
 *
 * @see CrossRegionInvalidationPubSub for actual invalidation logic
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class CrossRegionReloadJob {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:CrossRegionReloadJob`,
  );

  constructor(
    private readonly crossRegionPubSub: CrossRegionInvalidationPubSub,
  ) {}

  /**
   * Process handler for hourly safety net: Full policy reload
   *
   * Ensures eventual consistency even if Pub/Sub messages are lost.
   */
  @Process(CrossRegionReloadJob.name)
  @SentryCronMonitor(CrossRegionReloadJob.name, CronExpression.EVERY_HOUR)
  async handle(data: CrossRegionReloadJobData): Promise<void> {
    const { workspaceId } = data;
    const status = this.crossRegionPubSub.getStatus();

    if (!status.enabled) {
      this.logger.debug('Cross-region reload disabled', { workspaceId });

      return;
    }

    this.logger.log('Starting scheduled hourly full reload', { workspaceId });

    try {
      await this.crossRegionPubSub.forceFullReload();

      this.logger.log('Scheduled hourly full reload completed', {
        workspaceId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Scheduled full reload failed', {
        workspaceId,
        error: errorMessage,
      });

      throw error;
    }
  }
}
