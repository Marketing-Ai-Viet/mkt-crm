import { Injectable, Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { DashboardOrchestratorService } from 'src/mkt-core/mkt-dashboard/services/application/dashboard-orchestrator.service';
import { DashboardCacheWarmupJobData } from 'src/mkt-core/mkt-dashboard/types/dashboard-job.types';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { getErrorMessage } from 'src/mkt-core/utils';

const WARMUP_PERIODS: DashboardPeriod[] = ['TODAY', 'THIS_WEEK', 'THIS_MONTH'];

/**
 * Cache warmup job for the Dashboard module
 *
 * Pre-populates dashboard cache for frequently accessed periods.
 * Runs via cron to ensure fast dashboard loads for users.
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class DashboardCacheWarmupJob {
  private readonly logger = new Logger(DashboardCacheWarmupJob.name);

  constructor(private readonly orchestrator: DashboardOrchestratorService) {}

  @Process(DashboardCacheWarmupJob.name)
  async handle(data: DashboardCacheWarmupJobData): Promise<void> {
    const { workspaceId } = data;

    this.logger.log('Starting dashboard cache warmup', { workspaceId });

    try {
      for (const period of WARMUP_PERIODS) {
        await this.orchestrator.getDashboardSummary(workspaceId, { period });
      }

      this.logger.log('Dashboard cache warmup completed', {
        workspaceId,
        warmedPeriods: WARMUP_PERIODS.length,
      });
    } catch (error) {
      this.handleError(workspaceId, error);
    }
  }

  /**
   * Handle and log error with structured format
   */
  private handleError(workspaceId: string, error: unknown): void {
    this.logger.error('Dashboard cache warmup failed', {
      workspaceId,
      error: getErrorMessage(error),
    });

    throw error;
  }
}
