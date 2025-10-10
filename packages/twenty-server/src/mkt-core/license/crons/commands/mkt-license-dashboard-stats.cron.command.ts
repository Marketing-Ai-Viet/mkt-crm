import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Command, CommandRunner, Option } from 'nest-commander';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import {
  MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN,
  MktLicenseDashboardStatsCronOptions,
  MktLicenseDashboardStatsJobData,
} from 'src/mkt-core/license/crons/mkt-license-dashboard-stats.cron.constants';

@Command({
  name: 'cron:license:dashboard-stats',
  description: 'Starts cron jobs for license dashboard statistics generation',
})
export class MktLicenseDashboardStatsCronCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktLicenseDashboardStatsCronCommand.name,
  );

  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  @Option({
    flags: '-w, --workspace-ids [workspace_ids]',
    description:
      'Comma-separated list of workspace IDs (or use env variable MKT_LICENSE_STATS_WORKSPACE_IDS)',
  })
  parseWorkspaceIds(value: string): string {
    return value;
  }

  @Option({
    flags: '-c, --cron-pattern [cron_pattern]',
    description:
      'Cron pattern for scheduling (or use env variable MKT_LICENSE_STATS_CRON_PATTERN)',
  })
  parseCronPattern(value: string): string {
    return value;
  }

  async run(
    passedParams: string[],
    options?: MktLicenseDashboardStatsCronOptions,
  ): Promise<void> {
    // Lấy workspace IDs từ options hoặc env
    const workspaceIdsString =
      options?.workspaceIds ||
      this.configService.get<string>('MKT_LICENSE_STATS_WORKSPACE_IDS');

    if (!workspaceIdsString) {
      this.logger.error(
        'No workspace IDs provided. Please specify --workspace-ids or set MKT_LICENSE_STATS_WORKSPACE_IDS in .env',
      );

      return;
    }

    // Lấy cron pattern từ options hoặc env (mặc định là hàng ngày lúc 2:00 AM)
    const cronPattern =
      options?.cronPattern ||
      this.configService.get<string>('MKT_LICENSE_STATS_CRON_PATTERN') ||
      MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN;

    // Parse workspace IDs
    const workspaceIds = workspaceIdsString
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (workspaceIds.length === 0) {
      this.logger.error('No valid workspace IDs found');

      return;
    }

    this.logger.log(
      `Setting up license dashboard stats cron jobs for ${workspaceIds.length} workspace(s)`,
    );
    this.logger.log(`Cron pattern: ${cronPattern}`);
    this.logger.log(`Workspace IDs: ${workspaceIds.join(', ')}`);

    // Tạo cron job cho từng workspace
    for (const workspaceId of workspaceIds) {
      try {
        const jobData: MktLicenseDashboardStatsJobData = {
          workspaceId,
        };

        await this.messageQueueService.addCron({
          jobName: 'mkt-license-dashboard-stats',
          data: jobData,
          options: {
            repeat: { pattern: cronPattern },
          },
        });

        this.logger.log(
          `Cron job registered successfully for workspace: ${workspaceId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to register cron job for workspace ${workspaceId}:`,
          error,
        );
      }
    }

    this.logger.log(
      'All license dashboard stats cron jobs have been registered',
    );
  }
}
