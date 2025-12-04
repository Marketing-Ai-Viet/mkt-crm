import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MktCustomerTierService } from 'src/mkt-core/customer/services/mkt-customer-tier.service';

export type MktCustomerTierUpdateJobData = {
  customerId: string;
};

@Processor(MessageQueue.customerQueue)
export class MktCustomerTierUpdateJob {
  private readonly logger = new Logger(MktCustomerTierUpdateJob.name);

  constructor(
    private readonly mktCustomerTierService: MktCustomerTierService,
  ) {}

  @Process(MktCustomerTierUpdateJob.name)
  async handle(data: MktCustomerTierUpdateJobData): Promise<void> {
    const { customerId } = data;

    this.logger.log(
      `Processing customer tier update for customer ${customerId}`,
    );

    try {
      const result =
        await this.mktCustomerTierService.updateCustomerTier(customerId);

      this.logger.log(
        `Successfully updated customer tier to ${result.customerTier} for customer ${customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update customer tier for customer ${customerId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
