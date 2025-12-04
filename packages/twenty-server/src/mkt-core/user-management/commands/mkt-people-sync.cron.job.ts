import { Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MKT_PEOPLE_SYNC_CRON_PATTERN } from 'src/mkt-core/user-management/constants/mkt-people-sync.constants';
import { MktPeopleSyncService } from 'src/mkt-core/user-management/services/mkt-people-sync.service';

@Processor(MessageQueue.cronQueue)
export class MktPeopleSyncCronJob {
  private readonly logger = new Logger(MktPeopleSyncCronJob.name);

  constructor(private readonly mktPeopleSyncService: MktPeopleSyncService) {}

  @Process(MktPeopleSyncCronJob.name)
  @SentryCronMonitor(MktPeopleSyncCronJob.name, MKT_PEOPLE_SYNC_CRON_PATTERN)
  async handle(data: { workspaceId: string }): Promise<void> {
    this.logger.log('🔄 Processing people sync to create users');
    const { workspaceId } = data;

    try {
      await this.mktPeopleSyncService.syncPeopleToUsers(workspaceId);
      // await this.mktPeopleSyncService.syncCustomerToUsers(workspaceId);
    } catch (error) {
      this.logger.error('Failed to process people sync:', error);
      throw error;
    }
  }
}
