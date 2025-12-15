import { Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MKT_ORDER_OVERDUE_CRON_PATTERN } from 'src/mkt-core/order/constants/mkt-order-overdue.constants';
import { MktOrderOverdueService } from 'src/mkt-core/order/services/legacy';

@Processor(MessageQueue.cronQueue)
export class MktOrderOverdueCronJob {
  private readonly logger = new Logger(MktOrderOverdueCronJob.name);

  constructor(
    private readonly mktOrderOverdueService: MktOrderOverdueService,
  ) {}

  @Process(MktOrderOverdueCronJob.name)
  @SentryCronMonitor(
    MktOrderOverdueCronJob.name,
    MKT_ORDER_OVERDUE_CRON_PATTERN,
  )
  async handle(data: { workspaceId: string }): Promise<void> {
    this.logger.log('🔥 Processing order overdue updates');
    const { workspaceId } = data;

    try {
      await this.mktOrderOverdueService.updateOverdueOrders(workspaceId);
      //   if (data?.workspaceId) {
      //     // Process specific workspace
      //     await this.mktOrderOverdueService.updateOverdueOrders(data.workspaceId);
      //   } else {
      //     // Process all workspaces
      //     //await this.mktOrderOverdueService.processAllWorkspaces();
      //   }
    } catch (error) {
      this.logger.error('Failed to process order overdue updates:', error);
      throw error;
    }
  }
}
