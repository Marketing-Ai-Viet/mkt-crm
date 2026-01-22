import { Injectable, Logger } from '@nestjs/common';

import { In } from 'typeorm';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPromotionUsageWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion-usage.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

const RETENTION_YEARS = 2;

/**
 * Job data interface cho promotion usage cleanup
 */
export type PromotionUsageCleanupJobData = {
  workspaceId: string;
};

/**
 * Job dọn dẹp các bản ghi promotion usage cũ
 *
 * Chức năng:
 * - Tìm các usage record cũ hơn 2 năm
 * - Soft delete (cập nhật deletedAt)
 * - Log số lượng records đã cleanup
 *
 * Job được trigger với workspaceId cụ thể
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class PromotionUsageCleanupJob {
  private readonly logger = new Logger(PromotionUsageCleanupJob.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  @Process(PromotionUsageCleanupJob.name)
  async handle(data: PromotionUsageCleanupJobData): Promise<void> {
    const { workspaceId } = data;
    const startTime = Date.now();

    this.logger.log('Starting promotion usage cleanup', { workspaceId });

    try {
      const cleanedCount =
        await this.cleanupOldUsageRecordsForWorkspace(workspaceId);

      const durationMs = Date.now() - startTime;

      this.logger.log('Promotion usage cleanup completed', {
        workspaceId,
        cleanedCount,
        durationMs,
      });
    } catch (error) {
      this.handleError(workspaceId, error);
    }
  }

  /**
   * Handle và log error với structured format
   */
  private handleError(workspaceId: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('Promotion usage cleanup failed', {
      workspaceId,
      error: errorMessage,
    });

    throw error;
  }

  /**
   * Dọn dẹp usage records cũ cho một workspace
   */
  private async cleanupOldUsageRecordsForWorkspace(
    workspaceId: string,
  ): Promise<number> {
    const usageRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPromotionUsageWorkspaceEntity>(
        workspaceId,
        'mktPromotionUsage',
        { shouldBypassPermissionChecks: true },
      );

    const now = DateTimeUtils.now();
    const cutoffDateTime = DateTimeUtils.subtract(now, {
      years: RETENTION_YEARS,
    });
    const cutoffDateString = DateTimeUtils.toISO(cutoffDateTime);

    this.logger.debug('Cleanup cutoff date calculated', {
      workspaceId,
      cutoffDate: cutoffDateString,
      retentionYears: RETENTION_YEARS,
    });

    // Tìm các usage records cũ hơn RETENTION_YEARS năm và chưa bị xóa
    const oldUsageRecords = await usageRepository
      .createQueryBuilder('usage')
      .where('usage.appliedAt < :cutoffDate', { cutoffDate: cutoffDateString })
      .andWhere('usage.deletedAt IS NULL')
      .getMany();

    if (oldUsageRecords.length === 0) {
      this.logger.debug('No old usage records found', { workspaceId });

      return 0;
    }

    this.logger.log('Found old usage records', {
      workspaceId,
      count: oldUsageRecords.length,
    });

    // Soft delete: cập nhật deletedAt
    const nowString = DateTimeUtils.toISO(now);
    const recordIds = oldUsageRecords.map((r) => r.id);

    await usageRepository.update(
      { id: In(recordIds) },
      { deletedAt: nowString },
    );

    this.logger.log('Soft deleted usage records', {
      workspaceId,
      count: oldUsageRecords.length,
      cutoffDate: cutoffDateString,
    });

    return oldUsageRecords.length;
  }
}
