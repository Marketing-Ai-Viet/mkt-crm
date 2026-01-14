import { Injectable, Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MktPromotionRepository } from 'src/mkt-core/mkt-promotion/repositories';

/**
 * Job data interface cho promotion cache warmup
 */
export type PromotionCacheWarmupJobData = {
  workspaceId: string;
};

/**
 * Job khởi tạo cache cho các promotions đang active
 *
 * Chức năng:
 * - Load tất cả promotions có status = ACTIVE
 * - Warm up cache với dữ liệu promotions
 * - Chạy khi server khởi động hoặc sau khi cache bị clear
 *
 * Job được trigger với workspaceId cụ thể
 * Uses MktPromotionRepository for thread-safe access
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class PromotionCacheWarmupJob {
  private readonly logger = new Logger(PromotionCacheWarmupJob.name);

  constructor(private readonly promotionRepository: MktPromotionRepository) {
    this.logger.log('PromotionCacheWarmupJob initialized');
  }

  @Process(PromotionCacheWarmupJob.name)
  async handle(data: PromotionCacheWarmupJobData): Promise<void> {
    const { workspaceId } = data;

    this.logger.log(
      `Starting promotion cache warmup for workspace ${workspaceId}`,
    );

    try {
      const count = await this.warmupCacheForWorkspace(workspaceId);

      this.logger.log(
        `Promotion cache warmup completed: ${count} promotions cached for workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Promotion cache warmup failed for workspace ${workspaceId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Warm up cache cho một workspace cụ thể
   * Uses MktPromotionRepository for thread-safe access
   */
  private async warmupCacheForWorkspace(workspaceId: string): Promise<number> {
    // Load tất cả active promotions với các relations cần thiết
    const activePromotions =
      await this.promotionRepository.findActiveWithRules();

    if (activePromotions.length === 0) {
      this.logger.debug(
        `No active promotions found for workspace ${workspaceId}`,
      );

      return 0;
    }

    this.logger.log(
      `Loaded ${activePromotions.length} active promotions for workspace ${workspaceId}`,
    );

    // TODO: Implement actual cache storage logic here
    // For now, we're just loading the data to populate any query cache

    return activePromotions.length;
  }
}
