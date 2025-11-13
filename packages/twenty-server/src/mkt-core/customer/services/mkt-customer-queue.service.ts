import { Injectable, Logger } from '@nestjs/common';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import {
  MktCustomerTierUpdateJob,
  MktCustomerTierUpdateJobData,
} from 'src/mkt-core/customer/jobs/mkt-customer-tier-update.job';

@Injectable()
export class MktCustomerQueueService {
  private readonly logger = new Logger(MktCustomerQueueService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.customerQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  /**
   * @param customerId
   */
  async updateCustomerTier(customerId: string): Promise<void> {
    this.logger.log(
      `Enqueuing customer tier update for customer ${customerId}}`,
    );

    await this.messageQueueService.add<MktCustomerTierUpdateJobData>(
      MktCustomerTierUpdateJob.name,
      {
        customerId,
      },
      { retryLimit: 3 },
    );
  }

  /**
   * @param customerIds
   */
  async updateMultipleCustomerTiers(customerIds: string[]): Promise<void> {
    this.logger.log(
      `Enqueuing tier updates for ${customerIds.length} customers`,
    );

    const jobs = customerIds.map((customerId) =>
      this.messageQueueService.add<MktCustomerTierUpdateJobData>(
        MktCustomerTierUpdateJob.name,
        {
          customerId,
        },
        { retryLimit: 3 },
      ),
    );

    await Promise.all(jobs);

    this.logger.log(
      `Successfully enqueued ${customerIds.length} customer tier update jobs`,
    );
  }
}
