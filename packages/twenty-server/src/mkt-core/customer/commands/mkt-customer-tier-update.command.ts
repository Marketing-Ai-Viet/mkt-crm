import { Logger } from '@nestjs/common';

import { Command, CommandRunner, Option } from 'nest-commander';

import { MktCustomerQueueService } from 'src/mkt-core/customer/services/mkt-customer-queue.service';

type MktCustomerTierUpdateCommandOptions = {
  customerId: string;
};

/**
 * Command để test customer message queue
 * Sử dụng: yarn command mkt:customer:tier-update -c <customerId>>
 */
@Command({
  name: 'mkt:customer:tier-update',
  description: 'Enqueue a job to update customer tier using message queue',
})
export class MktCustomerTierUpdateCommand extends CommandRunner {
  private readonly logger = new Logger(MktCustomerTierUpdateCommand.name);

  constructor(private readonly customerQueueService: MktCustomerQueueService) {
    super();
  }

  async run(
    _passedParam: string[],
    options: MktCustomerTierUpdateCommandOptions,
  ): Promise<void> {
    const { customerId } = options;

    this.logger.log('==========================================');
    this.logger.log('Customer Tier Update via Message Queue');
    this.logger.log('==========================================');
    this.logger.log(`Customer ID: ${customerId}`);
    this.logger.log('------------------------------------------');

    try {
      await this.customerQueueService.updateCustomerTier(customerId);

      this.logger.log('✅ Job successfully enqueued!');
      this.logger.log(
        'The customer tier will be updated asynchronously by the worker.',
      );
    } catch (error) {
      this.logger.error('❌ Failed to enqueue job:', error.message);
      throw error;
    }

    this.logger.log('==========================================');
  }

  @Option({
    flags: '-c, --customer-id [customer_id]',
    description: 'Customer ID to update tier',
    required: true,
  })
  parseCustomerId(value: string): string {
    return value;
  }

  @Option({
    flags: '-w, --workspace-id [workspace_id]',
    description: 'Workspace ID',
    required: true,
  })
  parseWorkspaceId(value: string): string {
    return value;
  }
}
