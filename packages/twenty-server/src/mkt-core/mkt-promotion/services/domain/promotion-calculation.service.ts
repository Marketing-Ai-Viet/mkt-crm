import { Injectable, Logger } from '@nestjs/common';

import Big from 'big.js';

import {
  MoneyUtils,
  MONEY_DECIMAL_PLACES,
} from 'src/mkt-core/utils/money.utils';
import {
  PromotionEvaluationContext,
  AppliedPromotionsResult,
  AppliedPromotion,
  OrderItemForPromotion,
} from 'src/mkt-core/mkt-promotion/types';
import {
  PROMOTION_LOG_CONTEXT,
  PROMOTION_TYPE,
} from 'src/mkt-core/mkt-promotion/constants';
import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities';

/**
 * Service tính toán discount cho promotions
 * Xử lý các loại discount: PERCENTAGE, FIXED_AMOUNT, BUY_X_GET_Y, FREE_SHIPPING
 */
@Injectable()
export class PromotionCalculationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  /**
   * Tính tổng discount cho order từ tất cả promotions applicable
   */
  async calculateOrderDiscount(
    promotions: MktPromotionWorkspaceEntity[],
    context: PromotionEvaluationContext,
  ): Promise<AppliedPromotionsResult> {
    if (promotions.length === 0) {
      return {
        promotions: [],
        totalDiscount: 0,
        finalOrderAmount: context.orderSubtotal,
      };
    }

    // Sort promotions by priority (highest first)
    const sortedPromotions = this.sortByPriority(promotions);

    // Apply promotions (respect stackable flag)
    const appliedPromotions: AppliedPromotion[] = [];
    let remainingAmount = MoneyUtils.from(context.orderSubtotal);

    for (const promotion of sortedPromotions) {
      // Non-stackable promotions cannot be combined with others
      if (!promotion.stackable && appliedPromotions.length > 0) {
        continue;
      }

      const discountAmount = this.calculatePromotionDiscount(
        promotion,
        context,
        remainingAmount,
      );

      if (MoneyUtils.isPositive(discountAmount)) {
        appliedPromotions.push({
          promotionId: promotion.id,
          promotionName: promotion.name,
          promotionCode: promotion.code,
          couponCode: context.couponCode ?? null,
          discountType:
            promotion.promotionType as (typeof PROMOTION_TYPE)[keyof typeof PROMOTION_TYPE],
          discountValue: promotion.discountValue,
          discountAmount: MoneyUtils.round(discountAmount).toNumber(),
        });

        // Update remaining amount for next promotion
        remainingAmount = MoneyUtils.subtract(remainingAmount, discountAmount);

        // If promotion is not stackable, stop after first application
        if (!promotion.stackable) {
          break;
        }
      }
    }

    // Calculate total discount
    const totalDiscount = MoneyUtils.sumBy(appliedPromotions, 'discountAmount');

    return {
      promotions: appliedPromotions,
      totalDiscount: MoneyUtils.round(totalDiscount).toNumber(),
      finalOrderAmount: MoneyUtils.round(
        MoneyUtils.subtract(context.orderSubtotal, totalDiscount),
      ).toNumber(),
    };
  }

  /**
   * Tính discount cho một promotion cụ thể
   */
  calculatePromotionDiscount(
    promotion: MktPromotionWorkspaceEntity,
    context: PromotionEvaluationContext,
    baseAmount: Big,
  ): Big {
    let discount = MoneyUtils.zero();

    switch (promotion.promotionType) {
      case PROMOTION_TYPE.PERCENTAGE: {
        discount = this.applyPercentageDiscount(
          baseAmount,
          promotion.discountValue,
          promotion.maxDiscountAmount,
        );
        break;
      }

      case PROMOTION_TYPE.FIXED_AMOUNT: {
        discount = this.applyFixedAmountDiscount(
          baseAmount,
          promotion.discountValue,
        );
        break;
      }

      case PROMOTION_TYPE.BUY_X_GET_Y: {
        discount = this.calculateBuyXGetYDiscount(promotion, context);
        break;
      }

      case PROMOTION_TYPE.FREE_SHIPPING: {
        // Free shipping discount is handled separately in shipping calculation
        // Return 0 here as it doesn't affect order subtotal
        discount = MoneyUtils.zero();
        break;
      }

      default: {
        this.logger.warn(
          `Unknown promotion type: ${promotion.promotionType} for promotion ${promotion.id}`,
        );
        discount = MoneyUtils.zero();
      }
    }

    // Ensure discount is non-negative and rounded
    return MoneyUtils.max(
      MoneyUtils.zero(),
      MoneyUtils.round(discount, MONEY_DECIMAL_PLACES.CURRENCY),
    );
  }

  /**
   * Áp dụng percentage discount với max cap
   */
  private applyPercentageDiscount(
    baseAmount: Big,
    discountPercent: number,
    maxDiscountAmount: number | null,
  ): Big {
    if (discountPercent <= 0 || discountPercent > 100) {
      return MoneyUtils.zero();
    }

    // Calculate percentage discount
    const discount = MoneyUtils.applyDiscount(baseAmount, discountPercent);

    // Apply max discount cap if specified
    if (maxDiscountAmount !== null && maxDiscountAmount > 0) {
      return MoneyUtils.min(discount, MoneyUtils.from(maxDiscountAmount));
    }

    return discount;
  }

  /**
   * Áp dụng fixed amount discount
   */
  private applyFixedAmountDiscount(
    baseAmount: Big,
    discountAmount: number,
  ): Big {
    if (discountAmount <= 0) {
      return MoneyUtils.zero();
    }

    // Discount cannot exceed base amount
    return MoneyUtils.min(MoneyUtils.from(discountAmount), baseAmount);
  }

  /**
   * Tính discount cho Buy X Get Y promotion
   * Config được lưu trong promotion.metadata
   */
  private calculateBuyXGetYDiscount(
    promotion: MktPromotionWorkspaceEntity,
    context: PromotionEvaluationContext,
  ): Big {
    if (!promotion.metadata) {
      this.logger.warn(
        `BUY_X_GET_Y promotion ${promotion.id} missing metadata config`,
      );

      return MoneyUtils.zero();
    }

    const config = promotion.metadata as {
      buyQuantity?: number;
      getQuantity?: number;
      buyProductIds?: string[];
      getProductIds?: string[];
      discountPercent?: number;
      maxApplications?: number | null;
    };

    // Validate config
    if (
      !config.buyQuantity ||
      !config.getQuantity ||
      !config.buyProductIds ||
      !config.getProductIds
    ) {
      this.logger.warn(
        `BUY_X_GET_Y promotion ${promotion.id} has invalid config`,
      );

      return MoneyUtils.zero();
    }

    // Find buy items in order
    const buyProductIds = config.buyProductIds;
    const buyItems = context.orderItems.filter((item) =>
      buyProductIds.includes(item.productId),
    );

    // Find get items in order
    const getProductIds = config.getProductIds;
    const getItems = context.orderItems.filter((item) =>
      getProductIds.includes(item.productId),
    );

    if (buyItems.length === 0 || getItems.length === 0) {
      return MoneyUtils.zero();
    }

    // Calculate total buy quantity
    const totalBuyQuantity = buyItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    // Calculate how many times the promotion can be applied
    const possibleApplications = Math.floor(
      totalBuyQuantity / config.buyQuantity,
    );

    if (possibleApplications === 0) {
      return MoneyUtils.zero();
    }

    // Apply max applications limit if specified
    const actualApplications =
      config.maxApplications !== null && config.maxApplications !== undefined
        ? Math.min(possibleApplications, config.maxApplications)
        : possibleApplications;

    // Calculate discount on get items
    const getQuantityToDiscount = actualApplications * config.getQuantity;
    const discountPercent = config.discountPercent ?? 100; // Default 100% (free)

    // Calculate total price of get items to discount
    const getItemsPrice = this.calculateItemsPrice(
      getItems,
      getQuantityToDiscount,
    );

    // Apply discount percent
    return MoneyUtils.applyDiscount(getItemsPrice, discountPercent);
  }

  /**
   * Tính tổng giá của items với quantity limit
   */
  private calculateItemsPrice(
    items: OrderItemForPromotion[],
    maxQuantity: number,
  ): Big {
    let totalPrice = MoneyUtils.zero();
    let remainingQuantity = maxQuantity;

    for (const item of items) {
      if (remainingQuantity <= 0) {
        break;
      }

      const quantityToUse = Math.min(item.quantity, remainingQuantity);
      const itemPrice = MoneyUtils.multiply(item.unitPrice, quantityToUse);

      totalPrice = MoneyUtils.add(totalPrice, itemPrice);
      remainingQuantity -= quantityToUse;
    }

    return totalPrice;
  }

  /**
   * Sắp xếp promotions theo priority (cao nhất trước)
   */
  private sortByPriority(
    promotions: MktPromotionWorkspaceEntity[],
  ): MktPromotionWorkspaceEntity[] {
    return [...promotions].sort((a, b) => b.priority - a.priority);
  }
}
