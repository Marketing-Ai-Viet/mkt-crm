import { Injectable, Logger } from '@nestjs/common';

import {
  MKT_TIER_HISTORY_LOG_CONTEXT,
  TIER_CHANGE_REASON,
  TierChangeReason,
} from 'src/mkt-core/customer/constants/mkt-customer-tier-history.constants';
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerTierHistoryWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer-tier-history.workspace-entity';
import {
  MktCustomerTierHistoryRepository,
  TierHistoryQueryOptions,
} from 'src/mkt-core/customer/repositories/mkt-customer-tier-history.repository';

/**
 * Tier order for comparison (lowest to highest)
 */
const TIER_ORDER: MKT_CUSTOMER_TIER[] = [
  MKT_CUSTOMER_TIER.CHURNED,
  MKT_CUSTOMER_TIER.DORMANT,
  MKT_CUSTOMER_TIER.BRONZE,
  MKT_CUSTOMER_TIER.SILVER,
  MKT_CUSTOMER_TIER.GOLD,
  MKT_CUSTOMER_TIER.DIAMOND,
];

/**
 * Metadata for tier change (order metrics)
 */
export type TierChangeMetadata = {
  orderValue: number;
  orderCount: number;
};

/**
 * Tier change statistics
 */
export type TierChangeStats = {
  totalChanges: number;
  upgradeCount: number;
  downgradeCount: number;
  changesByReason: Array<{ reason: TierChangeReason; count: number }>;
};

/**
 * MktCustomerTierHistoryService
 *
 * Business logic for tier history operations
 * Uses repository pattern for data access
 */
@Injectable()
export class MktCustomerTierHistoryService {
  private readonly logger = new Logger(
    `${MKT_TIER_HISTORY_LOG_CONTEXT}:Service`,
  );

  constructor(
    private readonly tierHistoryRepository: MktCustomerTierHistoryRepository,
  ) {}

  // ============================================
  // TIER CHANGE LOGGING
  // ============================================

