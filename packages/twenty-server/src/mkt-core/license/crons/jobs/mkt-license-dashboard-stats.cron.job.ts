import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { MktLicenseDashboardStatsCommand } from 'src/mkt-core/license/commands/mkt-license-dashboard-stats.command';
import {
  MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN,
  MktLicenseDashboardStatsJobData,
} from 'src/mkt-core/license/crons/mkt-license-dashboard-stats.cron.constants';

@Processor(MessageQueue.cronQueue)
export class MktLicenseDashboardStatsCronJob {
  private readonly logger = new Logger(MktLicenseDashboardStatsCronJob.name);

  constructor(
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly configService: ConfigService,
    private readonly exceptionHandlerService: ExceptionHandlerService,
    private readonly mktLicenseDashboardStatsCommand: MktLicenseDashboardStatsCommand,
  ) {
    this.logger.log('🚀 MktLicenseDashboardStatsCronJob processor initialized');
  }

  @Process('mkt-license-dashboard-stats')
  @SentryCronMonitor(
    'mkt-license-dashboard-stats',
    MKT_LICENSE_DASHBOARD_STATS_CRON_PATTERN,
  )
  async handle(data: MktLicenseDashboardStatsJobData): Promise<void> {
    this.logger.log(
      '🔥 CRON JOB RECEIVED! Processing mkt-license-dashboard-stats',
    );
    this.logger.log(`📋 Job data received: ${JSON.stringify(data)}`);

    const { workspaceId } = data;

    try {
      this.logger.log(
        `🚀 Starting license dashboard stats generation for workspace: ${workspaceId}`,
      );

      // Kiểm tra workspace có tồn tại không
      const workspace = await this.workspaceRepository.findOne({
        where: { id: workspaceId },
      });

      if (!workspace) {
        this.logger.warn(
          `Workspace ${workspaceId} not found, skipping stats generation`,
        );

        return;
      }

      // Chạy command với workspace ID
      await this.mktLicenseDashboardStatsCommand.run([], {
        workspaceId,
        format: 'json',
        detailed: true,
      });

      this.logger.log(
        `License dashboard stats generated successfully for workspace: ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate license dashboard stats for workspace ${workspaceId}:`,
        error,
      );

      this.exceptionHandlerService.captureExceptions([error], {
        workspace: {
          id: workspaceId,
        },
      });
    }
  }
}
