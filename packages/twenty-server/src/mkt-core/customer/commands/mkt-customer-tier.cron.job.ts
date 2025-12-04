import { Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN } from 'src/mkt-core/customer/constants/mkt-customer-tier.constants';
import { MktCustomerTierService } from 'src/mkt-core/customer/services/mkt-customer-tier.service';

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
  async handle(data: { workspaceId: string }): Promise<void> {
    this.logger.log('🔥 Processing customer tier updates');
    const { workspaceId } = data;

    try {
      const results =
        await this.mktCustomerTierService.updateAllCustomerTiers();

      this.logger.log(
        `✅ Successfully updated ${results.length} customer tiers for workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error('Failed to process customer tier updates:', error);
      throw error;
    }
  }
}
