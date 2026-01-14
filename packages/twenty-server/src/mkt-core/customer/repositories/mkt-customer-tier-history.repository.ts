import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  MKT_TIER_HISTORY_LOG_CONTEXT,
  TierChangeReason,
  TIER_HISTORY_DEFAULT_LIMIT,
} from 'src/mkt-core/customer/constants/mkt-customer-tier-history.constants';
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerTierHistoryWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tier-history.workspace-entity';

/**
 * Data for creating tier history record
 */
export type CreateTierHistoryData = {
  customerId: string;
  previousTier: MKT_CUSTOMER_TIER | null;
  newTier: MKT_CUSTOMER_TIER;
  reason: TierChangeReason;
  orderValueAtChange?: number;
  orderCountAtChange?: number;
};

/**
 * Options for querying tier history
 */
export type TierHistoryQueryOptions = {
  limit?: number;
  offset?: number;
};

/**
 * Tier change statistics by reason
 */
export type TierChangeStatsByReason = {
  reason: TierChangeReason;
  count: number;
};

/**
 * MktCustomerTierHistoryRepository - Data access layer for Tier History entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktCustomerTierHistory entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Service layer)
 */
@Injectable()
export class MktCustomerTierHistoryRepository extends BaseWorkspaceRepository<MktCustomerTierHistoryWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktCustomerTierHistoryWorkspaceEntity,
      `${MKT_TIER_HISTORY_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create tier history record
   */
  async createTierHistory(
    data: CreateTierHistoryData,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity> {
    const repository = await this.getRepository();

    const historyRecord = repository.create({
      customerId: data.customerId,
      previousTier: data.previousTier,
      newTier: data.newTier,
      reason: data.reason,
      orderValueAtChange: data.orderValueAtChange ?? 0,
      orderCountAtChange: data.orderCountAtChange ?? 0,
    });

    const saved = await repository.save(historyRecord);

    this.logger.debug(
      `Created tier history for customer ${data.customerId}: ${data.previousTier} -> ${data.newTier} (${data.reason})`,
    );

    return saved;
  }

  /**
   * Bulk create tier history records
   */
  async bulkCreateTierHistory(
    records: CreateTierHistoryData[],
  ): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    const repository = await this.getRepository();

    const historyRecords = records.map((data) =>
      repository.create({
        customerId: data.customerId,
        previousTier: data.previousTier,
        newTier: data.newTier,
        reason: data.reason,
        orderValueAtChange: data.orderValueAtChange ?? 0,
        orderCountAtChange: data.orderCountAtChange ?? 0,
      }),
    );

    await repository.save(historyRecords);

    this.logger.debug(`Bulk created ${records.length} tier history records`);

    return records.length;
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Get tier history for a customer
   */
  async findByCustomerId(
    customerId: string,
    options?: TierHistoryQueryOptions,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { customerId },
      take: options?.limit ?? TIER_HISTORY_DEFAULT_LIMIT,
      skip: options?.offset ?? 0,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get latest tier change for a customer
   */
  async findLatestByCustomerId(
    customerId: string,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all tier history with pagination
   */
  async findAllHistory(
    options?: TierHistoryQueryOptions,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      take: options?.limit ?? TIER_HISTORY_DEFAULT_LIMIT,
      skip: options?.offset ?? 0,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get tier change history within a date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: TierHistoryQueryOptions,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('history')
      .where('history.createdAt >= :startDate', { startDate })
      .andWhere('history.createdAt <= :endDate', { endDate })
      .orderBy('history.createdAt', 'DESC')
      .take(options?.limit ?? TIER_HISTORY_DEFAULT_LIMIT)
      .skip(options?.offset ?? 0)
      .getMany();
  }

  // ============================================
  // COUNT OPERATIONS
  // ============================================

  /**
   * Count tier changes for a customer
   */
  async countByCustomerId(customerId: string): Promise<number> {
    const repository = await this.getRepository();

    return repository.count({ where: { customerId } });
  }

  /**
   * Count total tier changes
   */
  async countAll(): Promise<number> {
    const repository = await this.getRepository();

    return repository.count();
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get tier change statistics by reason
   */
  async getStatsByReason(): Promise<TierChangeStatsByReason[]> {
    const repository = await this.getRepository();

    const results = await repository
      .createQueryBuilder('history')
      .select('history.reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('history.reason')
      .getRawMany();

    return results.map((r) => ({
      reason: r.reason as TierChangeReason,
      count: parseInt(r.count, 10) || 0,
    }));
  }

  /**
   * Get upgrade/downgrade counts
   * Returns counts of tier changes that resulted in upgrades vs downgrades
   */
  async getUpgradeDowngradeCounts(): Promise<{
    upgradeCount: number;
    downgradeCount: number;
  }> {
    const repository = await this.getRepository();

    // Define tier order for comparison
    const tierOrder: MKT_CUSTOMER_TIER[] = [
      MKT_CUSTOMER_TIER.CHURNED,
      MKT_CUSTOMER_TIER.DORMANT,
      MKT_CUSTOMER_TIER.BRONZE,
      MKT_CUSTOMER_TIER.SILVER,
      MKT_CUSTOMER_TIER.GOLD,
      MKT_CUSTOMER_TIER.DIAMOND,
    ];

    const allChanges = await repository.find({
      select: ['previousTier', 'newTier'],
    });

    let upgradeCount = 0;
    let downgradeCount = 0;

    for (const change of allChanges) {
      const prevIndex = change.previousTier
        ? tierOrder.indexOf(change.previousTier)
        : -1;
      const newIndex = tierOrder.indexOf(change.newTier);

      if (newIndex > prevIndex) {
        upgradeCount++;
      } else if (newIndex < prevIndex) {
        downgradeCount++;
      }
    }

    return { upgradeCount, downgradeCount };
  }
}
