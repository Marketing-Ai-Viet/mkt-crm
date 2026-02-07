import { Injectable, Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { DashboardOrchestratorService } from 'src/mkt-core/mkt-dashboard/services/application/dashboard-orchestrator.service';
import { DashboardSnapshotService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-snapshot.service';
import { DashboardSnapshotJobData } from 'src/mkt-core/mkt-dashboard/types/dashboard-job.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

/**
 * Daily snapshot job for the Dashboard module
 *
 * Creates a daily snapshot of dashboard summary data.
 * Runs via cron to capture daily metrics for historical tracking.
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class DashboardSnapshotDailyJob {
  private readonly logger = new Logger(DashboardSnapshotDailyJob.name);

  constructor(
    private readonly orchestrator: DashboardOrchestratorService,
    private readonly snapshotService: DashboardSnapshotService,
  ) {}

  @Process(DashboardSnapshotDailyJob.name)
  async handle(data: DashboardSnapshotJobData): Promise<void> {
    const { workspaceId } = data;
    const startTime = DateTimeUtils.toMillis(DateTimeUtils.now());

    this.logger.log('Starting daily dashboard snapshot', { workspaceId });

    try {
      const summary = await this.orchestrator.getDashboardSummary(workspaceId, {
        period: 'TODAY',
      });

      await this.snapshotService.createSnapshot(
        {
          name: `Daily Snapshot - ${DateTimeUtils.toISO(DateTimeUtils.now())}`,
          snapshotType: 'DAILY',
          dataSource: 'COMBINED',
          period: 'TODAY',
        },
        summary as unknown as Record<string, unknown>,
      );

      const durationMs =
        DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;

      this.logger.log('Daily dashboard snapshot completed', {
        workspaceId,
        durationMs,
      });
    } catch (error) {
      this.handleError(workspaceId, error);
    }
  }

  /**
   * Handle and log error with structured format
   */
  private handleError(workspaceId: string, error: unknown): void {
    this.logger.error('Failed to create daily dashboard snapshot', {
      workspaceId,
      error: getErrorMessage(error),
    });

    throw error;
  }
}
