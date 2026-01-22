import { Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN } from 'src/mkt-core/customer/constants/mkt-customer-tier.constants';
import { MktCustomerTierService } from 'src/mkt-core/customer/services/tier/mkt-customer-tier.service';

export type TierUpdateCronJobData = {
  workspaceId: string;
};

@Processor(MessageQueue.cronQueue)
export class MktCustomerTierCronJob {
  private readonly logger = new Logger(MktCustomerTierCronJob.name);

  constructor(
    private readonly mktCustomerTierService: MktCustomerTierService,
  ) {}

  @Process(MktCustomerTierCronJob.name)
  @SentryCronMonitor(
    MktCustomerTierCronJob.name,
    MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN,
  )
  async handle(data: TierUpdateCronJobData): Promise<void> {
    const { workspaceId } = data;
    const startTime = Date.now();

    this.logger.log('Starting customer tier update job', { workspaceId });

    try {
      // Use workspace-specific method for thread-safe processing
      const results =
        await this.mktCustomerTierService.updateAllCustomerTiersForWorkspace(
          workspaceId,
        );

      const durationMs = Date.now() - startTime;

      this.logger.log('Customer tier update completed', {
        workspaceId,
        totalUpdated: results.length,
        durationMs,
      });
    } catch (error) {
      this.handleError(workspaceId, error);
    }
  }

  /**
   * Handle và log error với structured format
   */
  private handleError(workspaceId: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('Failed to process customer tier updates', {
      workspaceId,
      error: errorMessage,
    });

    throw error;
  }
}
