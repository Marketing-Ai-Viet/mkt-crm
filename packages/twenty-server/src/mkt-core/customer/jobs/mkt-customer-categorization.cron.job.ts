import { Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import {
  MKT_CUSTOMER_CATEGORIZATION_BATCH_SIZE,
  MKT_CUSTOMER_CATEGORIZATION_CRON_PATTERN,
} from 'src/mkt-core/customer/constants/mkt-customer-categorization.constants';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerCategorizationService } from 'src/mkt-core/customer/services/lifecycle/mkt-customer-categorization.service';

export type CategorizationCronJobData = {
  workspaceId: string;
};

@Processor(MessageQueue.cronQueue)
export class MktCustomerCategorizationCronJob {
  private readonly logger = new Logger(MktCustomerCategorizationCronJob.name);

  constructor(
    private readonly categorizationService: MktCustomerCategorizationService,
  ) {}

  @Process(MktCustomerCategorizationCronJob.name)
  @SentryCronMonitor(
    MktCustomerCategorizationCronJob.name,
    MKT_CUSTOMER_CATEGORIZATION_CRON_PATTERN,
  )
  async handle(data: CategorizationCronJobData): Promise<void> {
    const { workspaceId } = data;

    this.logger.log(
      CUSTOMER_MESSAGES.LOG.CATEGORIZATION_JOB_START(workspaceId),
    );

    try {
      const results = await this.categorizationService.categorizeAllCustomers(
        workspaceId,
        MKT_CUSTOMER_CATEGORIZATION_BATCH_SIZE,
      );

      this.logger.log(
        CUSTOMER_MESSAGES.LOG.CATEGORIZATION_JOB_COMPLETE(
          results.processed,
          results.updated,
        ),
      );

      if (results.errors > 0) {
        this.logger.warn(
          `Categorization completed with ${results.errors} errors`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to categorize customers for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }
}
