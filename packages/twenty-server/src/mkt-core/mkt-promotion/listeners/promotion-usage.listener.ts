import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';

import { MktPromotionUsageRepository } from 'src/mkt-core/mkt-promotion/repositories/mkt-promotion-usage.repository';
import { MktPromotionRepository } from 'src/mkt-core/mkt-promotion/repositories/mkt-promotion.repository';
import { PromotionAppliedToOrderEvent } from 'src/mkt-core/mkt-promotion/events/promotion.events';
import {
  PROMOTION_LOG_CONTEXT,
  PROMOTION_STATUS,
} from 'src/mkt-core/mkt-promotion/constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * PromotionUsageListener - Xử lý events khi promotion được apply vào order
 *
 * Responsibilities:
 * - Record usage vào database
 * - Update promotion usage count
 * - Check usage limit và auto-pause promotion nếu đạt limit
 * - Emit events cho các hệ thống khác
 */
@Injectable()
export class PromotionUsageListener {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly usageRepository: MktPromotionUsageRepository,
    private readonly promotionRepository: MktPromotionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Xử lý khi promotion được apply vào order
   * - Ghi lại usage records
   * - Update promotion usage count
   * - Check usage limit và auto-pause nếu đạt limit
   */
  @OnEvent('promotion.applied.to.order')
  async handlePromotionApplied(event: PromotionAppliedToOrderEvent) {
    this.logger.log('Handling promotion.applied.to.order event', {
      workspaceId: event.workspaceId,
      orderId: event.orderId,
      totalDiscount: event.totalDiscount,
      promotionsCount: event.appliedPromotions.length,
    });

    try {
      const now = DateTimeUtils.now().toJSDate();

      // Xử lý từng promotion được apply
      for (const applied of event.appliedPromotions) {
        try {
          // Ghi lại usage record
          await this.usageRepository.createUsage({
            promotionId: applied.promotionId,
            couponId: applied.couponCode ? undefined : null,
            orderId: event.orderId,
            customerId: '', // TODO: Lấy từ order
            discountAmount: applied.discountAmount,
            originalAmount: applied.discountAmount, // TODO: Calculate original amount
            appliedAt: now,
            metadata: {
              promotionName: applied.promotionName,
              promotionCode: applied.promotionCode,
              discountType: applied.discountType,
              discountValue: applied.discountValue,
            },
          });

          // Increment usage count cho promotion
          await this.promotionRepository.incrementUsageCount(
            applied.promotionId,
          );

          // Lấy promotion data để check limit
          const promotion = await this.promotionRepository.findById(
            applied.promotionId,
          );

          if (!promotion) {
            this.logger.warn('Promotion not found for usage limit check', {
              promotionId: applied.promotionId,
            });
            continue;
          }

          // Check nếu promotion đạt usage limit thì auto-pause
          const currentUsageCount =
            ((promotion.currentUsageCount as number) ?? 0) + 1;
          const usageLimit = promotion.usageLimit as number | null;

          if (usageLimit && currentUsageCount >= usageLimit) {
            await this.promotionRepository.updateStatus(
              applied.promotionId,
              PROMOTION_STATUS.PAUSED,
            );

            // Emit promotion.expired event
            this.eventEmitter.emit('promotion.expired', {
              workspaceId: event.workspaceId,
              promotionId: applied.promotionId,
              reason: 'USAGE_LIMIT_REACHED',
            });

            this.logger.log('Promotion reached usage limit and auto-paused', {
              promotionId: applied.promotionId,
              currentUsageCount,
              usageLimit,
            });
          }

          this.logger.debug('Recorded promotion usage', {
            promotionId: applied.promotionId,
            orderId: event.orderId,
            discountAmount: applied.discountAmount,
          });
        } catch (error) {
          this.logger.error('Failed to record promotion usage', {
            promotionId: applied.promotionId,
            orderId: event.orderId,
            error,
          });
          // Continue với các promotions khác
        }
      }

      this.logger.log('Successfully handled promotion.applied.to.order event', {
        orderId: event.orderId,
        promotionsCount: event.appliedPromotions.length,
      });
    } catch (error) {
      this.logger.error('Failed to handle promotion.applied.to.order event', {
        orderId: event.orderId,
        error,
      });
    }
  }
}
