import { Injectable } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';
import { PaginatedResult } from 'src/mkt-core/mkt-promotion/types';
import { MktPromotionUsageWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities';

/**
 * Data for creating promotion usage record
 */
export type CreatePromotionUsageData = {
  promotionId: string;
  couponId?: string | null;
  orderId: string;
  customerId: string;
  discountAmount: number;
  originalAmount: number;
  appliedAt: Date;
  metadata?: Record<string, unknown> | null;
};

/**
 * Repository for MktPromotionUsageWorkspaceEntity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Handles database operations for promotion usage tracking.
 */
@Injectable()
export class MktPromotionUsageRepository extends BaseWorkspaceRepository<MktPromotionUsageWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPromotionUsageWorkspaceEntity,
      `${PROMOTION_LOG_CONTEXT}:Usage`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find all usages for a promotion
   */
  async findByPromotionId(
    promotionId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        promotionId,
        deletedAt: IsNull(),
      },
      order: {
        appliedAt: 'DESC',
      },
    });
  }

  /**
   * Find usages by promotion ID with pagination
   */
  async findByPromotionIdPaginated(
    promotionId: string,
    options: { limit: number; offset: number },
  ): Promise<PaginatedResult<MktPromotionUsageWorkspaceEntity>> {
    const repository = await this.getRepository();

    const queryBuilder = repository
      .createQueryBuilder('usage')
      .where('usage.promotionId = :promotionId', { promotionId })
      .andWhere('usage.deletedAt IS NULL');

    const total = await queryBuilder.getCount();

    const items = await queryBuilder
      .orderBy('usage.appliedAt', 'DESC')
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
   * Find usages by customer ID
   */
  async findByCustomerId(
    customerId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        customerId,
        deletedAt: IsNull(),
      },
      order: {
        appliedAt: 'DESC',
      },
    });
  }

  /**
   * Find usages by order ID
   */
  async findByOrderId(
    orderId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        orderId,
        deletedAt: IsNull(),
      },
      order: {
        appliedAt: 'DESC',
      },
    });
  }

  /**
   * Find usages by coupon ID
   */
  async findByCouponId(
    couponId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        couponId,
        deletedAt: IsNull(),
      },
      order: {
        appliedAt: 'DESC',
      },
    });
  }

  /**
   * Find usages by multiple promotion IDs (batch operation)
   */
  async findByPromotionIds(
    promotionIds: string[],
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    if (promotionIds.length === 0) {
      return [];
    }

    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('usage')
      .where('usage.promotionId IN (:...promotionIds)', { promotionIds })
      .andWhere('usage.deletedAt IS NULL')
      .orderBy('usage.appliedAt', 'DESC')
      .getMany();
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count usages for a promotion
   */
  async countByPromotionId(promotionId: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        promotionId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Count usages for a customer on a specific promotion
   */
  async countByPromotionAndCustomer(
    promotionId: string,
    customerId: string,
  ): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        promotionId,
        customerId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Count usages for a coupon
   */
  async countByCouponId(couponId: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({
      where: {
        couponId,
        deletedAt: IsNull(),
      },
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new usage record
   */
  async createUsage(
    data: CreatePromotionUsageData,
  ): Promise<MktPromotionUsageWorkspaceEntity> {
    const repository = await this.getRepository();

    const usage = repository.create(data);

    const savedUsage = await repository.save(usage);

    this.logger.log(
      `Created usage record ${savedUsage.id} for promotion ${data.promotionId}`,
    );

    return savedUsage;
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete usage record
   */
  async softDeleteUsage(id: string): Promise<void> {
    await this.softDelete(id);

    this.logger.log(`Soft deleted usage record ${id}`);
  }

  /**
   * Delete all usages for an order (when order is cancelled)
   */
  async deleteByOrderId(orderId: string): Promise<void> {
    await this.softDeleteWhere({ orderId });

    this.logger.log(`Deleted all usage records for order ${orderId}`);
  }

  // ============================================
  // CHECK OPERATIONS
  // ============================================

  /**
   * Check if customer has used a promotion
   */
  async hasCustomerUsedPromotion(
    promotionId: string,
    customerId: string,
  ): Promise<boolean> {
    const count = await this.countByPromotionAndCustomer(
      promotionId,
      customerId,
    );

    return count > 0;
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get total discount amount for a promotion
   */
  async getTotalDiscountByPromotionId(promotionId: string): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository
      .createQueryBuilder('usage')
      .select('SUM(usage.discountAmount)', 'total')
      .where('usage.promotionId = :promotionId', { promotionId })
      .andWhere('usage.deletedAt IS NULL')
      .getRawOne();

    return parseFloat(result?.total ?? '0');
  }

  /**
   * Get total discount amount for a customer
   */
  async getTotalDiscountByCustomerId(customerId: string): Promise<number> {
    const repository = await this.getRepository();

    const result = await repository
      .createQueryBuilder('usage')
      .select('SUM(usage.discountAmount)', 'total')
      .where('usage.customerId = :customerId', { customerId })
      .andWhere('usage.deletedAt IS NULL')
      .getRawOne();

    return parseFloat(result?.total ?? '0');
  }

  /**
   * Get usage statistics for a promotion in a date range
   */
  async getStatisticsByDateRange(
    promotionId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalUsages: number;
    totalDiscount: number;
    totalOriginalAmount: number;
    averageDiscount: number;
  }> {
    const repository = await this.getRepository();

    const result = await repository
      .createQueryBuilder('usage')
      .select('COUNT(*)', 'totalUsages')
      .addSelect('SUM(usage.discountAmount)', 'totalDiscount')
      .addSelect('SUM(usage.originalAmount)', 'totalOriginalAmount')
      .addSelect('AVG(usage.discountAmount)', 'averageDiscount')
      .where('usage.promotionId = :promotionId', { promotionId })
      .andWhere('usage.appliedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('usage.deletedAt IS NULL')
      .getRawOne();

    return {
      totalUsages: parseInt(result?.totalUsages ?? '0', 10),
      totalDiscount: parseFloat(result?.totalDiscount ?? '0'),
      totalOriginalAmount: parseFloat(result?.totalOriginalAmount ?? '0'),
      averageDiscount: parseFloat(result?.averageDiscount ?? '0'),
    };
  }

  /**
   * Get top customers by discount amount for a promotion
   */
  async getTopCustomersByDiscount(
    promotionId: string,
    limit: number,
  ): Promise<
    Array<{ customerId: string; totalDiscount: number; usageCount: number }>
  > {
    const repository = await this.getRepository();

    const results = await repository
      .createQueryBuilder('usage')
      .select('usage.customerId', 'customerId')
      .addSelect('SUM(usage.discountAmount)', 'totalDiscount')
      .addSelect('COUNT(*)', 'usageCount')
      .where('usage.promotionId = :promotionId', { promotionId })
      .andWhere('usage.deletedAt IS NULL')
      .groupBy('usage.customerId')
      .orderBy('totalDiscount', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map((row) => ({
      customerId: row.customerId,
      totalDiscount: parseFloat(row.totalDiscount),
      usageCount: parseInt(row.usageCount, 10),
    }));
  }

  /**
   * Get daily usage statistics for a promotion
   */
  async getDailyStatistics(
    promotionId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{ date: string; usageCount: number; totalDiscount: number }>
  > {
    const repository = await this.getRepository();

    const results = await repository
      .createQueryBuilder('usage')
      .select('DATE(usage.appliedAt)', 'date')
      .addSelect('COUNT(*)', 'usageCount')
      .addSelect('SUM(usage.discountAmount)', 'totalDiscount')
      .where('usage.promotionId = :promotionId', { promotionId })
      .andWhere('usage.appliedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('usage.deletedAt IS NULL')
      .groupBy('DATE(usage.appliedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return results.map((row) => ({
      date: row.date,
      usageCount: parseInt(row.usageCount, 10),
      totalDiscount: parseFloat(row.totalDiscount),
    }));
  }
}
