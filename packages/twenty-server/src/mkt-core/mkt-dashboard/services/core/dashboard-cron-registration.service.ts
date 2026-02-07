import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  BaseCronRegistrationService,
  CronJobConfig,
} from 'src/mkt-core/infrastructure/cron-registration';
import { DashboardSnapshotDailyJob } from 'src/mkt-core/mkt-dashboard/jobs/dashboard-snapshot-daily.job';
import { DashboardCacheWarmupJob } from 'src/mkt-core/mkt-dashboard/jobs/dashboard-cache-warmup.job';
import { DashboardSnapshotCleanupJob } from 'src/mkt-core/mkt-dashboard/jobs/dashboard-snapshot-cleanup.job';
import { DashboardSnapshotJobData } from 'src/mkt-core/mkt-dashboard/types/dashboard-job.types';

/**
 * Service tu dong dang ky dashboard cron jobs khi module khoi dong
 *
 * Jobs duoc dang ky:
 * - DashboardSnapshotDailyJob: Daily at 23:55 - Create daily dashboard snapshot
 * - DashboardCacheWarmupJob: Every 5 minutes - Warm up dashboard cache for common periods
 * - DashboardSnapshotCleanupJob: Daily at 02:00 - Clean up old dashboard snapshots
 *
 * Environment variables:
 * - MKT_DASHBOARD_CRON_ENABLED: Enable/disable dashboard cron jobs (default: true)
 */
@Injectable()
export class DashboardCronRegistrationService extends BaseCronRegistrationService {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    messageQueueService: MessageQueueService,
    @InjectRepository(Workspace, 'core')
    workspaceRepository: Repository<Workspace>,
  ) {
    super(messageQueueService, workspaceRepository);
  }

  protected getLogContext(): string {
    return 'MktDashboard:CronRegistration';
  }

  protected isEnabled(): boolean {
    return process.env.MKT_DASHBOARD_CRON_ENABLED !== 'false';
  }

  protected getCronJobsForWorkspace(
    workspaceId: string,
  ): CronJobConfig<DashboardSnapshotJobData>[] {
    return [
      {
        jobName: DashboardSnapshotDailyJob.name,
        pattern: '55 23 * * *',
        data: { workspaceId },
        description: 'Create daily dashboard snapshot',
      },
      {
        jobName: DashboardCacheWarmupJob.name,
        pattern: '*/5 * * * *',
        data: { workspaceId },
        description: 'Warm up dashboard cache for common periods',
      },
      {
        jobName: DashboardSnapshotCleanupJob.name,
        pattern: '0 2 * * *',
        data: { workspaceId },
        description: 'Clean up old dashboard snapshots',
      },
    ];
  }
}
