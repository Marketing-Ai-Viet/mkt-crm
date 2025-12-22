import { Injectable, Logger } from '@nestjs/common';

import { IsNull, LessThanOrEqual, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import {
  PROMOTION_STATUS,
  PROMOTION_LOG_CONTEXT,
  PROMOTION_DEFAULTS,
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
 * Handles database operations with complex queries to avoid N+1 problems
 */
@Injectable()
export class MktPromotionRepository {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPromotionWorkspaceEntity>(
      workspaceId,
      'mktPromotion',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Find promotion by ID (without relations)
   */
  async findById(
    workspaceId: string,
    promotionId: string,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: promotionId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find promotion by ID with rules (using JOIN to avoid N+1)
   */
  async findByIdWithRules(
    workspaceId: string,
    promotionId: string,
  ): Promise<PromotionWithRules | null> {
    const repository = await this.getRepository(workspaceId);

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
  async findByCode(
    workspaceId: string,
    code: string,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        code,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find active promotions with auto-apply enabled
   */
  async findActiveAutoApply(
    workspaceId: string,
  ): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);
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
  async findActive(
    workspaceId: string,
  ): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);
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
    workspaceId: string,
    options: { limit: number; offset: number },
    filter?: PromotionFilter,
  ): Promise<PaginatedResult<MktPromotionWorkspaceEntity>> {
    const repository = await this.getRepository(workspaceId);

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
   * Create new promotion
   */
  async create(
    workspaceId: string,
    data: CreatePromotionData,
    queryRunner?: QueryRunner,
  ): Promise<MktPromotionWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

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

    let savedPromotion: MktPromotionWorkspaceEntity;

    if (queryRunner) {
      savedPromotion = await queryRunner.manager.save(promotion);
    } else {
      savedPromotion = await repository.save(promotion);
    }

    this.logger.log(
      `Created promotion ${savedPromotion.id} (${savedPromotion.code})`,
    );

    return savedPromotion;
  }

  /**
   * Update promotion
   */
  async update(
    workspaceId: string,
    data: UpdatePromotionData,
    queryRunner?: QueryRunner,
  ): Promise<MktPromotionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    const { id, ...updateData } = data;

    await manager.update(
      'MktPromotionWorkspaceEntity',
      { id },
      {
        ...updateData,
        updatedAt: DateTimeUtils.now().toJSDate(),
      },
    );

    this.logger.log(`Updated promotion ${id}`);

    return this.findById(workspaceId, id);
  }

  /**
   * Update promotion status
   */
  async updateStatus(
    workspaceId: string,
    promotionId: string,
    status: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktPromotionWorkspaceEntity',
      { id: promotionId },
      {
        status,
        updatedAt: DateTimeUtils.now().toJSDate(),
      },
    );

    this.logger.log(`Updated promotion ${promotionId} status to ${status}`);
  }

  /**
   * Increment usage count
   */
  async incrementUsageCount(
    workspaceId: string,
    promotionId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.increment(
      'MktPromotionWorkspaceEntity',
      { id: promotionId },
      'currentUsageCount',
      1,
    );

    this.logger.debug(`Incremented usage count for promotion ${promotionId}`);
  }

  /**
   * Find expired active promotions (for background job)
   */
  async findExpiredActive(now: Date): Promise<MktPromotionWorkspaceEntity[]> {
    const repository = await this.getRepository('*'); // All workspaces

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
    const repository = await this.getRepository('*'); // All workspaces

    return repository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PROMOTION_STATUS.ACTIVE })
      .andWhere('promotion.usageLimit IS NOT NULL')
      .andWhere('promotion.currentUsageCount >= promotion.usageLimit')
      .andWhere('promotion.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Check if promotion code exists
   */
  async codeExists(
    workspaceId: string,
    code: string,
    excludeId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

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

  /**
   * Find promotions by IDs (batch operation)
   */
  async findManyByIds(
    workspaceId: string,
    ids: string[],
  ): Promise<MktPromotionWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('promotion')
      .where('promotion.id IN (:...ids)', { ids })
      .andWhere('promotion.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Soft delete promotion
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktPromotionWorkspaceEntity', id);

    this.logger.log(`Soft deleted promotion ${id}`);
  }

  /**
   * Get promotion statistics
   */
  async getStatistics(
    workspaceId: string,
    promotionId: string,
  ): Promise<{
    totalUsage: number;
    remainingUsage: number | null;
    usagePercentage: number | null;
  }> {
    const promotion = await this.findById(workspaceId, promotionId);

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
