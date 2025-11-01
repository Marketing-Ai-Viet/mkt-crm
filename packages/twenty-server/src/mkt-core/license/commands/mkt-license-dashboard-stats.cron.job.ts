import { Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN } from 'src/mkt-core/license/constants/mkt-license-dashboard-stats.constants';
import { MktLicenseDashboardStatsService } from 'src/mkt-core/license/services/mkt-license-dashboard-stats.service';

@Processor(MessageQueue.cronQueue)
export class MktLicenseDashboardStatsCronJob {
  private readonly logger = new Logger(MktLicenseDashboardStatsCronJob.name);

  constructor(
    private readonly mktLicenseDashboardStatsService: MktLicenseDashboardStatsService,
  ) {}

  @Process(MktLicenseDashboardStatsCronJob.name)
  @SentryCronMonitor(
    MktLicenseDashboardStatsCronJob.name,
    MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN,
  )
  async handle(data: { workspaceId: string }): Promise<void> {
    this.logger.log('🔥 Processing mkt-license-dashboard-stats');
    const { workspaceId } = data;

    try {
      await this.mktLicenseDashboardStatsService.generateStatsForWorkspace(
        workspaceId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate license dashboard stats for workspace ${workspaceId}:`,
        error,
      );
    }
  }
}
