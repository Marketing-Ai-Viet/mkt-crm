import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  CreateCouponInput,
  CreateBulkCouponsInput,
  GetCouponsByPromotionInput,
} from 'src/mkt-core/mkt-promotion/dto/inputs';
import {
  CouponOutput,
  PaginatedCouponsOutput,
  BulkCouponOutput,
  ApplyCouponOutput,
} from 'src/mkt-core/mkt-promotion/dto/outputs';
import { CouponApplicationService } from 'src/mkt-core/mkt-promotion/services/application/coupon-application.service';
import {
  COUPON_MESSAGES,
  PROMOTION_GRAPHQL_DESCRIPTIONS,
} from 'src/mkt-core/mkt-promotion/message';
import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';
import { MktCouponWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-coupon.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Coupon Resolver
 *
 * Xử lý các GraphQL queries và mutations cho coupon:
 * - Queries: Lấy coupon theo code, danh sách coupons theo promotion
 * - Mutations: Tạo coupon đơn lẻ, tạo bulk coupons, apply coupon, revoke coupon
 *
 * Business logic:
 * - Tạo coupon codes tự động hoặc custom
 * - Validate coupon trước khi apply
 * - Theo dõi usage count của coupon
 * - Quản lý coupon lifecycle (active, used, expired, disabled)
 */
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class CouponResolver {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly couponApplicationService: CouponApplicationService,
  ) {}

  // ==================== QUERIES ====================

  /**
   * Lấy coupon theo code
   */
  @Query(() => CouponOutput, {
    name: 'mktCouponByCode',
    nullable: true,
    description: 'Get coupon by code',
  })
  async mktCouponByCode(
    @AuthWorkspace() workspace: Workspace,
    @Args('code') code: string,
  ): Promise<CouponOutput | null> {
    this.logger.log(
      `${COUPON_MESSAGES.operation('FETCH_BY_ID')} - code: ${code}, workspace: ${workspace.id}`,
    );

    const coupon = await this.couponApplicationService.getCouponByCode(
      workspace.id,
      code,
    );

    if (!coupon) {
      this.logger.warn(
        `${COUPON_MESSAGES.error('COUPON_NOT_FOUND')} - code: ${code}`,
      );

      return null;
    }

    return this.mapToCouponOutput(coupon);
  }

  /**
   * Lấy danh sách coupons theo promotion ID
   */
  @Query(() => PaginatedCouponsOutput, {
    name: 'mktCouponsByPromotion',
    description: 'Get coupons by promotion ID',
  })
  async mktCouponsByPromotion(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: GetCouponsByPromotionInput,
  ): Promise<PaginatedCouponsOutput> {
    this.logger.log(
      `${COUPON_MESSAGES.operation('FETCH_ALL')} - promotionId: ${input.promotionId}, workspace: ${workspace.id}`,
    );

    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;

    const result = await this.couponApplicationService.getCouponsByPromotion(
      workspace.id,
      input.promotionId,
      { limit, offset },
    );

    return {
      items: result.items.map((c) => this.mapToCouponOutput(c)),
      total: result.total,
      limit,
      offset,
      hasMore: offset + limit < result.total,
    };
  }

  // ==================== MUTATIONS ====================

  /**
   * Tạo coupon đơn lẻ
   */
  @Mutation(() => CouponOutput, {
    name: 'mktCreateCoupon',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.CREATE_COUPON_MUTATION,
  })
  async mktCreateCoupon(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreateCouponInput,
  ): Promise<CouponOutput> {
    this.logger.log(
      `${COUPON_MESSAGES.operation('CREATE_COUPON')} - workspace: ${workspace.id}`,
    );

    const coupon = await this.couponApplicationService.createCoupon(
      workspace.id,
      {
        code: input.code,
        promotionId: input.promotionId,
        usageLimit: input.usageLimit ?? null,
        validFrom: input.validFrom ?? null,
        validTo: input.validTo ?? null,
        assignedCustomerId: input.assignedCustomerId ?? null,
      },
    );

    this.logger.log(
      `${COUPON_MESSAGES.success('COUPON_CREATED')} - code: ${coupon.code}`,
    );

    return this.mapToCouponOutput(coupon);
  }

  /**
   * Tạo nhiều coupons cùng lúc (bulk)
   */
  @Mutation(() => BulkCouponOutput, {
    name: 'mktCreateBulkCoupons',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.CREATE_BULK_COUPONS_MUTATION,
  })
  async mktCreateBulkCoupons(
    @AuthWorkspace() workspace: Workspace,
    @Args('input') input: CreateBulkCouponsInput,
  ): Promise<BulkCouponOutput> {
    this.logger.log(
      `${COUPON_MESSAGES.operation('CREATE_BULK_COUPONS')} - quantity: ${input.quantity}, workspace: ${workspace.id}`,
    );

    const coupons = await this.couponApplicationService.createBulkCoupons(
      workspace.id,
      {
        promotionId: input.promotionId,
        quantity: input.quantity,
        prefix: input.prefix ?? undefined,
        usageLimit: input.usageLimit ?? null,
        validFrom: input.validFrom ?? null,
        validTo: input.validTo ?? null,
      },
    );

    this.logger.log(
      `${COUPON_MESSAGES.success('BULK_COUPONS_CREATED')} - ${coupons.length} coupons created`,
    );

    return {
      coupons: coupons.map((c) => this.mapToCouponOutput(c)),
      totalCreated: coupons.length,
      message: `Successfully created ${coupons.length} coupons`,
    };
  }

  /**
   * Apply coupon cho customer
   * Validate coupon và trả về thông tin promotion
   */
  @Mutation(() => ApplyCouponOutput, {
    name: 'mktApplyCoupon',
    description: PROMOTION_GRAPHQL_DESCRIPTIONS.APPLY_COUPON_MUTATION,
  })
  async mktApplyCoupon(
    @AuthWorkspace() workspace: Workspace,
    @Args('code') code: string,
    @Args('customerId') customerId: string,
  ): Promise<ApplyCouponOutput> {
    this.logger.log(
      `${COUPON_MESSAGES.operation('APPLY_COUPON')} - code: ${code}, customer: ${customerId}, workspace: ${workspace.id}`,
    );

    const _result = await this.couponApplicationService.applyCoupon(
      workspace.id,
      code,
      customerId,
    );

    this.logger.log(
      `${COUPON_MESSAGES.success('COUPON_APPLIED')} - code: ${code}`,
    );

    return {
      success: true,
      promotion: null, // TODO: Map promotion when available
      discountAmount: null,
      errors: null,
    };
  }

  /**
   * Revoke (vô hiệu hóa) coupon
   */
  @Mutation(() => Boolean, {
    name: 'mktRevokeCoupon',
    description: 'Revoke/disable a coupon',
  })
  async mktRevokeCoupon(
    @AuthWorkspace() workspace: Workspace,
    @Args('code') code: string,
  ): Promise<boolean> {
    this.logger.log(
      `${COUPON_MESSAGES.operation('DISABLE_COUPON')} - code: ${code}, workspace: ${workspace.id}`,
    );

    await this.couponApplicationService.revokeCoupon(workspace.id, code);

    this.logger.log(
      `${COUPON_MESSAGES.success('COUPON_DISABLED')} - code: ${code}`,
    );

    return true;
  }

  // ==================== HELPERS ====================

  /**
   * Map workspace entity to GraphQL output
   */
  private mapToCouponOutput(coupon: MktCouponWorkspaceEntity): CouponOutput {
    return {
      id: coupon.id,
      code: coupon.code,
      status: coupon.status,
      usageLimit: coupon.usageLimit,
      currentUsageCount: coupon.currentUsageCount,
      validFrom: coupon.validFrom ?? null,
      validTo: coupon.validTo ?? null,
      assignedCustomerId: coupon.assignedCustomerId,
      promotionId: coupon.promotionId,
      metadata: coupon.metadata ?? null,
      createdAt: DateTimeUtils.toDateRequired(
        DateTimeUtils.fromISO(coupon.createdAt),
      ),
      updatedAt: DateTimeUtils.toDateRequired(
        DateTimeUtils.fromISO(coupon.updatedAt),
      ),
    };
  }
}
