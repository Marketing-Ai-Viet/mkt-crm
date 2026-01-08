import { Injectable, Logger } from '@nestjs/common';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import {
  MktCustomerTierUpdateJob,
  MktCustomerTierUpdateJobData,
} from 'src/mkt-core/customer/jobs/mkt-customer-tier-update.job';

/**
 * Options for tier update queue
 */
type TierUpdateOptions = {
  reason?: 'order_completed' | 'manual';
};

@Injectable()
export class MktCustomerQueueService {
  private readonly logger = new Logger(MktCustomerQueueService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.customerQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  /**
   * Enqueue customer tier update job
   * @param customerId - Customer ID to update
   * @param workspaceId - Workspace ID for the customer
   * @param options - Additional options (reason for update)
   */
  async updateCustomerTier(
    customerId: string,
    workspaceId: string,
    options: TierUpdateOptions = {},
  ): Promise<void> {
    this.logger.log(
      `Enqueuing customer tier update for customer ${customerId} in workspace ${workspaceId}`,
    );

    await this.messageQueueService.add<MktCustomerTierUpdateJobData>(
      MktCustomerTierUpdateJob.name,
      {
        customerId,
        workspaceId,
        reason: options.reason ?? 'order_completed',
      },
      { retryLimit: 3 },
    );
  }

  /**
   * Enqueue tier updates for multiple customers
   * @param customerIds - Array of customer IDs
   * @param workspaceId - Workspace ID
   * @param options - Additional options
   */
  async updateMultipleCustomerTiers(
    customerIds: string[],
    workspaceId: string,
    options: TierUpdateOptions = {},
  ): Promise<void> {
    this.logger.log(
      `Enqueuing tier updates for ${customerIds.length} customers in workspace ${workspaceId}`,
    );

    const jobs = customerIds.map((customerId) =>
      this.messageQueueService.add<MktCustomerTierUpdateJobData>(
        MktCustomerTierUpdateJob.name,
        {
          customerId,
          workspaceId,
          reason: options.reason ?? 'order_completed',
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