  /**
   * Log tier change to history
   * Only logs when tier actually changed
   *
   * @param workspaceId - Workspace ID
   * @param customerId - Customer ID
   * @param previousTier - Previous tier (null for initial assignment)
   * @param newTier - New tier
   * @param reason - Reason for change
   * @param metadata - Optional order metrics at time of change
   */
  async logTierChange(
    workspaceId: string,
    customerId: string,
    previousTier: MKT_CUSTOMER_TIER | null,
    newTier: MKT_CUSTOMER_TIER,
    reason: TierChangeReason,
    metadata?: TierChangeMetadata,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity | null> {
    // Skip if tier didn't change
    if (previousTier === newTier) {
      this.logger.debug(
        `Skipping tier history: no change for customer ${customerId} (${previousTier})`,
      );

      return null;
    }

    const changeType = this.getChangeType(previousTier, newTier);

    this.logger.log(
      `Recording tier ${changeType} for customer ${customerId}: ${previousTier ?? 'null'} -> ${newTier} (${reason})`,
    );

    return this.tierHistoryRepository.create(workspaceId, {
      customerId,
      previousTier,
      newTier,
      reason,
      orderValueAtChange: metadata?.orderValue ?? 0,
      orderCountAtChange: metadata?.orderCount ?? 0,
    });
  }

  /**
   * Log tier change from order completion
   */
  async logOrderCompletedTierChange(
    workspaceId: string,
    customerId: string,
    previousTier: MKT_CUSTOMER_TIER | null,
    newTier: MKT_CUSTOMER_TIER,
    metadata: TierChangeMetadata,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity | null> {
    return this.logTierChange(
      workspaceId,
      customerId,
      previousTier,
      newTier,
      TIER_CHANGE_REASON.ORDER_COMPLETED,
      metadata,
    );
  }

  /**
   * Log tier change from cron recalculation
   */
  async logCronTierChange(
    workspaceId: string,
    customerId: string,
    previousTier: MKT_CUSTOMER_TIER | null,
    newTier: MKT_CUSTOMER_TIER,
    metadata: TierChangeMetadata,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity | null> {
    return this.logTierChange(
      workspaceId,
      customerId,
      previousTier,
      newTier,
      TIER_CHANGE_REASON.CRON_RECALCULATION,
      metadata,
    );
  }

  /**
   * Log tier change from manual update
   */
  async logManualTierChange(
    workspaceId: string,
    customerId: string,
    previousTier: MKT_CUSTOMER_TIER | null,
    newTier: MKT_CUSTOMER_TIER,
    metadata?: TierChangeMetadata,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity | null> {
    return this.logTierChange(
      workspaceId,
      customerId,
      previousTier,
      newTier,
      TIER_CHANGE_REASON.MANUAL_UPDATE,
      metadata,
    );
  }

  /**
   * Log tier change from inactivity downgrade
   */
  async logInactivityDowngrade(
    workspaceId: string,
    customerId: string,
    previousTier: MKT_CUSTOMER_TIER,
    newTier: MKT_CUSTOMER_TIER,
    metadata?: TierChangeMetadata,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity | null> {
    return this.logTierChange(
      workspaceId,
      customerId,
      previousTier,
      newTier,
      TIER_CHANGE_REASON.INACTIVITY_DOWNGRADE,
      metadata,
    );
  }

  /**
   * Log initial tier assignment (new customer)
   */
  async logInitialTierAssignment(
    workspaceId: string,
    customerId: string,
    tier: MKT_CUSTOMER_TIER,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity | null> {
    return this.logTierChange(
      workspaceId,
      customerId,
      null,
      tier,
      TIER_CHANGE_REASON.INITIAL_ASSIGNMENT,
    );
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Bulk log tier changes (for cron batch processing)
   */
  async bulkLogTierChanges(
    workspaceId: string,
    changes: Array<{
      customerId: string;
      previousTier: MKT_CUSTOMER_TIER | null;
      newTier: MKT_CUSTOMER_TIER;
      reason: TierChangeReason;
      metadata?: TierChangeMetadata;
    }>,
  ): Promise<number> {
    // Filter out unchanged tiers
    const actualChanges = changes.filter(
      (change) => change.previousTier !== change.newTier,
    );

    if (actualChanges.length === 0) {
      return 0;
    }

    const records = actualChanges.map((change) => ({
      customerId: change.customerId,
      previousTier: change.previousTier,
      newTier: change.newTier,
      reason: change.reason,
      orderValueAtChange: change.metadata?.orderValue ?? 0,
      orderCountAtChange: change.metadata?.orderCount ?? 0,
    }));

    const count = await this.tierHistoryRepository.bulkCreate(
      workspaceId,
      records,
    );

    this.logger.log(
      `Bulk logged ${count} tier changes for workspace ${workspaceId}`,
    );

    return count;
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Get tier history for a customer
   */
  async getTierHistory(
    workspaceId: string,
    customerId: string,
    options?: TierHistoryQueryOptions,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity[]> {
    return this.tierHistoryRepository.findByCustomerId(
      workspaceId,
      customerId,
      options,
    );
  }

  /**
   * Get latest tier change for a customer
   */
  async getLatestTierChange(
    workspaceId: string,
    customerId: string,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity | null> {
    return this.tierHistoryRepository.findLatestByCustomerId(
      workspaceId,
      customerId,
    );
  }

  /**
   * Get tier history within a date range
   */
  async getTierHistoryByDateRange(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    options?: TierHistoryQueryOptions,
  ): Promise<MktCustomerTierHistoryWorkspaceEntity[]> {
    return this.tierHistoryRepository.findByDateRange(
      workspaceId,
      startDate,
      endDate,
      options,
    );
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get tier change statistics for workspace
   */
  async getTierChangeStats(workspaceId: string): Promise<TierChangeStats> {
    const [statsByReason, upgradeCounts, totalCount] = await Promise.all([
      this.tierHistoryRepository.getStatsByReason(workspaceId),
      this.tierHistoryRepository.getUpgradeDowngradeCounts(workspaceId),
      this.tierHistoryRepository.count(workspaceId),
    ]);

    return {
      totalChanges: totalCount,
      upgradeCount: upgradeCounts.upgradeCount,
      downgradeCount: upgradeCounts.downgradeCount,
      changesByReason: statsByReason,
    };
  }

  /**
   * Get tier change count for a customer
   */
  async getCustomerTierChangeCount(
    workspaceId: string,
    customerId: string,
  ): Promise<number> {
    return this.tierHistoryRepository.countByCustomerId(
      workspaceId,
      customerId,
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Determine if tier change is upgrade, downgrade, or lateral
   */
  private getChangeType(
    previousTier: MKT_CUSTOMER_TIER | null,
    newTier: MKT_CUSTOMER_TIER,
  ): 'upgrade' | 'downgrade' | 'lateral' | 'initial' {
    if (previousTier === null) {
      return 'initial';
    }

    const prevIndex = TIER_ORDER.indexOf(previousTier);
    const newIndex = TIER_ORDER.indexOf(newTier);

    if (newIndex > prevIndex) {
      return 'upgrade';
    }

    if (newIndex < prevIndex) {
      return 'downgrade';
    }

    return 'lateral';
  }

  /**
   * Compare two tiers
   * Returns: positive if tier1 > tier2, negative if tier1 < tier2, 0 if equal
   */
  compareTiers(tier1: MKT_CUSTOMER_TIER, tier2: MKT_CUSTOMER_TIER): number {
    return TIER_ORDER.indexOf(tier1) - TIER_ORDER.indexOf(tier2);
  }

  /**
   * Check if tier1 is higher than tier2
   */
  isHigherTier(tier1: MKT_CUSTOMER_TIER, tier2: MKT_CUSTOMER_TIER): boolean {
    return this.compareTiers(tier1, tier2) > 0;
  }

  /**
   * Check if tier1 is lower than tier2
   */
  isLowerTier(tier1: MKT_CUSTOMER_TIER, tier2: MKT_CUSTOMER_TIER): boolean {
    return this.compareTiers(tier1, tier2) < 0;
  }
}
