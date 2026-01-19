import { Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import {
  MKT_CUSTOMER_CATEGORIZATION_BATCH_SIZE,
  MKT_CUSTOMER_CATEGORIZATION_CRON_PATTERN,
} from 'src/mkt-core/customer/constants/mkt-customer-categorization.constants';
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
    const startTime = Date.now();

    this.logger.log('Starting customer categorization job', { workspaceId });

    try {
      const results = await this.categorizationService.categorizeAllCustomers(
        workspaceId,
        MKT_CUSTOMER_CATEGORIZATION_BATCH_SIZE,
      );

      const durationMs = Date.now() - startTime;

      this.logResults(workspaceId, results, durationMs);
    } catch (error) {
      this.handleError(workspaceId, error);
    }
  }

  /**
   * Log kết quả với structured format
   */
  private logResults(
    workspaceId: string,
    results: { processed: number; updated: number; errors: number },
    durationMs: number,
  ): void {
    const logContext = {
      workspaceId,
      processed: results.processed,
      updated: results.updated,
      errors: results.errors,
      durationMs,
      batchSize: MKT_CUSTOMER_CATEGORIZATION_BATCH_SIZE,
    };

    if (results.errors > 0) {
      this.logger.warn('Categorization completed with errors', logContext);
    } else {
      this.logger.log('Categorization completed', logContext);
    }
  }

  /**
   * Handle và log error với structured format
   */
  private handleError(workspaceId: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('Failed to categorize customers', {
      workspaceId,
      error: errorMessage,
    });

    throw error;
  }
}
