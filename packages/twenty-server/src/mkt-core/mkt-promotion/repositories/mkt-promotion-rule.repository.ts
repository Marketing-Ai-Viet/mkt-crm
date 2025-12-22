import { Injectable, Logger } from '@nestjs/common';

import { IsNull, QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  PROMOTION_LOG_CONTEXT,
  PromotionRuleType,
} from 'src/mkt-core/mkt-promotion/constants';
import { CreatePromotionRuleData } from 'src/mkt-core/mkt-promotion/types';
import { MktPromotionRuleWorkspaceEntity } from 'src/mkt-core/mkt-promotion/workspace-entities';

/**
 * Repository for MktPromotionRuleWorkspaceEntity
 * Handles database operations for promotion rules
 */
@Injectable()
export class MktPromotionRuleRepository {
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPromotionRuleWorkspaceEntity>(
      workspaceId,
      'mktPromotionRule',
    );
  }

  /**
   * Find rule by ID
   */
  async findById(
    workspaceId: string,
    ruleId: string,
  ): Promise<MktPromotionRuleWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        id: ruleId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find all rules for a promotion
   */
  async findByPromotionId(
    workspaceId: string,
    promotionId: string,
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    promotionIds: string[],
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    if (promotionIds.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    promotionId: string,
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
   * Create a new rule
   */
  async create(
    workspaceId: string,
    promotionId: string,
    data: CreatePromotionRuleData,
    queryRunner?: QueryRunner,
  ): Promise<MktPromotionRuleWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    // Get the next position if not provided
    const position =
      data.position ?? (await this.getNextPosition(workspaceId, promotionId));

    const rule = repository.create({
      ...data,
      promotionId,
      position,
      isRequired: data.isRequired ?? true,
      logicOperator: data.logicOperator ?? 'AND',
    });

    let savedRule: MktPromotionRuleWorkspaceEntity;

    if (queryRunner) {
      savedRule = await queryRunner.manager.save(rule);
    } else {
      savedRule = await repository.save(rule);
    }

    this.logger.log(
      `Created rule ${savedRule.id} for promotion ${promotionId}`,
    );

    return savedRule;
  }

  /**
   * Create multiple rules at once (transactional)
   */
  async createMany(
    workspaceId: string,
    promotionId: string,
    rulesData: CreatePromotionRuleData[],
    queryRunner?: QueryRunner,
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    if (rulesData.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    const rules = rulesData.map((data, index) =>
      repository.create({
        ...data,
        promotionId,
        position: data.position ?? index,
        isRequired: data.isRequired ?? true,
        logicOperator: data.logicOperator ?? 'AND',
      }),
    );

    let savedRules: MktPromotionRuleWorkspaceEntity[];

    if (queryRunner) {
      savedRules = await queryRunner.manager.save(rules);
    } else {
      savedRules = await repository.save(rules);
    }

    this.logger.log(
      `Created ${savedRules.length} rules for promotion ${promotionId}`,
    );

    return savedRules;
  }

  /**
   * Update rule
   */
  async update(
    workspaceId: string,
    ruleId: string,
    data: Partial<CreatePromotionRuleData>,
    queryRunner?: QueryRunner,
  ): Promise<MktPromotionRuleWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(
      'MktPromotionRuleWorkspaceEntity',
      { id: ruleId },
      data,
    );

    this.logger.log(`Updated rule ${ruleId}`);

    return this.findById(workspaceId, ruleId);
  }

  /**
   * Update rule positions (for reordering)
   */
  async updatePositions(
    workspaceId: string,
    updates: Array<{ id: string; position: number }>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    for (const update of updates) {
      await manager.update(
        'MktPromotionRuleWorkspaceEntity',
        { id: update.id },
        { position: update.position },
      );
    }

    this.logger.log(`Updated positions for ${updates.length} rules`);
  }

  /**
   * Delete rule (soft delete)
   */
  async softDelete(
    workspaceId: string,
    ruleId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktPromotionRuleWorkspaceEntity', ruleId);

    this.logger.log(`Soft deleted rule ${ruleId}`);
  }

  /**
   * Delete all rules for a promotion
   */
  async deleteByPromotionId(
    workspaceId: string,
    promotionId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete('MktPromotionRuleWorkspaceEntity', {
      promotionId,
    });

    this.logger.log(`Deleted all rules for promotion ${promotionId}`);
  }

  /**
   * Count rules for a promotion
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
   * Get the next available position for a rule
   */
  private async getNextPosition(
    workspaceId: string,
    promotionId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const maxPosition = await repository
      .createQueryBuilder('rule')
      .select('MAX(rule.position)', 'maxPosition')
      .where('rule.promotionId = :promotionId', { promotionId })
      .andWhere('rule.deletedAt IS NULL')
      .getRawOne();

    return (maxPosition?.maxPosition ?? -1) + 1;
  }

  /**
   * Find rules by type
   */
  async findByRuleType(
    workspaceId: string,
    promotionId: string,
    ruleType: PromotionRuleType,
  ): Promise<MktPromotionRuleWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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

  /**
   * Check if promotion has rules of a specific type
   */
  async hasRuleType(
    workspaceId: string,
    promotionId: string,
    ruleType: PromotionRuleType,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: {
        promotionId,
        ruleType,
        deletedAt: IsNull(),
      },
    });

    return count > 0;
  }
}
