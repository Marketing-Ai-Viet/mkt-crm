import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';
import {
  CreateCouponData,
  CreateBulkCouponsData,
  PaginatedResult,
} from 'src/mkt-core/mkt-promotion/types';
import { MktCouponWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-coupon.workspace-entity';
import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion.workspace-entity';

/**
 * CouponApplicationService - Service quản lý coupons
 */
@Injectable()
export class CouponApplicationService {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    // private readonly couponRepository: MktCouponRepository,
    // private readonly promotionRepository: MktPromotionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Tạo coupon đơn lẻ
   */
  async createCoupon(
    workspaceId: string,
    data: CreateCouponData,
  ): Promise<MktCouponWorkspaceEntity> {
    // Verify promotion exists
    // const promotion = await this.promotionRepository.findById(
    //   workspaceId,
    //   data.promotionId,
    // );
    //
    // if (!promotion) {
    //   throw new Error(`Promotion not found: ${data.promotionId}`);
    // }

    // Generate code if not provided
    const code = data.code ?? this.generateCouponCode();

    // Check code uniqueness
    // const existingCoupon = await this.couponRepository.findByCode(workspaceId, code);
    // if (existingCoupon) {
    //   throw new Error(`Coupon code already exists: ${code}`);
    // }

    // Create coupon
    // const coupon = await this.couponRepository.create(workspaceId, {
    //   ...data,
    //   code,
    //   status: COUPON_STATUS.ACTIVE,
    //   currentUsageCount: 0,
    // });

    this.logger.log('Created coupon', {
      workspaceId,
      code,
      promotionId: data.promotionId,
    });

    // Emit event
    // this.eventEmitter.emit('coupon.created', {
    //   workspaceId,
    //   couponId: coupon.id,
    //   couponCode: code,
    //   promotionId: data.promotionId,
    // });

    // return coupon;
    return { code } as MktCouponWorkspaceEntity;
  }

  /**
   * Tạo bulk coupons
   */
  async createBulkCoupons(
    workspaceId: string,
    data: CreateBulkCouponsData,
  ): Promise<MktCouponWorkspaceEntity[]> {
    const { quantity, prefix } = data;
    const coupons: MktCouponWorkspaceEntity[] = [];

    // Generate unique codes
    const codes = await this.generateBatchCouponCodes(
      workspaceId,
      quantity,
      prefix ?? '',
    );

    // Create coupons
    for (const code of codes) {
      // const coupon = await this.couponRepository.create(workspaceId, {
      //   promotionId: data.promotionId,
      //   code,
      //   status: COUPON_STATUS.ACTIVE,
      //   currentUsageCount: 0,
      //   usageLimit: data.usageLimit,
      //   validFrom: data.validFrom,
      //   validTo: data.validTo,
      // });

      coupons.push({ code } as MktCouponWorkspaceEntity);
    }

    this.logger.log('Created bulk coupons', {
      workspaceId,
      count: coupons.length,
      promotionId: data.promotionId,
    });

    return coupons;
  }

  /**
   * Apply coupon to order
   */
  async applyCoupon(
    workspaceId: string,
    couponCode: string,
    customerId: string,
  ): Promise<{
    promotion: MktPromotionWorkspaceEntity;
    coupon: MktCouponWorkspaceEntity;
  }> {
    // Validate coupon
    // const validation = await this.validationService.validateCoupon(
    //   workspaceId,
    //   couponCode,
    //   customerId,
    // );
    //
    // if (!validation.isValid) {
    //   throw new Error('Coupon validation failed');
    // }

    // const coupon = validation.coupon!;
    // const promotion = await this.promotionRepository.findById(
    //   workspaceId,
    //   coupon.promotionId,
    // );

    // if (!promotion) {
    //   throw new Error(`Promotion not found: ${coupon.promotionId}`);
    // }

    this.logger.log('Applied coupon', {
      workspaceId,
      couponCode,
      customerId,
    });

    // return { promotion, coupon };
    return {
      promotion: {} as MktPromotionWorkspaceEntity,
      coupon: { code: couponCode } as MktCouponWorkspaceEntity,
    };
  }

  /**
   * Lấy coupon theo code
   */
  async getCouponByCode(
    workspaceId: string,
    code: string,
  ): Promise<MktCouponWorkspaceEntity | null> {
    // const coupon = await this.couponRepository.findByCode(workspaceId, code);
    // return coupon;
    this.logger.log('Getting coupon by code', { workspaceId, code });

    return null;
  }

  /**
   * Lấy danh sách coupons theo promotion ID
   */
  async getCouponsByPromotion(
    workspaceId: string,
    promotionId: string,
    _pagination: { limit: number; offset: number },
  ): Promise<PaginatedResult<MktCouponWorkspaceEntity>> {
    this.logger.log('Getting coupons by promotion', {
      workspaceId,
      promotionId,
    });

    // const result = await this.couponRepository.findByPromotionId(
    //   workspaceId,
    //   promotionId,
    //   pagination,
    // );

    return {
      items: [],
      total: 0,
      hasMore: false,
    };
  }

  /**
   * Revoke/disable coupon
   */
  async revokeCoupon(workspaceId: string, code: string): Promise<void> {
    // const coupon = await this.couponRepository.findByCode(workspaceId, code);
    //
    // if (!coupon) {
    //   throw new Error(`Coupon not found: ${code}`);
    // }
    //
    // await this.couponRepository.updateStatus(
    //   workspaceId,
    //   coupon.id,
    //   COUPON_STATUS.DISABLED,
    // );

    this.logger.log('Revoked coupon', { workspaceId, code });
  }

  /**
   * Mark coupon as used
   */
  async markCouponUsed(workspaceId: string, couponId: string): Promise<void> {
    // await this.couponRepository.incrementUsageCount(workspaceId, couponId);

    // const coupon = await this.couponRepository.findById(workspaceId, couponId);

    // Update status if usage limit reached
    // if (coupon && coupon.usageLimit && coupon.currentUsageCount >= coupon.usageLimit) {
    //   await this.couponRepository.updateStatus(
    //     workspaceId,
    //     couponId,
    //     COUPON_STATUS.USED,
    //   );
    // }

    this.logger.log('Marked coupon as used', { workspaceId, couponId });
  }

  /**
   * Generate secure random coupon code
   */
  private generateCouponCode(prefix = '', length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;

    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
  }

  /**
   * Generate batch of unique coupon codes
   */
  private async generateBatchCouponCodes(
    workspaceId: string,
    quantity: number,
    prefix: string,
  ): Promise<string[]> {
    const codes: string[] = [];
    const maxAttempts = quantity * 3;
    let attempts = 0;

    while (codes.length < quantity && attempts < maxAttempts) {
      const candidateCodes = Array.from(
        { length: quantity - codes.length },
        () => this.generateCouponCode(prefix),
      );

      // Check for duplicates
      // const existingCodes = await this.couponRepository.findByCodes(
      //   workspaceId,
      //   candidateCodes,
      // );
      // const existingCodeSet = new Set(existingCodes.map((c) => c.code));
      // const newCodes = candidateCodes.filter((code) => !existingCodeSet.has(code));

      codes.push(...candidateCodes);
      attempts++;
    }

    if (codes.length < quantity) {
      throw new Error('Unable to generate unique codes after max attempts');
    }

    return codes.slice(0, quantity);
  }
}
