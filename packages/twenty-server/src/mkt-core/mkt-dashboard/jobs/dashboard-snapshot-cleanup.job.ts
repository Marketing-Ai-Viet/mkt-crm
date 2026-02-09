import { Injectable, Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { DashboardSnapshotService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-snapshot.service';
import { DashboardCleanupJobData } from 'src/mkt-core/mkt-dashboard/types/dashboard-job.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const DAILY_RETENTION_DAYS = 90;
const WEEKLY_RETENTION_MONTHS = 6;
const MONTHLY_RETENTION_MONTHS = 12;

/**
 * Snapshot cleanup job for the Dashboard module
 *
 * Removes old snapshots based on retention policies:
 * - Daily snapshots: retained for 90 days
 * - Weekly snapshots: retained for 6 months
 * - Monthly snapshots: retained for 12 months
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class DashboardSnapshotCleanupJob {
  private readonly logger = new Logger(DashboardSnapshotCleanupJob.name);

  constructor(private readonly snapshotService: DashboardSnapshotService) {}

  @Process(DashboardSnapshotCleanupJob.name)
  async handle(data: DashboardCleanupJobData): Promise<void> {
    const { workspaceId } = data;

    this.logger.log('Starting dashboard snapshot cleanup', { workspaceId });

    try {
      const now = DateTimeUtils.now();

      // Delete daily snapshots older than 90 days
      const dailyCutoff = DateTimeUtils.subtract(now, {
        days: DAILY_RETENTION_DAYS,
      });
      const dailyDeleted = await this.snapshotService.deleteSnapshotsBefore(
        'DAILY',
        DateTimeUtils.toISO(dailyCutoff),
      );

      // Delete weekly snapshots older than 6 months
      const weeklyCutoff = DateTimeUtils.subtract(now, {
        months: WEEKLY_RETENTION_MONTHS,
      });
      const weeklyDeleted = await this.snapshotService.deleteSnapshotsBefore(
        'WEEKLY',
        DateTimeUtils.toISO(weeklyCutoff),
      );

      // Delete monthly snapshots older than 12 months
      const monthlyCutoff = DateTimeUtils.subtract(now, {
        months: MONTHLY_RETENTION_MONTHS,
      });
      const monthlyDeleted = await this.snapshotService.deleteSnapshotsBefore(
        'MONTHLY',
        DateTimeUtils.toISO(monthlyCutoff),
      );

      const totalDeleted = dailyDeleted + weeklyDeleted + monthlyDeleted;

      this.logger.log('Dashboard snapshot cleanup completed', {
        workspaceId,
        totalDeleted,
        dailyDeleted,
        weeklyDeleted,
        monthlyDeleted,
      });
    } catch (error) {
      this.handleError(workspaceId, error);
    }
  }

  /**
   * Handle and log error with structured format
   */
  private handleError(workspaceId: string, error: unknown): void {
    this.logger.error('Dashboard snapshot cleanup failed', {
      workspaceId,
      error: getErrorMessage(error),
    });

    throw error;
  }
}
