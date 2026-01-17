import { Injectable } from '@nestjs/common';

import { IsNull, LessThanOrEqual } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import {
  PROMOTION_STATUS,
  PROMOTION_LOG_CONTEXT,
  PROMOTION_DEFAULTS,
  PromotionStatus,
} from 'src/mkt-core/mkt-promotion/constants';
import {
  PromotionWithRules,
  CreatePromotionData,
  UpdatePromotionData,
  PromotionFilter,
  PaginatedResult,
} from 'src/mkt-core/mkt-promotion/types';
import { MktPromotionWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion.workspace-entity';
import { MktPromotionRuleWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities/mkt-promotion-rule.workspace-entity';

/**
 * Repository for MktPromotionWorkspaceEntity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Handles database operations with complex queries to avoid N+1 problems.
 */
@Injectable()
export class MktPromotionRepository extends BaseWorkspaceRepository<MktPromotionWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPromotionWorkspaceEntity,
      PROMOTION_LOG_CONTEXT,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find promotion by ID with rules (using JOIN to avoid N+1)
   */
  async findByIdWithRules(
    promotionId: string,
  ): Promise<PromotionWithRules | null> {
    const repository = await this.getRepository();

    const promotion = await repository
      .createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.rules', 'rules')
      .where('promotion.id = :id', { id: promotionId })
      .andWhere('promotion.deletedAt IS NULL')
      .orderBy('rules.position', 'ASC')
      .getOne();

    if (!promotion) {
      return null;
    }

    // Sau khi JOIN, TypeORM sẽ populate field 'rules' trên promotion
    const promotionWithRulesField = promotion as MktPromotionWorkspaceEntity & {
      rules?: MktPromotionRuleWorkspaceEntity[];
    };

    return {
      promotion,
      rules: promotionWithRulesField.rules ?? [],
    };
  }

  /**
   * Find promotion by code
   */
  async findByCode(code: string): Promise<MktPromotionWorkspaceEntity | null> {
    return this.findOne({ code });
  }

  /**
   * Find active promotions with auto-apply enabled
   */
  async findActiveAutoApply(): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository();
    const now = DateTimeUtils.now().toJSDate();

    return repository.find({
      where: {
        status: PROMOTION_STATUS.ACTIVE,
        isAutoApply: true,
        startDate: LessThanOrEqual(now),
        deletedAt: IsNull(),
      },
      order: {
        priority: 'DESC',
      },
    });
  }

  /**
   * Find active promotions by status and optional filters
   */
  async findActive(): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository();
    const now = DateTimeUtils.now().toJSDate();

    return repository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PROMOTION_STATUS.ACTIVE })
      .andWhere('promotion.deletedAt IS NULL')
      .andWhere('promotion.startDate <= :now', { now })
      .andWhere('(promotion.endDate IS NULL OR promotion.endDate >= :now)', {
        now,
      })
      .orderBy('promotion.priority', 'DESC')
      .getMany();
  }

  /**
   * Find all promotions with pagination and filters
   */
  async findAllPaginated(
    options: { limit: number; offset: number },
    filter?: PromotionFilter,
  ): Promise<PaginatedResult<MktPromotionWorkspaceEntity>> {
    const repository = await this.getRepository();

    const queryBuilder = repository
      .createQueryBuilder('promotion')
      .where('promotion.deletedAt IS NULL');

    // Apply filters
    if (filter?.status) {
      queryBuilder.andWhere('promotion.status = :status', {
        status: filter.status,
      });
    }

    if (filter?.promotionType) {
      queryBuilder.andWhere('promotion.promotionType = :promotionType', {
        promotionType: filter.promotionType,
      });
    }

    if (filter?.isAutoApply !== undefined) {
      queryBuilder.andWhere('promotion.isAutoApply = :isAutoApply', {
        isAutoApply: filter.isAutoApply,
      });
    }

    if (filter?.stackable !== undefined) {
      queryBuilder.andWhere('promotion.stackable = :stackable', {
        stackable: filter.stackable,
      });
    }

    if (filter?.startDateFrom) {
      queryBuilder.andWhere('promotion.startDate >= :startDateFrom', {
        startDateFrom: filter.startDateFrom,
      });
    }

    if (filter?.startDateTo) {
      queryBuilder.andWhere('promotion.startDate <= :startDateTo', {
        startDateTo: filter.startDateTo,
      });
    }

    if (filter?.search) {
      queryBuilder.andWhere(
        '(promotion.name ILIKE :search OR promotion.code ILIKE :search OR promotion.description ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    const total = await queryBuilder.getCount();

    const items = await queryBuilder
      .orderBy('promotion.createdAt', 'DESC')
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
   * Find active promotions with rules (for cache warmup job)
   */
  async findActiveWithRules(): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.rules', 'rules')
      .where('promotion.status = :status', { status: PROMOTION_STATUS.ACTIVE })
      .andWhere('promotion.deletedAt IS NULL')
      .orderBy('promotion.priority', 'DESC')
      .getMany();
  }

  /**
   * Find expired active promotions for a specific workspace (for background job)
   */
  async findExpiredActive(now: Date): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PROMOTION_STATUS.ACTIVE })
      .andWhere('promotion.endDate IS NOT NULL')
      .andWhere('promotion.endDate < :now', { now })
      .andWhere('promotion.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Find active promotions that reached usage limit (for background job)
   */
  async findUsageLimitReached(): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PROMOTION_STATUS.ACTIVE })
      .andWhere('promotion.usageLimit IS NOT NULL')
      .andWhere('promotion.currentUsageCount >= promotion.usageLimit')
      .andWhere('promotion.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Find promotions by IDs (batch operation)
   */
  async findManyByIds(ids: string[]): Promise<MktPromotionWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('promotion')
      .where('promotion.id IN (:...ids)', { ids })
      .andWhere('promotion.deletedAt IS NULL')
      .getMany();
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new promotion
   */
  async createPromotion(
    data: CreatePromotionData,
  ): Promise<MktPromotionWorkspaceEntity> {
    const repository = await this.getRepository();

    const { rules: _rules, ...promotionData } = data;

    const promotion = repository.create({
      ...promotionData,
      status: PROMOTION_STATUS.DRAFT,
      currentUsageCount: PROMOTION_DEFAULTS.CURRENT_USAGE_COUNT,
      priority: data.priority ?? PROMOTION_DEFAULTS.PRIORITY,
      stackable: data.stackable ?? PROMOTION_DEFAULTS.STACKABLE,
      isAutoApply: data.isAutoApply ?? PROMOTION_DEFAULTS.IS_AUTO_APPLY,
      currency: data.currency ?? PROMOTION_DEFAULTS.CURRENCY,
    });

    const savedPromotion = await repository.save(promotion);

    this.logger.log(
      `Created promotion ${savedPromotion.id} (${savedPromotion.code})`,
    );

    return savedPromotion;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update promotion
   */
  async updatePromotion(
    data: UpdatePromotionData,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const repository = await this.getRepository();

    const { id, ...updateData } = data;

    await repository.update(id, {
      ...updateData,
      updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    this.logger.log(`Updated promotion ${id}`);

    return this.findById(id);
  }

  /**
   * Update promotion status
   */
  async updateStatus(
    promotionId: string,
    status: PromotionStatus,
  ): Promise<void> {
    const repository = await this.getRepository();

    await repository.update(promotionId, {
      status,
      updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    this.logger.log(`Updated promotion ${promotionId} status to ${status}`);
  }

  /**
   * Increment usage count
   */
  async incrementUsageCount(promotionId: string): Promise<void> {
    const repository = await this.getRepository();

    await repository.increment({ id: promotionId }, 'currentUsageCount', 1);

    this.logger.debug(`Incremented usage count for promotion ${promotionId}`);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete promotion
   */
  async softDeletePromotion(id: string): Promise<void> {
    await this.softDelete(id);

    this.logger.log(`Soft deleted promotion ${id}`);
  }

  // ============================================
  // CHECK OPERATIONS
  // ============================================

  /**
   * Check if promotion code exists
   */
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const repository = await this.getRepository();

    const query = repository
      .createQueryBuilder('promotion')
      .where('promotion.code = :code', { code })
      .andWhere('promotion.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('promotion.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();

    return count > 0;
  }

  // ============================================
  // STATISTICS OPERATIONS
  // ============================================

  /**
   * Get promotion statistics
   */
  async getStatistics(promotionId: string): Promise<{
    totalUsage: number;
    remainingUsage: number | null;
    usagePercentage: number | null;
  }> {
    const promotion = await this.findById(promotionId);

    if (!promotion) {
      return {
        totalUsage: 0,
        remainingUsage: null,
        usagePercentage: null,
      };
    }

    const currentUsageCount = promotion.currentUsageCount ?? 0;
    const usageLimit = promotion.usageLimit;

    const remainingUsage = usageLimit
      ? Math.max(0, usageLimit - currentUsageCount)
      : null;
    const usagePercentage = usageLimit
      ? MoneyUtils.percentage(currentUsageCount, usageLimit).toNumber()
      : null;

    return {
      totalUsage: currentUsageCount,
      remainingUsage,
      usagePercentage,
    };
  }
}
