import { Injectable } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  PROMOTION_LOG_CONTEXT,
  PromotionRuleType,
} from 'src/mkt-core/mkt-promotion/constants';
import { CreatePromotionRuleData } from 'src/mkt-core/mkt-promotion/types';
import { MktPromotionRuleWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities';

/**
 * Repository for MktPromotionRuleWorkspaceEntity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Handles database operations for promotion rules.
 */
@Injectable()
export class MktPromotionRuleRepository extends BaseWorkspaceRepository<MktPromotionRuleWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPromotionRuleWorkspaceEntity,
      `${PROMOTION_LOG_CONTEXT}:Rule`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find all rules for a promotion
   */
  async findByPromotionId(
    promotionId: string,
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        promotionId,
        deletedAt: IsNull(),
      },
      order: {
        position: 'ASC',
      },
    });
  }

  /**
   * Find rules by promotion IDs (batch operation)
   */
  async findByPromotionIds(
    promotionIds: string[],
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    if (promotionIds.length === 0) {
      return [];
    }

    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('rule')
      .where('rule.promotionId IN (:...promotionIds)', { promotionIds })
      .andWhere('rule.deletedAt IS NULL')
      .orderBy('rule.position', 'ASC')
      .getMany();
  }

  /**
   * Find required rules for a promotion
   */
  async findRequiredByPromotionId(
    promotionId: string,
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        promotionId,
        isRequired: true,
        deletedAt: IsNull(),
      },
      order: {
        position: 'ASC',
      },
    });
  }

  /**
   * Find rules by type
   */
  async findByRuleType(
    promotionId: string,
    ruleType: PromotionRuleType,
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: {
        promotionId,
        ruleType,
        deletedAt: IsNull(),
      },
      order: {
        position: 'ASC',
      },
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create a new rule
   */
  async createRule(
    promotionId: string,
    data: CreatePromotionRuleData,
  ): Promise<MktPromotionRuleWorkspaceEntity> {
    const repository = await this.getRepository();

    // Get the next position if not provided
    const position = data.position ?? (await this.getNextPosition(promotionId));

    const rule = repository.create({
      ...data,
      promotionId,
      position,
      isRequired: data.isRequired ?? true,
      logicOperator: data.logicOperator ?? 'AND',
    });

    const savedRule = await repository.save(rule);

    this.logger.log(
      `Created rule ${savedRule.id} for promotion ${promotionId}`,
    );

    return savedRule;
  }

  /**
   * Create multiple rules at once (transactional)
   */
  async createManyRules(
    promotionId: string,
    rulesData: CreatePromotionRuleData[],
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    if (rulesData.length === 0) {
      return [];
    }

    const repository = await this.getRepository();

    const rules = rulesData.map((data, index) =>
      repository.create({
        ...data,
        promotionId,
        position: data.position ?? index,
        isRequired: data.isRequired ?? true,
        logicOperator: data.logicOperator ?? 'AND',
      }),
    );

    const savedRules = await repository.save(rules);

    this.logger.log(
      `Created ${savedRules.length} rules for promotion ${promotionId}`,
    );

    return savedRules;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update rule
   */
  async updateRule(
    ruleId: string,
    data: Partial<CreatePromotionRuleData>,
  ): Promise<MktPromotionRuleWorkspaceEntity | null> {
    const repository = await this.getRepository();

    await repository.update(ruleId, data);

    this.logger.log(`Updated rule ${ruleId}`);

    return this.findById(ruleId);
  }

  /**
   * Update rule positions (for reordering)
   */
  async updatePositions(
    updates: Array<{ id: string; position: number }>,
  ): Promise<void> {
    const repository = await this.getRepository();

    for (const update of updates) {
      await repository.update(update.id, { position: update.position });
    }

    this.logger.log(`Updated positions for ${updates.length} rules`);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete rule (soft delete)
   */
  async softDeleteRule(ruleId: string): Promise<void> {
    await this.softDelete(ruleId);

    this.logger.log(`Soft deleted rule ${ruleId}`);
  }

  /**
   * Delete all rules for a promotion
   */
  async deleteByPromotionId(promotionId: string): Promise<void> {
    await this.softDeleteWhere({ promotionId });

    this.logger.log(`Deleted all rules for promotion ${promotionId}`);
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count rules for a promotion
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

  // ============================================
  // CHECK OPERATIONS
  // ============================================

  /**
   * Check if promotion has rules of a specific type
   */
  async hasRuleType(
    promotionId: string,
    ruleType: PromotionRuleType,
  ): Promise<boolean> {
    const repository = await this.getRepository();

    const count = await repository.count({
      where: {
        promotionId,
        ruleType,
        deletedAt: IsNull(),
      },
    });

    return count > 0;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get the next available position for a rule
   */
  private async getNextPosition(promotionId: string): Promise<number> {
    const repository = await this.getRepository();

    const maxPosition = await repository
      .createQueryBuilder('rule')
      .select('MAX(rule.position)', 'maxPosition')
      .where('rule.promotionId = :promotionId', { promotionId })
      .andWhere('rule.deletedAt IS NULL')
      .getRawOne();

    return (maxPosition?.maxPosition ?? -1) + 1;
  }
}
