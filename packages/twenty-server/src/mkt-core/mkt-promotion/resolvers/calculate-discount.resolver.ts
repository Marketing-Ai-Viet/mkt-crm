import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { CalculateDiscountInput } from 'src/mkt-core/mkt-promotion/dto/inputs';
import { CalculateDiscountOutput } from 'src/mkt-core/mkt-promotion/dto/outputs';
import { PromotionApplicationService } from 'src/mkt-core/mkt-promotion/services/application/promotion-application.service';
import {
  PROMOTION_MESSAGES,
  PROMOTION_GRAPHQL_DESCRIPTIONS,
} from 'src/mkt-core/mkt-promotion/message';
import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';

/**
 * Calculate Discount Resolver
 *
 * Xử lý tính toán discount cho order:
 * - Tính toán discount từ auto-apply promotions
 * - Áp dụng coupon code nếu có
 * - Xử lý stacking promotions theo priority
 * - Validate promotion rules với order items
 *
 * Business logic:
 * - Auto-apply active promotions theo order context
 * - Validate coupon và promotion rules
 * - Tính toán discount amount với max discount cap
 * - Return danh sách applied promotions và final amount
 */
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class CalculateDiscountResolver {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly promotionApplicationService: PromotionApplicationService,
  ) {}

  /**
   * Tính toán discount cho order
   *
   * Flow:
   * 1. Validate input order data
   * 2. Lấy active promotions (auto-apply + coupon)
   * 3. Evaluate promotion rules với order context
   * 4. Tính discount amount cho từng promotion
   * 5. Handle stacking theo priority
   * 6. Return final discount breakdown
   */
  @Query(() => CalculateDiscountOutput, {
    name: 'mktCalculateOrderDiscount',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.CALCULATE_DISCOUNT_QUERY,
  })
  async mktCalculateOrderDiscount(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CalculateDiscountInput,
  ): Promise<CalculateDiscountOutput> {
    this.logger.log(
      `${PROMOTION_MESSAGES.operation('CALCULATE_DISCOUNT')} - customer: ${input.customerId}, subtotal: ${input.orderSubtotal}, workspace: ${workspace.id}`,
    );

    const result = await this.promotionApplicationService.calculateDiscount(
      workspace.id,
      {
        workspaceId: workspace.id,
        customerId: input.customerId,
        orderItems: input.orderItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? null,
          categoryId: item.categoryId ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        orderSubtotal: input.orderSubtotal,
        couponCode: input.couponCode ?? null,
        customerTags: input.customerTags ?? [],
        isFirstOrder: input.isFirstOrder ?? false,
      },
    );

    this.logger.log(
      `${PROMOTION_MESSAGES.operation('CALCULATE_DISCOUNT')} completed - total discount: ${result.totalDiscount}, applied: ${result.promotions.length} promotions`,
    );

    return {
      promotions: result.promotions.map((promo) => ({
        promotionId: promo.promotionId,
        promotionName: promo.promotionName,
        promotionCode: promo.promotionCode,
        couponCode: promo.couponCode ?? null,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount: promo.discountAmount,
      })),
      totalDiscount: result.totalDiscount,
      finalOrderAmount: result.finalOrderAmount,
    };
  }
}
