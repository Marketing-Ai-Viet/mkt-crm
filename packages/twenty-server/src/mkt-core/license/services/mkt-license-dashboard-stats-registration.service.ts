import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN } from 'src/mkt-core/license/constants/mkt-license-dashboard-stats.constants';

@Injectable()
export class MktLicenseDashboardStatsRegistrationService {
  private readonly logger = new Logger(
    MktLicenseDashboardStatsRegistrationService.name,
  );

  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly configService: ConfigService,
  ) {}

  async register(): Promise<void> {
    const workspaceId =
      this.configService.get<string>('MKT_LICENSE_STATS_WORKSPACE_ID') ||
      '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

    this.logger.log(
      `🛠 Registering MktLicenseDashboardStatsCronJob for workspace: ${workspaceId}`,
    );

    if (!workspaceId) return;

    const pattern =
      process.env['MKT_LICENSE_STATS_CRON_PATTERN'] ||
      MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN;
    const data = { workspaceId };

    await this.messageQueueService.addCron({
      jobName: 'MktLicenseDashboardStatsCronJob',
      data,
      options: {
        repeat: {
          pattern,
        },
      },
    });
  }
}
