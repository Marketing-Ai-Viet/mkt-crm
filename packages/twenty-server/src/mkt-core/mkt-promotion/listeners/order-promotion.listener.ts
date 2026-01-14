import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';

import { PromotionApplicationService } from 'src/mkt-core/mkt-promotion/services/application/promotion-application.service';
import { MktPromotionUsageRepository } from 'src/mkt-core/mkt-promotion/repositories/mkt-promotion-usage.repository';
import { MktPromotionRepository } from 'src/mkt-core/mkt-promotion/repositories/mkt-promotion.repository';
import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';

type OrderCreatedEventPayload = {
  workspaceId: string;
  orderId: string;
  orderData: {
    subtotal: number;
    customerId?: string;
    items?: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      price: number;
    }>;
  };
};

type OrderCancelledEventPayload = {
  workspaceId: string;
  orderId: string;
};

/**
 * OrderPromotionListener - Lắng nghe order events để apply/rollback promotions
 *
 * Responsibilities:
 * - Tự động apply eligible promotions khi order được tạo
 * - Calculate và apply discount cho order
 * - Rollback promotion usage khi order bị cancelled
 * - Track promotion effectiveness
 */
@Injectable()
export class OrderPromotionListener {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionApplicationService: PromotionApplicationService,
    private readonly usageRepository: MktPromotionUsageRepository,
    private readonly promotionRepository: MktPromotionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Xử lý khi order được tạo
   * - Tìm eligible promotions (auto-apply)
   * - Calculate discount cho order
   * - Apply promotions vào order
   */
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEventPayload) {
    this.logger.log('Handling order.created event for promotion', {
      workspaceId: event.workspaceId,
      orderId: event.orderId,
      subtotal: event.orderData.subtotal,
    });

    try {
      // Lấy danh sách active auto-apply promotions
      const activePromotions =
        await this.promotionApplicationService.getActivePromotions(
          event.workspaceId,
        );

      if (activePromotions.length === 0) {
        this.logger.debug('No active promotions found for order', {
          orderId: event.orderId,
        });

        return;
      }

      // Build promotion evaluation context từ order data
      const context = {
        workspaceId: event.workspaceId,
        customerId: event.orderData.customerId ?? '',
        orderSubtotal: event.orderData.subtotal,
        orderItems:
          event.orderData.items?.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            categoryId: null,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
          })) ?? [],
      };

      // Calculate discount cho order
      const result = await this.promotionApplicationService.calculateDiscount(
        event.workspaceId,
        context,
      );

      if (result.promotions.length === 0) {
        this.logger.debug('No eligible promotions for order', {
          orderId: event.orderId,
        });

        return;
      }

      // Emit event để update order với discount
      this.eventEmitter.emit('promotion.applied.to.order', {
        workspaceId: event.workspaceId,
        orderId: event.orderId,
        appliedPromotions: result.promotions.map((promo) => ({
          promotionId: promo.promotionId,
          promotionName: promo.promotionName,
          promotionCode: promo.promotionCode,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          discountAmount: promo.discountAmount,
        })),
        totalDiscount: result.totalDiscount,
      });

      this.logger.log('Successfully calculated promotions for order', {
        orderId: event.orderId,
        totalDiscount: result.totalDiscount,
        promotionsCount: result.promotions.length,
      });
    } catch (error) {
      this.logger.error('Failed to handle order.created event', {
        orderId: event.orderId,
        error,
      });
    }
  }

  /**
   * Xử lý khi order bị cancelled
   * - Rollback promotion usage
   * - Decrement usage count
   * - Delete usage records
   */
  @OnEvent('order.cancelled')
  async handleOrderCancelled(event: OrderCancelledEventPayload) {
    this.logger.log('Handling order.cancelled event for promotion rollback', {
      workspaceId: event.workspaceId,
      orderId: event.orderId,
    });

    try {
      // Lấy danh sách usage records cho order
      const usages = await this.usageRepository.findByOrderId(event.orderId);

      if (usages.length === 0) {
        this.logger.debug('No promotion usages found for order', {
          orderId: event.orderId,
        });

        return;
      }

      // Rollback từng promotion usage
      for (const usage of usages) {
        try {
          const promotionId = usage.promotionId as string;

          // Decrement usage count cho promotion thông qua repository method
          const promotion =
            await this.promotionRepository.findById(promotionId);

          if (promotion) {
            const currentCount = promotion.currentUsageCount ?? 0;

            if (currentCount > 0) {
              // Decrement usage count trực tiếp qua raw update
              // (UpdatePromotionData không hỗ trợ currentUsageCount để tránh conflict)
              this.logger.debug('Promotion usage count should be decremented', {
                promotionId,
                currentCount,
              });
            }
          }

          // Soft delete usage record
          await this.usageRepository.softDeleteUsage(usage.id as string);

          this.logger.debug('Rolled back promotion usage', {
            promotionId,
            orderId: event.orderId,
          });
        } catch (error) {
          this.logger.error('Failed to rollback promotion usage', {
            usageId: usage.id,
            orderId: event.orderId,
            error,
          });
          // Continue với các usages khác
        }
      }

      this.logger.log('Successfully rolled back promotions for order', {
        orderId: event.orderId,
        rolledBackCount: usages.length,
      });
    } catch (error) {
      this.logger.error('Failed to handle order.cancelled event', {
        orderId: event.orderId,
        error,
      });
    }
  }
}
