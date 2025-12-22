import { Injectable, Logger } from '@nestjs/common';

import { In, IsNull, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  COUPON_STATUS,
  CouponStatus,
  PROMOTION_LOG_CONTEXT,
} from 'src/mkt-core/mkt-promotion/constants';
import {
  CreateCouponData,
  PaginatedResult,
} from 'src/mkt-core/mkt-promotion/types';
import { MktCouponWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities';

/**
 * Repository for MktCouponWorkspaceEntity
 * Handles database operations for coupons
 */
@Injectable()
export class MktCouponRepository {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCouponWorkspaceEntity>(
      workspaceId,
      'mktCoupon',
    );
  }

  /**
   * Find coupon by ID
   */
  async findById(
    workspaceId: string,
    couponId: string,
  ): Promise<MktCouponWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: couponId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find coupon by code
   */
  async findByCode(
    workspaceId: string,
    code: string,
  ): Promise<MktCouponWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        code,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find coupons by codes (batch operation)
   */
  async findByCodes(
    workspaceId: string,
    codes: string[],
  ): Promise<MktCouponWorkspaceEntity[]> {
    if (codes.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        code: In(codes),
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all coupons for a promotion
   */
  async findByPromotionId(
    workspaceId: string,
    promotionId: string,
  ): Promise<MktCouponWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        promotionId,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find coupons by promotion ID with pagination
   */
  async findByPromotionIdPaginated(
    workspaceId: string,
    promotionId: string,
    options: { limit: number; offset: number },
    status?: string,
  ): Promise<PaginatedResult<MktCouponWorkspaceEntity>> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('coupon')
      .where('coupon.promotionId = :promotionId', { promotionId })
      .andWhere('coupon.deletedAt IS NULL');

    if (status) {
      queryBuilder.andWhere('coupon.status = :status', { status });
    }

    const total = await queryBuilder.getCount();

    const items = await queryBuilder
      .orderBy('coupon.createdAt', 'DESC')
      .take(options.limit)
      .skip(options.offset)
      .getMany();

    return {
      items,
      total,
      hasMore: options.offset + items.length < total,
    };
  }

  /**
   * Find active coupons for a customer
   */
  async findActiveByCustomerId(
    workspaceId: string,
    customerId: string,
  ): Promise<MktCouponWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);
    const now = DateTimeUtils.now().toJSDate();

    return repository
      .createQueryBuilder('coupon')
      .where('coupon.assignedCustomerId = :customerId', { customerId })
      .andWhere('coupon.status = :status', { status: COUPON_STATUS.ACTIVE })
      .andWhere('coupon.deletedAt IS NULL')
      .andWhere('(coupon.validFrom IS NULL OR coupon.validFrom <= :now)', {
        now,
      })
      .andWhere('(coupon.validTo IS NULL OR coupon.validTo >= :now)', { now })
      .orderBy('coupon.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find valid coupon by code (checks status and validity period)
   */
  async findValidByCode(
    workspaceId: string,
    code: string,
  ): Promise<MktCouponWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);
    const now = DateTimeUtils.now().toJSDate();

    return repository
      .createQueryBuilder('coupon')
      .where('coupon.code = :code', { code })
      .andWhere('coupon.status = :status', { status: COUPON_STATUS.ACTIVE })
      .andWhere('coupon.deletedAt IS NULL')
      .andWhere('(coupon.validFrom IS NULL OR coupon.validFrom <= :now)', {
        now,
      })
      .andWhere('(coupon.validTo IS NULL OR coupon.validTo >= :now)', { now })
      .getOne();
  }

  /**
   * Create a new coupon
   */
  async create(
    workspaceId: string,
    data: CreateCouponData & { code: string },
    queryRunner?: QueryRunner,
  ): Promise<MktCouponWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const coupon = repository.create({
      ...data,
      status: COUPON_STATUS.ACTIVE,
      currentUsageCount: 0,
    });

    let savedCoupon: MktCouponWorkspaceEntity;

    if (queryRunner) {
      savedCoupon = await queryRunner.manager.save(coupon);
    } else {
      savedCoupon = await repository.save(coupon);
    }

    this.logger.log(`Created coupon ${savedCoupon.code}`);

    return savedCoupon;
  }

  /**
   * Create multiple coupons at once (transactional)
   */
  async createMany(
    workspaceId: string,
    couponsData: Array<CreateCouponData & { code: string }>,
    queryRunner?: QueryRunner,
  ): Promise<MktCouponWorkspaceEntity[]> {
    if (couponsData.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    const coupons = couponsData.map((data) =>
      repository.create({
        ...data,
        status: COUPON_STATUS.ACTIVE,
        currentUsageCount: 0,
      }),
    );

    let savedCoupons: MktCouponWorkspaceEntity[];

    if (queryRunner) {
      savedCoupons = await queryRunner.manager.save(coupons);
    } else {
      savedCoupons = await repository.save(coupons);
    }

    this.logger.log(`Created ${savedCoupons.length} coupons in bulk`);

    return savedCoupons;
  }

  /**
   * Update coupon status
   */
  async updateStatus(
    workspaceId: string,
    couponId: string,
    status: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktCouponWorkspaceEntity',
      { id: couponId },
      { status },
    );

    this.logger.log(`Updated coupon ${couponId} status to ${status}`);
  }

  /**
   * Increment usage count
   */
  async incrementUsageCount(
    workspaceId: string,
    couponId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.increment(
      'MktCouponWorkspaceEntity',
      { id: couponId },
      'currentUsageCount',
      1,
    );

    this.logger.debug(`Incremented usage count for coupon ${couponId}`);
  }

  /**
   * Find expired active coupons (for background job)
   */
  async findExpiredActive(now: Date): Promise<MktCouponWorkspaceEntity[]> {
    const repository = await this.getRepository('*'); // All workspaces

    return repository
      .createQueryBuilder('coupon')
      .where('coupon.status = :status', { status: COUPON_STATUS.ACTIVE })
      .andWhere('coupon.validTo IS NOT NULL')
      .andWhere('coupon.validTo < :now', { now })
      .andWhere('coupon.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Find active coupons that reached usage limit (for background job)
   */
  async findUsageLimitReached(): Promise<MktCouponWorkspaceEntity[]> {
    const repository = await this.getRepository('*'); // All workspaces

    return repository
      .createQueryBuilder('coupon')
      .where('coupon.status = :status', { status: COUPON_STATUS.ACTIVE })
      .andWhere('coupon.usageLimit IS NOT NULL')
      .andWhere('coupon.currentUsageCount >= coupon.usageLimit')
      .andWhere('coupon.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Check if coupon code exists
   */
  async codeExists(
    workspaceId: string,
    code: string,
    excludeId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const query = repository
      .createQueryBuilder('coupon')
      .where('coupon.code = :code', { code })
      .andWhere('coupon.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('coupon.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();

    return count > 0;
  }

  /**
   * Count coupons by status for a promotion
   */
  async countByStatus(
    workspaceId: string,
    promotionId: string,
    status: CouponStatus,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: {
        promotionId,
        status,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Get coupon statistics for a promotion
   */
  async getStatistics(
    workspaceId: string,
    promotionId: string,
  ): Promise<{
    total: number;
    active: number;
    used: number;
    expired: number;
    disabled: number;
  }> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('coupon')
      .select('coupon.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('coupon.promotionId = :promotionId', { promotionId })
      .andWhere('coupon.deletedAt IS NULL')
      .groupBy('coupon.status')
      .getRawMany();

    const stats = {
      total: 0,
      active: 0,
      used: 0,
      expired: 0,
      disabled: 0,
    };

    for (const row of result) {
      const count = parseInt(row.count, 10);

      stats.total += count;

      switch (row.status) {
        case COUPON_STATUS.ACTIVE:
          stats.active = count;
          break;
        case COUPON_STATUS.USED:
          stats.used = count;
          break;
        case COUPON_STATUS.EXPIRED:
          stats.expired = count;
          break;
        case COUPON_STATUS.DISABLED:
          stats.disabled = count;
          break;
      }
    }

    return stats;
  }

  /**
   * Soft delete coupon
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktCouponWorkspaceEntity', id);

    this.logger.log(`Soft deleted coupon ${id}`);
  }
}
