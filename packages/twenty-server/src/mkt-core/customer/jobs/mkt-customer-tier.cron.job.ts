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

    this.logger.log(
      `🔥 Starting customer tier update job for workspace ${workspaceId}`,
    );

    try {
      // Use workspace-specific method for thread-safe processing
      const results =
        await this.mktCustomerTierService.updateAllCustomerTiersForWorkspace(
          workspaceId,
        );

      this.logger.log(
        `✅ Successfully updated ${results.length} customer tiers for workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process customer tier updates for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }
}
