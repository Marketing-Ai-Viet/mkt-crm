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

  constructor(private readonly twentyORMGlobalManager: TwentyORMGlobalManager) {
    this.logger.log('PromotionUsageCleanupJob initialized');
  }

  @Process(PromotionUsageCleanupJob.name)
  async handle(data: PromotionUsageCleanupJobData): Promise<void> {
    const { workspaceId } = data;

    this.logger.log(
      `Starting promotion usage cleanup for workspace ${workspaceId}`,
    );

    try {
      const cleanedCount =
        await this.cleanupOldUsageRecordsForWorkspace(workspaceId);

      this.logger.log(
        `Promotion usage cleanup completed: ${cleanedCount} records cleaned for workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Promotion usage cleanup failed for workspace ${workspaceId}`,
        error,
      );
      throw error;
    }
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

    this.logger.debug(
      `Cleanup cutoff date for workspace ${workspaceId}: ${cutoffDateString}`,
    );

    // Tìm các usage records cũ hơn RETENTION_YEARS năm và chưa bị xóa
    const oldUsageRecords = await usageRepository
      .createQueryBuilder('usage')
      .where('usage.appliedAt < :cutoffDate', { cutoffDate: cutoffDateString })
      .andWhere('usage.deletedAt IS NULL')
      .getMany();

    if (oldUsageRecords.length === 0) {
      this.logger.debug(
        `No old usage records found for workspace ${workspaceId}`,
      );

      return 0;
    }

    this.logger.log(
      `Found ${oldUsageRecords.length} old usage records for workspace ${workspaceId}`,
    );

    // Soft delete: cập nhật deletedAt
    const nowString = DateTimeUtils.toISO(now);
    const recordIds = oldUsageRecords.map((r) => r.id);

    await usageRepository.update(
      { id: In(recordIds) },
      { deletedAt: nowString },
    );

    this.logger.log(
      `Soft deleted ${oldUsageRecords.length} usage records for workspace ${workspaceId} (older than ${cutoffDateString})`,
    );

    return oldUsageRecords.length;
  }
}
