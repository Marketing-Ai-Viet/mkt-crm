import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PromotionCacheService } from 'src/mkt-core/mkt-promotion/services/infrastructure/promotion-cache.service';
import { PromotionNotificationService } from 'src/mkt-core/mkt-promotion/services/infrastructure/promotion-notification.service';
import { MktPromotionRepository } from 'src/mkt-core/mkt-promotion/repositories/mkt-promotion.repository';
import {
  PromotionCreatedEvent,
  PromotionActivatedEvent,
  PromotionPausedEvent,
  PromotionExpiredEvent,
  PromotionCancelledEvent,
} from 'src/mkt-core/mkt-promotion/events/promotion.events';
import {
  PROMOTION_LOG_CONTEXT,
  PROMOTION_STATUS,
} from 'src/mkt-core/mkt-promotion/constants';

/**
 * PromotionListener - Xử lý các events liên quan đến Promotion lifecycle
 *
 * Responsibilities:
 * - Log promotion lifecycle events
 * - Warm up và invalidate cache
 * - Gửi thông báo khi promotion thay đổi trạng thái
 * - Auto-pause promotion khi hết hạn hoặc đạt usage limit
 */
@Injectable()
export class PromotionListener implements OnModuleInit {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly cacheService: PromotionCacheService,
    private readonly notificationService: PromotionNotificationService,
    private readonly promotionRepository: MktPromotionRepository,
  ) {}

  onModuleInit() {
    this.logger.log('PromotionListener initialized');
  }

  /**
   * Xử lý khi promotion được tạo mới
   * - Log creation
   * - Warm up cache nếu promotion active
   * - Gửi thông báo
   */
  @OnEvent('promotion.created')
  async handlePromotionCreated(event: PromotionCreatedEvent) {
    this.logger.log('Handling promotion.created event', {
      workspaceId: event.workspaceId,
      promotionId: event.promotionId,
      promotionCode: event.promotionCode,
      createdBy: event.createdBy,
    });

    try {
      // Lấy promotion data để warm up cache
      const promotion = await this.promotionRepository.findById(
        event.workspaceId,
        event.promotionId,
      );

      if (!promotion) {
        this.logger.warn('Promotion not found for warming cache', {
          promotionId: event.promotionId,
        });

        return;
      }

      // Warm up cache nếu promotion active
      const status = promotion.status as string;

      if (status === PROMOTION_STATUS.ACTIVE) {
        await this.cacheService.setPromotion(event.workspaceId, promotion);
        await this.cacheService.invalidateActivePromotions(event.workspaceId);

        this.logger.debug('Warmed up cache for new active promotion', {
          promotionId: event.promotionId,
        });
      }

      // Gửi thông báo
      await this.notificationService.notifyPromotionCreated(
        event.workspaceId,
        event.promotionId,
        promotion.name as string,
      );

      this.logger.log('Successfully handled promotion.created event', {
        promotionId: event.promotionId,
      });
    } catch (error) {
      this.logger.error('Failed to handle promotion.created event', {
        promotionId: event.promotionId,
        error,
      });
    }
  }

  /**
   * Xử lý khi promotion được activated
   * - Invalidate cache cũ
   * - Add vào cache active promotions
   * - Gửi thông báo activation
   */
  @OnEvent('promotion.activated')
  async handlePromotionActivated(event: PromotionActivatedEvent) {
    this.logger.log('Handling promotion.activated event', {
      workspaceId: event.workspaceId,
      promotionId: event.promotionId,
      activatedBy: event.activatedBy,
    });

    try {
      // Invalidate cache
      await this.cacheService.invalidatePromotion(
        event.workspaceId,
        event.promotionId,
      );
      await this.cacheService.invalidateActivePromotions(event.workspaceId);

      // Lấy promotion để thêm vào cache
      const promotion = await this.promotionRepository.findById(
        event.workspaceId,
        event.promotionId,
      );

      if (!promotion) {
        this.logger.warn('Promotion not found for caching', {
          promotionId: event.promotionId,
        });

        return;
      }

      // Add vào cache
      await this.cacheService.setPromotion(event.workspaceId, promotion);

      if (promotion.code) {
        await this.cacheService.setPromotionByCode(
          event.workspaceId,
          promotion.code as string,
          promotion,
        );
      }

      // Gửi thông báo
      await this.notificationService.notifyPromotionActivated(
        event.workspaceId,
        event.promotionId,
        promotion.name as string,
      );

      this.logger.log('Successfully handled promotion.activated event', {
        promotionId: event.promotionId,
      });
    } catch (error) {
      this.logger.error('Failed to handle promotion.activated event', {
        promotionId: event.promotionId,
        error,
      });
    }
  }

  /**
   * Xử lý khi promotion bị paused
   * - Remove khỏi cache
   * - Invalidate active promotions cache
   */
  @OnEvent('promotion.paused')
  async handlePromotionPaused(event: PromotionPausedEvent) {
    this.logger.log('Handling promotion.paused event', {
      workspaceId: event.workspaceId,
      promotionId: event.promotionId,
      pausedBy: event.pausedBy,
    });

    try {
      // Invalidate cache
      await this.cacheService.invalidatePromotion(
        event.workspaceId,
        event.promotionId,
      );
      await this.cacheService.invalidateActivePromotions(event.workspaceId);

      this.logger.log('Successfully handled promotion.paused event', {
        promotionId: event.promotionId,
      });
    } catch (error) {
      this.logger.error('Failed to handle promotion.paused event', {
        promotionId: event.promotionId,
        error,
      });
    }
  }

  /**
   * Xử lý khi promotion expired
   * - Remove khỏi cache
   * - Clean up related data
   * - Gửi thông báo cho admins
   */
  @OnEvent('promotion.expired')
  async handlePromotionExpired(event: PromotionExpiredEvent) {
    this.logger.log('Handling promotion.expired event', {
      workspaceId: event.workspaceId,
      promotionId: event.promotionId,
      reason: event.reason,
    });

    try {
      // Invalidate cache
      await this.cacheService.invalidatePromotion(
        event.workspaceId,
        event.promotionId,
      );
      await this.cacheService.invalidateActivePromotions(event.workspaceId);

      // Lấy promotion data để gửi thông báo
      const promotion = await this.promotionRepository.findById(
        event.workspaceId,
        event.promotionId,
      );

      if (promotion) {
        // Gửi thông báo cho admins
        await this.notificationService.notifyPromotionExpired(
          event.workspaceId,
          event.promotionId,
          promotion.name as string,
        );
      }

      this.logger.log('Successfully handled promotion.expired event', {
        promotionId: event.promotionId,
        reason: event.reason,
      });
    } catch (error) {
      this.logger.error('Failed to handle promotion.expired event', {
        promotionId: event.promotionId,
        error,
      });
    }
  }

  /**
   * Xử lý khi promotion bị cancelled
   * - Remove khỏi cache
   * - Invalidate active promotions
   */
  @OnEvent('promotion.cancelled')
  async handlePromotionCancelled(event: PromotionCancelledEvent) {
    this.logger.log('Handling promotion.cancelled event', {
      workspaceId: event.workspaceId,
      promotionId: event.promotionId,
      cancelledBy: event.cancelledBy,
    });

    try {
      // Invalidate cache
      await this.cacheService.invalidatePromotion(
        event.workspaceId,
        event.promotionId,
      );
      await this.cacheService.invalidateActivePromotions(event.workspaceId);

      this.logger.log('Successfully handled promotion.cancelled event', {
        promotionId: event.promotionId,
      });
    } catch (error) {
      this.logger.error('Failed to handle promotion.cancelled event', {
        promotionId: event.promotionId,
        error,
      });
    }
  }
}
