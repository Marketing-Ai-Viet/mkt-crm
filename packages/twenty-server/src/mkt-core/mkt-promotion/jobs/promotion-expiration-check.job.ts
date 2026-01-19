import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { PROMOTION_STATUS } from 'src/mkt-core/mkt-promotion/constants/mkt-promotion.constants';
import { PromotionExpiredEvent } from 'src/mkt-core/mkt-promotion/events/promotion.events';
import { MktPromotionRepository } from 'src/mkt-core/mkt-promotion/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Job data interface cho promotion expiration check
 */
export type PromotionExpirationCheckJobData = {
  workspaceId: string;
};

/**
 * Job xử lý kiểm tra và cập nhật trạng thái hết hạn cho promotions
 *
 * Chức năng:
 * - Tìm các promotion có endDate < NOW() và status = ACTIVE
 * - Cập nhật status thành EXPIRED
 * - Emit PromotionExpiredEvent cho mỗi promotion hết hạn
 * - Log số lượng promotion đã hết hạn
 *
 * Job được trigger với workspaceId cụ thể
 * Uses MktPromotionRepository for thread-safe access
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class PromotionExpirationCheckJob {
  private readonly logger = new Logger(PromotionExpirationCheckJob.name);

  constructor(
    private readonly promotionRepository: MktPromotionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process(PromotionExpirationCheckJob.name)
  async handle(data: PromotionExpirationCheckJobData): Promise<void> {
    const { workspaceId } = data;
    const startTime = Date.now();

    this.logger.log('Starting promotion expiration check', { workspaceId });

    try {
      const expiredCount =
        await this.checkAndExpirePromotionsForWorkspace(workspaceId);

      const durationMs = Date.now() - startTime;

      this.logger.log('Promotion expiration check completed', {
        workspaceId,
        expiredCount,
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

    this.logger.error('Promotion expiration check failed', {
      workspaceId,
      error: errorMessage,
    });

    throw error;
  }

  /**
   * Kiểm tra và cập nhật promotions hết hạn cho một workspace
   * Uses MktPromotionRepository for thread-safe access
   */
  private async checkAndExpirePromotionsForWorkspace(
    workspaceId: string,
  ): Promise<number> {
    const now = DateTimeUtils.now().toJSDate();

    // Tìm các promotion có endDate < NOW() và status = ACTIVE
    const expiredPromotions =
      await this.promotionRepository.findExpiredActive(now);

    if (expiredPromotions.length === 0) {
      this.logger.debug('No expired promotions found', { workspaceId });

      return 0;
    }

    this.logger.log('Found expired promotions', {
      workspaceId,
      count: expiredPromotions.length,
    });

    // Cập nhật status thành EXPIRED và emit event
    for (const promotion of expiredPromotions) {
      try {
        await this.promotionRepository.updateStatus(
          promotion.id,
          PROMOTION_STATUS.EXPIRED,
        );

        // Emit event
        const event = new PromotionExpiredEvent(
          workspaceId,
          promotion.id,
          'DATE_EXPIRED',
        );

        this.eventEmitter.emit('promotion.expired', event);

        this.logger.debug('Expired promotion', {
          promotionId: promotion.id,
          promotionName: promotion.name,
          endDate: promotion.endDate,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error('Failed to expire promotion', {
          promotionId: promotion.id,
          error: errorMessage,
        });
      }
    }

    return expiredPromotions.length;
  }

  /**
   * Kiểm tra và cập nhật promotions đạt usage limit
   * Uses MktPromotionRepository for thread-safe access
   */
  async checkAndExpirePromotionsByUsageLimit(
    workspaceId: string,
  ): Promise<number> {
    // Tìm các promotion có currentUsageCount >= usageLimit và status = ACTIVE
    const promotions = await this.promotionRepository.findUsageLimitReached();

    if (promotions.length === 0) {
      return 0;
    }

    this.logger.log('Found promotions reached usage limit', {
      workspaceId,
      count: promotions.length,
    });

    // Cập nhật status và emit event
    for (const promotion of promotions) {
      try {
        await this.promotionRepository.updateStatus(
          promotion.id,
          PROMOTION_STATUS.EXPIRED,
        );

        const event = new PromotionExpiredEvent(
          workspaceId,
          promotion.id,
          'USAGE_LIMIT_REACHED',
        );

        this.eventEmitter.emit('promotion.expired', event);

        this.logger.debug('Expired promotion by usage limit', {
          promotionId: promotion.id,
          promotionName: promotion.name,
          currentUsageCount: promotion.currentUsageCount,
          usageLimit: promotion.usageLimit,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error('Failed to expire promotion by usage limit', {
          promotionId: promotion.id,
          error: errorMessage,
        });
      }
    }

    return promotions.length;
  }
}
