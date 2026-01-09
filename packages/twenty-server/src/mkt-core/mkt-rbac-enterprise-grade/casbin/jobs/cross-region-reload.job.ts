import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { CrossRegionInvalidationPubSub } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/pubsub';

/**
 * Cross-Region Reload Cron Job
 *
 * Handles scheduled full policy reload for cross-region consistency.
 *
 * Schedule: Every hour
 * Purpose: Safety net to ensure eventual consistency
 *          even if Redis Pub/Sub messages are lost
 *
 * @see CrossRegionInvalidationPubSub for actual invalidation logic
 */
@Injectable()
export class CrossRegionReloadJob {
  private readonly logger = new Logger(
    `${CASBIN_LOG_CONTEXT}:CrossRegionReloadJob`,
  );

  constructor(
    private readonly crossRegionPubSub: CrossRegionInvalidationPubSub,
  ) {}

  /**
   * Hourly safety net: Full policy reload
   *
   * Ensures eventual consistency even if Pub/Sub messages are lost.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledFullReload(): Promise<void> {
    const status = this.crossRegionPubSub.getStatus();

    if (!status.enabled) {
      return;
    }

    this.logger.log('Starting scheduled hourly full reload...');

    try {
      await this.crossRegionPubSub.forceFullReload();

      this.logger.log('Scheduled hourly full reload completed');
    } catch (error) {
      this.logger.error(`Scheduled full reload failed: ${error}`);
    }
  }
}
