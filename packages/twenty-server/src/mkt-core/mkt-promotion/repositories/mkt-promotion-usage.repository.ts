import { Injectable, Logger } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
 * Handles database operations for promotion usage tracking
 */
@Injectable()
export class MktPromotionUsageRepository {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPromotionUsageWorkspaceEntity>(
      workspaceId,
      'mktPromotionUsage',
    );
  }

  /**
   * Find usage by ID
   */
  async findById(
    workspaceId: string,
    usageId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: usageId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all usages for a promotion
   */
  async findByPromotionId(
    workspaceId: string,
    promotionId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    promotionId: string,
    options: { limit: number; offset: number },
  ): Promise<PaginatedResult<MktPromotionUsageWorkspaceEntity>> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    customerId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    orderId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    couponId: string,
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
   * Count usages for a promotion
   */
  async countByPromotionId(
    workspaceId: string,
    promotionId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    promotionId: string,
    customerId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

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
  async countByCouponId(
    workspaceId: string,
    couponId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: {
        couponId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Create a new usage record
   */
  async create(
    workspaceId: string,
    data: CreatePromotionUsageData,
    queryRunner?: QueryRunner,
  ): Promise<MktPromotionUsageWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const usage = repository.create(data);

    let savedUsage: MktPromotionUsageWorkspaceEntity;

    if (queryRunner) {
      savedUsage = await queryRunner.manager.save(usage);
    } else {
      savedUsage = await repository.save(usage);
    }

    this.logger.log(
      `Created usage record ${savedUsage.id} for promotion ${data.promotionId}`,
    );

    return savedUsage;
  }

  /**
   * Get total discount amount for a promotion
   */
  async getTotalDiscountByPromotionId(
    workspaceId: string,
    promotionId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

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
  async getTotalDiscountByCustomerId(
    workspaceId: string,
    customerId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    promotionId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalUsages: number;
    totalDiscount: number;
    totalOriginalAmount: number;
    averageDiscount: number;
  }> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    promotionId: string,
    limit: number,
  ): Promise<
    Array<{ customerId: string; totalDiscount: number; usageCount: number }>
  > {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    promotionId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{ date: string; usageCount: number; totalDiscount: number }>
  > {
    const repository = await this.getRepository(workspaceId);

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

  /**
   * Find usages by multiple promotion IDs (batch operation)
   */
  async findByPromotionIds(
    workspaceId: string,
    promotionIds: string[],
  ): Promise<MktPromotionUsageWorkspaceEntity[]> {
    if (promotionIds.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('usage')
      .where('usage.promotionId IN (:...promotionIds)', { promotionIds })
      .andWhere('usage.deletedAt IS NULL')
      .orderBy('usage.appliedAt', 'DESC')
      .getMany();
  }

  /**
   * Check if customer has used a promotion
   */
  async hasCustomerUsedPromotion(
    workspaceId: string,
    promotionId: string,
    customerId: string,
  ): Promise<boolean> {
    const count = await this.countByPromotionAndCustomer(
      workspaceId,
      promotionId,
      customerId,
    );

    return count > 0;
  }

  /**
   * Soft delete usage record
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktPromotionUsageWorkspaceEntity', id);

    this.logger.log(`Soft deleted usage record ${id}`);
  }

  /**
   * Delete all usages for an order (when order is cancelled)
   */
  async deleteByOrderId(
    workspaceId: string,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktPromotionUsageWorkspaceEntity', {
      orderId,
    });

    this.logger.log(`Deleted all usage records for order ${orderId}`);
  }
}
