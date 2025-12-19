import { Injectable, Logger } from '@nestjs/common';

import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';

/**
 * PromotionNotificationService - Service gửi thông báo cho promotions
 * Stub implementation - sẽ được implement sau khi có notification system
 */
@Injectable()
export class PromotionNotificationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  /**
   * Gửi thông báo khi promotion được tạo
   */
  async notifyPromotionCreated(
    workspaceId: string,
    promotionId: string,
    promotionName: string,
  ): Promise<void> {
    this.logger.log('Promotion created notification', {
      workspaceId,
      promotionId,
      promotionName,
    });
    // TODO: Implement notification logic
  }

  /**
   * Gửi thông báo khi promotion được activated
   */
  async notifyPromotionActivated(
    workspaceId: string,
    promotionId: string,
    promotionName: string,
  ): Promise<void> {
    this.logger.log('Promotion activated notification', {
      workspaceId,
      promotionId,
      promotionName,
    });
    // TODO: Implement notification logic
  }

  /**
   * Gửi thông báo khi promotion sắp expired
   */
  async notifyPromotionExpiring(
    workspaceId: string,
    promotionId: string,
    promotionName: string,
    expiresAt: Date,
  ): Promise<void> {
    this.logger.log('Promotion expiring notification', {
      workspaceId,
      promotionId,
      promotionName,
      expiresAt,
    });
    // TODO: Implement notification logic
  }

  /**
   * Gửi thông báo khi promotion expired
   */
  async notifyPromotionExpired(
    workspaceId: string,
    promotionId: string,
    promotionName: string,
  ): Promise<void> {
    this.logger.log('Promotion expired notification', {
      workspaceId,
      promotionId,
      promotionName,
    });
    // TODO: Implement notification logic
  }

  /**
   * Gửi thông báo khi coupon được sử dụng
   */
  async notifyCouponRedeemed(
    workspaceId: string,
    couponCode: string,
    customerId: string,
    promotionName: string,
  ): Promise<void> {
    this.logger.log('Coupon redeemed notification', {
      workspaceId,
      couponCode,
      customerId,
      promotionName,
    });
    // TODO: Implement notification logic
  }
}
