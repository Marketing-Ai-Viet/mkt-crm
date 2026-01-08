import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PromotionUsageApplicationService } from 'src/mkt-core/mkt-promotion/services/application/promotion-usage-application.service';
import { MktCouponRepository } from 'src/mkt-core/mkt-promotion/repositories/mkt-coupon.repository';
import { MktPromotionRepository } from 'src/mkt-core/mkt-promotion/repositories/mkt-promotion.repository';
import { PromotionNotificationService } from 'src/mkt-core/mkt-promotion/services/infrastructure/promotion-notification.service';
import {
  CouponCreatedEvent,
  CouponRedeemedEvent,
} from 'src/mkt-core/mkt-promotion/events/promotion.events';
import {
  PROMOTION_LOG_CONTEXT,
  COUPON_STATUS,
} from 'src/mkt-core/mkt-promotion/constants';

/**
 * CouponListener - Xử lý các events liên quan đến Coupon
 *
 * Responsibilities:
 * - Log coupon creation và usage
 * - Update usage stats khi coupon được sử dụng
 * - Check usage limits và auto-expire coupons
 * - Gửi thông báo
 */
@Injectable()
export class CouponListener {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly usageService: PromotionUsageApplicationService,
    private readonly couponRepository: MktCouponRepository,
    private readonly promotionRepository: MktPromotionRepository,
    private readonly notificationService: PromotionNotificationService,
  ) {}

  /**
   * Xử lý khi coupon được tạo
   * - Log coupon creation
   * - Validate coupon data
   */
  @OnEvent('coupon.created')
  async handleCouponCreated(event: CouponCreatedEvent) {
    this.logger.log('Handling coupon.created event', {
      workspaceId: event.workspaceId,
      couponId: event.couponId,
      couponCode: event.couponCode,
      promotionId: event.promotionId,
    });

    try {
      // Kiểm tra coupon có tồn tại không
      const coupon = await this.couponRepository.findById(
        event.workspaceId,
        event.couponId,
      );

      if (!coupon) {
        this.logger.warn('Coupon not found', {
          couponId: event.couponId,
        });

        return;
      }

      // Kiểm tra promotion có tồn tại không
      const promotion = await this.promotionRepository.findById(
        event.workspaceId,
        event.promotionId,
      );

      if (!promotion) {
        this.logger.warn('Promotion not found for coupon', {
          couponId: event.couponId,
          promotionId: event.promotionId,
        });

        return;
      }

      this.logger.log('Successfully handled coupon.created event', {
        couponId: event.couponId,
        promotionName: promotion.name,
      });
    } catch (error) {
      this.logger.error('Failed to handle coupon.created event', {
        couponId: event.couponId,
        error,
      });
    }
  }

  /**
   * Xử lý khi coupon được redeem/sử dụng
   * - Update usage stats
   * - Check coupon limits và auto-expire nếu đạt limit
   * - Check promotion limits
   * - Gửi thông báo
   */
  @OnEvent('coupon.redeemed')
  async handleCouponRedeemed(event: CouponRedeemedEvent) {
    this.logger.log('Handling coupon.redeemed event', {
      workspaceId: event.workspaceId,
      couponId: event.couponId,
      couponCode: event.couponCode,
      orderId: event.orderId,
      customerId: event.customerId,
      discountAmount: event.discountAmount,
    });

    try {
      // Increment coupon usage count
      await this.couponRepository.incrementUsageCount(
        event.workspaceId,
        event.couponId,
      );

      // Lấy coupon data để check limits
      const coupon = await this.couponRepository.findById(
        event.workspaceId,
        event.couponId,
      );

      if (!coupon) {
        this.logger.warn('Coupon not found for usage update', {
          couponId: event.couponId,
        });

        return;
      }

      // Check nếu coupon đạt usage limit thì auto-expire
      const currentUsageCount = (coupon.currentUsageCount as number) ?? 0;
      const usageLimit = coupon.usageLimit as number | null;

      if (usageLimit && currentUsageCount >= usageLimit) {
        await this.couponRepository.updateStatus(
          event.workspaceId,
          event.couponId,
          COUPON_STATUS.USED,
        );

        this.logger.log('Coupon reached usage limit and marked as USED', {
          couponId: event.couponId,
          currentUsageCount,
          usageLimit,
        });
      }

      // Lấy promotion data để gửi thông báo
      const promotionId = coupon.promotionId as string;
      const promotion = await this.promotionRepository.findById(
        event.workspaceId,
        promotionId,
      );

      if (promotion) {
        // Gửi thông báo
        await this.notificationService.notifyCouponRedeemed(
          event.workspaceId,
          event.couponCode,
          event.customerId,
          promotion.name as string,
        );
      }

      this.logger.log('Successfully handled coupon.redeemed event', {
        couponId: event.couponId,
        newUsageCount: currentUsageCount + 1,
      });
    } catch (error) {
      this.logger.error('Failed to handle coupon.redeemed event', {
        couponId: event.couponId,
        error,
      });
    }
  }

  /**
   * Xử lý khi coupon expired
   * - Update coupon status
   * - Gửi thông báo (nếu cần)
   */
  @OnEvent('coupon.expired')
  async handleCouponExpired(payload: {
    workspaceId: string;
    couponId: string;
    couponCode: string;
  }) {
    this.logger.log('Handling coupon.expired event', {
      workspaceId: payload.workspaceId,
      couponId: payload.couponId,
      couponCode: payload.couponCode,
    });

    try {
      // Update coupon status
      await this.couponRepository.updateStatus(
        payload.workspaceId,
        payload.couponId,
        COUPON_STATUS.EXPIRED,
      );

      this.logger.log('Successfully handled coupon.expired event', {
        couponId: payload.couponId,
      });
    } catch (error) {
      this.logger.error('Failed to handle coupon.expired event', {
        couponId: payload.couponId,
        error,
      });
    }
  }
}
