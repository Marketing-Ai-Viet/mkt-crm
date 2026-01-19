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

  constructor(private readonly promotionRepository: MktPromotionRepository) {}

  @Process(PromotionCacheWarmupJob.name)
  async handle(data: PromotionCacheWarmupJobData): Promise<void> {
    const { workspaceId } = data;
    const startTime = Date.now();

    this.logger.log('Starting promotion cache warmup', { workspaceId });

    try {
      const count = await this.warmupCacheForWorkspace(workspaceId);

      const durationMs = Date.now() - startTime;

      this.logger.log('Promotion cache warmup completed', {
        workspaceId,
        cachedCount: count,
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

    this.logger.error('Promotion cache warmup failed', {
      workspaceId,
      error: errorMessage,
    });

    throw error;
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
      this.logger.debug('No active promotions found', { workspaceId });

      return 0;
    }

    this.logger.log('Loaded active promotions', {
      workspaceId,
      count: activePromotions.length,
    });

    // TODO: Implement actual cache storage logic here
    // For now, we're just loading the data to populate any query cache

    return activePromotions.length;
  }
}
