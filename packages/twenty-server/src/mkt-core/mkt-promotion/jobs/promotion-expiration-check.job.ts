import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion.workspace-entity';
import { PROMOTION_STATUS } from 'src/mkt-core/mkt-promotion/constants/mkt-promotion.constants';
import { PromotionExpiredEvent } from 'src/mkt-core/mkt-promotion/events/promotion.events';
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
 */
@Injectable()
@Processor(MessageQueue.cronQueue)
export class PromotionExpirationCheckJob {
  private readonly logger = new Logger(PromotionExpirationCheckJob.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('PromotionExpirationCheckJob initialized');
  }

  @Process(PromotionExpirationCheckJob.name)
  async handle(data: PromotionExpirationCheckJobData): Promise<void> {
    const { workspaceId } = data;

    this.logger.log(
      `Starting promotion expiration check for workspace ${workspaceId}`,
    );

    try {
      const expiredCount =
        await this.checkAndExpirePromotionsForWorkspace(workspaceId);

      this.logger.log(
        `Promotion expiration check completed: ${expiredCount} promotions expired for workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Promotion expiration check failed for workspace ${workspaceId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Kiểm tra và cập nhật promotions hết hạn cho một workspace
   */
  private async checkAndExpirePromotionsForWorkspace(
    workspaceId: string,
  ): Promise<number> {
    const promotionRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPromotionWorkspaceEntity>(
        workspaceId,
        'mktPromotion',
        { shouldBypassPermissionChecks: true },
      );

    const now = DateTimeUtils.now();
    const currentDateString = DateTimeUtils.toISO(now);

    // Tìm các promotion có endDate < NOW() và status = ACTIVE
    const expiredPromotions = await promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PROMOTION_STATUS.ACTIVE })
      .andWhere('promotion.endDate IS NOT NULL')
      .andWhere('promotion.endDate < :currentDate', {
        currentDate: currentDateString,
      })
      .andWhere('promotion.deletedAt IS NULL')
      .getMany();

    if (expiredPromotions.length === 0) {
      this.logger.debug(
        `No expired promotions found for workspace ${workspaceId}`,
      );

      return 0;
    }

    this.logger.log(
      `Found ${expiredPromotions.length} expired promotions for workspace ${workspaceId}`,
    );

    // Cập nhật status thành EXPIRED và emit event
    for (const promotion of expiredPromotions) {
      try {
        await promotionRepository.update(promotion.id, {
          status: PROMOTION_STATUS.EXPIRED,
        });

        // Emit event
        const event = new PromotionExpiredEvent(
          workspaceId,
          promotion.id,
          'DATE_EXPIRED',
        );

        this.eventEmitter.emit('promotion.expired', event);

        this.logger.debug(
          `Expired promotion ${promotion.id} (${promotion.name}) - End date: ${promotion.endDate}`,
        );
      } catch (error) {
        this.logger.error(`Failed to expire promotion ${promotion.id}`, error);
      }
    }

    return expiredPromotions.length;
  }

  /**
   * Kiểm tra và cập nhật promotions đạt usage limit
   */
  async checkAndExpirePromotionsByUsageLimit(
    workspaceId: string,
  ): Promise<number> {
    const promotionRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPromotionWorkspaceEntity>(
        workspaceId,
        'mktPromotion',
        { shouldBypassPermissionChecks: true },
      );

    // Tìm các promotion có currentUsageCount >= usageLimit và status = ACTIVE
    const promotions = await promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PROMOTION_STATUS.ACTIVE })
      .andWhere('promotion.usageLimit IS NOT NULL')
      .andWhere('promotion.currentUsageCount >= promotion.usageLimit')
      .andWhere('promotion.deletedAt IS NULL')
      .getMany();

    if (promotions.length === 0) {
      return 0;
    }

    this.logger.log(
      `Found ${promotions.length} promotions reached usage limit for workspace ${workspaceId}`,
    );

    // Cập nhật status và emit event
    for (const promotion of promotions) {
      try {
        await promotionRepository.update(promotion.id, {
          status: PROMOTION_STATUS.EXPIRED,
        });

        const event = new PromotionExpiredEvent(
          workspaceId,
          promotion.id,
          'USAGE_LIMIT_REACHED',
        );

        this.eventEmitter.emit('promotion.expired', event);

        this.logger.debug(
          `Expired promotion ${promotion.id} (${promotion.name}) - Usage limit reached: ${promotion.currentUsageCount}/${promotion.usageLimit}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to expire promotion by usage limit ${promotion.id}`,
          error,
        );
      }
    }

    return promotions.length;
  }
}
