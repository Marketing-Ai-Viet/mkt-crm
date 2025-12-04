import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MktPeopleSyncCronJob as MktCronJob } from 'src/mkt-core/user-management/commands/mkt-people-sync.cron.job';
import { MKT_PEOPLE_SYNC_CRON_PATTERN as PATTERN } from 'src/mkt-core/user-management/constants/mkt-people-sync.constants';

@Injectable()
export class MktPeopleSyncRegistrationService {
  private readonly logger = new Logger(MktPeopleSyncRegistrationService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly configService: ConfigService,
  ) {}

  public async register(): Promise<void> {
    const pattern = process.env['MKT_PEOPLE_SYNC_CRON_PATTERN'] || PATTERN;
    const workspaceId =
      this.configService.get<string>('MKT_WORKSPACE_ID') ||
      '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

    this.logger.log(
      `🛠 Registering ${MktCronJob.name} for workspace: ${workspaceId}`,
    );

    if (!workspaceId) return;

    await this.messageQueueService.addCron({
      jobName: MktCronJob.name,
      data: { workspaceId },
      options: {
        repeat: {
          pattern,
        },
      },
    });
  }
}
