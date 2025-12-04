import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MktOrderOverdueCronJob } from 'src/mkt-core/order/commands/mkt-order-overdue.cron.job';
import { MKT_ORDER_OVERDUE_CRON_PATTERN } from 'src/mkt-core/order/constants/mkt-order-overdue.constants';

@Injectable()
export class MktOrderOverdueRegistrationService {
  private readonly logger = new Logger(MktOrderOverdueRegistrationService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly configService: ConfigService,
  ) {}

  public async register(): Promise<void> {
    const workspaceId =
      this.configService.get<string>('MKT_WORKSPACE_ID') ||
      '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

    this.logger.log(
      `🛠 Registering MktLicenseDashboardStatsCronJob for workspace: ${workspaceId}`,
    );

    if (!workspaceId) return;

    const pattern =
      process.env['MKT_ORDER_OVERDUE_CRON_PATTERN'] ||
      MKT_ORDER_OVERDUE_CRON_PATTERN;

    // Register cron job to process all workspaces
    await this.messageQueueService.addCron({
      jobName: MktOrderOverdueCronJob.name,
      data: { workspaceId }, // Pass workspaceId to process specific workspace
      options: {
        repeat: {
          pattern,
        },
      },
    });

    this.logger.log('Order overdue cron job registration completed');
  }
}
