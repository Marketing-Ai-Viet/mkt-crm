import { Injectable, Logger } from '@nestjs/common';

import chunk from 'lodash.chunk';
import keyBy from 'lodash.keyby';

import {
  MKT_CUSTOMER_TIER,
  MKT_CUSTOMER_TIER_THRESHOLDS,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import {
  COMPLETED_ORDER_STATUSES,
  TIER_BULK_PROCESSING_CONFIG,
} from 'src/mkt-core/customer/constants/mkt-customer-tier.constants';
import { TIER_CHANGE_REASON } from 'src/mkt-core/customer/constants/mkt-customer-tier-history.constants';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import {
  CustomerTierResult,
  CustomerTierStatistics,
} from 'src/mkt-core/customer/types';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

import { MktCustomerTierCalculationService } from './mkt-customer-tier-calculation.service';
import { MktCustomerTierHistoryService } from './mkt-customer-tier-history.service';

@Injectable()
export class MktCustomerTierService {
  private readonly logger = new Logger(MktCustomerTierService.name);

  constructor(
    private readonly mktCustomerTierCalculationService: MktCustomerTierCalculationService,
    private readonly customerRepository: MktCustomerRepository,
    private readonly orderRepository: MktOrderRepository,
    private readonly tierHistoryService: MktCustomerTierHistoryService,
  ) {}

  async updateCustomerTier(customerId: string): Promise<CustomerTierResult> {
    const tierResult =
      await this.mktCustomerTierCalculationService.calculateCustomerTier(
        customerId,
      );

    await this.customerRepository.update(customerId, {
      tier: tierResult.customerTier,
      totalOrderValue: tierResult.totalOrderValue,
    });

    return tierResult;
  }

  /**
   * Update all customer tiers using bulk aggregation and parallel updates
   * Optimized: 1 query per batch instead of N queries
   */
  async updateAllCustomerTiers(
    batchSize = TIER_BULK_PROCESSING_CONFIG.BATCH_SIZE,
  ): Promise<CustomerTierResult[]> {
    const results: CustomerTierResult[] = [];
    let offset = 0;
    let hasMore = true;
    let batchNumber = 0;

    while (hasMore) {
      const customers = await this.customerRepository.findAll(undefined, {
        take: batchSize,
        skip: offset,
        order: { createdAt: 'ASC' },
      });

      if (customers.length === 0) {
        hasMore = false;
        break;
      }

      batchNumber++;
      this.logger.log(
        CUSTOMER_MESSAGES.LOG.BATCH_PROCESS_START(
          batchNumber,
          customers.length,
        ),
      );

      const customerIds = customers.map((c) => c.id);

      // Bulk aggregation query - 1 query for all customers in batch
      const tierResults =
        await this.mktCustomerTierCalculationService.calculateBulkCustomerTiers(
          customerIds,
        );

      // Parallel updates with concurrency control
      const updateChunks = chunk(
        customerIds,
        TIER_BULK_PROCESSING_CONFIG.CONCURRENCY,
      );

      for (const updateBatch of updateChunks) {
        const updatePromises = updateBatch.map(async (customerId) => {
          const tierResult = tierResults.get(customerId);

          if (!tierResult) {
            this.logger.warn(
              `No tier result found for customer ${customerId}, skipping`,
            );

            return null;
          }

          try {
            await this.customerRepository.update(customerId, {
              tier: tierResult.customerTier,
              totalOrderValue: tierResult.totalOrderValue,
            });

            return tierResult;
          } catch (error) {
            this.logger.error(
              CUSTOMER_MESSAGES.ERROR.TIER_UPDATE_FAILED(customerId),
              error instanceof Error ? error.stack : String(error),
            );

            return null;
          }
        });

        const batchResults = await Promise.all(updatePromises);

        for (const result of batchResults) {
          if (result) {
            results.push(result);
          }
        }
      }

      offset += batchSize;

      if (customers.length < batchSize) {
        hasMore = false;
      }
    }

    this.logger.log(
      CUSTOMER_MESSAGES.LOG.BATCH_PROCESS_COMPLETE(results.length),
    );

    return results;
  }

  /**
   * Update all customer tiers for a specific workspace
   * Thread-safe: Uses workspace-specific repositories
   * Optimized: Bulk aggregation query + parallel updates
   *
   * @param workspaceId - Target workspace ID
   * @param batchSize - Number of customers per batch
   * @returns Array of tier update results
   */
  async updateAllCustomerTiersForWorkspace(
    workspaceId: string,
    batchSize = TIER_BULK_PROCESSING_CONFIG.BATCH_SIZE,
  ): Promise<CustomerTierResult[]> {
    this.logger.log(`🚀 Starting tier update for workspace ${workspaceId}`);

    const results: CustomerTierResult[] = [];
    let offset = 0;
    let hasMore = true;
    let batchNumber = 0;

    while (hasMore) {
      // Get customers using repository with explicit workspaceId
      const customers = await this.customerRepository.findAllWithPagination(
        workspaceId,
        { take: batchSize, skip: offset },
      );

      if (customers.length === 0) {
        hasMore = false;
        break;
      }

      batchNumber++;
      this.logger.log(
        CUSTOMER_MESSAGES.LOG.BATCH_PROCESS_START(
          batchNumber,
          customers.length,
        ),
      );

      const customerIds = customers.map((c) => c.id);

      // Bulk aggregation query using repository
      const orderStats =
        await this.orderRepository.getCompletedOrderStatsByCustomers(
          workspaceId,
          customerIds,
          COMPLETED_ORDER_STATUSES,
        );

      // Create lookup map for O(1) access
      const orderStatsMap = keyBy(orderStats, 'customerId');

      // Get customer names
      const customerNameMap =
        await this.customerRepository.getCustomerNamesByIds(
          workspaceId,
          customerIds,
        );

      // Create customer tier map for change detection
      const customerTierMap = new Map(
        customers.map((c) => [c.id, c.tier as MKT_CUSTOMER_TIER | null]),
      );

      // Calculate tiers and prepare updates
      const updates: Array<{
        customerId: string;
        tier: string;
        totalOrderValue: number;
      }> = [];

      // Track tier changes for history logging
      const tierChanges: Array<{
        customerId: string;
        previousTier: MKT_CUSTOMER_TIER | null;
        newTier: MKT_CUSTOMER_TIER;
        metadata: { orderValue: number; orderCount: number };
      }> = [];

      for (const customerId of customerIds) {
        const stats = orderStatsMap[customerId];
        const totalOrderValue = stats?.totalValue ?? 0;
        const totalOrderCount = stats?.orderCount ?? 0;

        const tier = this.determineTier(totalOrderValue, totalOrderCount);
        const customerName = customerNameMap.get(customerId) ?? '';
        const previousTier = customerTierMap.get(customerId);

        updates.push({
          customerId,
          tier,
          totalOrderValue,
        });

        results.push({
          customerId,
          customerName,
          customerTier: tier,
          totalOrderValue,
          totalOrderCount,
        });

        // Track tier change if different
        if (previousTier !== tier) {
          tierChanges.push({
            customerId,
            previousTier: previousTier ?? null,
            newTier: tier,
            metadata: {
              orderValue: totalOrderValue,
              orderCount: totalOrderCount,
            },
          });
        }
      }

      // Parallel batch updates using repository
      const updateChunks = chunk(
        updates,
        TIER_BULK_PROCESSING_CONFIG.CONCURRENCY,
      );

      for (const updateBatch of updateChunks) {
        await this.customerRepository.bulkUpdateTiers(workspaceId, updateBatch);
      }

      // Log tier changes to history
      if (tierChanges.length > 0) {
        await this.tierHistoryService.bulkLogTierChanges(
          workspaceId,
          tierChanges.map((change) => ({
            customerId: change.customerId,
            previousTier: change.previousTier,
            newTier: change.newTier,
            reason: TIER_CHANGE_REASON.CRON_RECALCULATION,
            metadata: change.metadata,
          })),
        );

        this.logger.log(
          `Logged ${tierChanges.length} tier changes for batch ${batchNumber}`,
        );
      }

      offset += batchSize;

      if (customers.length < batchSize) {
        hasMore = false;
      }
    }

    this.logger.log(
      `✅ Completed tier update for workspace ${workspaceId}: ${results.length} customers processed`,
    );

    return results;
  }

  /**
   * Determine tier based on order value and count
   * Uses centralized thresholds from constants
   */
  private determineTier(
    totalOrderValue: number,
    totalOrderCount: number,
  ): MKT_CUSTOMER_TIER {
    const { DIAMOND, GOLD, SILVER, BRONZE } = MKT_CUSTOMER_TIER_THRESHOLDS;

    if (
      MoneyUtils.greaterThanOrEqual(totalOrderValue, DIAMOND.minSpending) &&
      totalOrderCount >= DIAMOND.minOrders
    ) {
      return MKT_CUSTOMER_TIER.DIAMOND;
    }

    if (
      MoneyUtils.greaterThanOrEqual(totalOrderValue, GOLD.minSpending) &&
      totalOrderCount >= GOLD.minOrders
    ) {
      return MKT_CUSTOMER_TIER.GOLD;
    }

    if (
      MoneyUtils.greaterThanOrEqual(totalOrderValue, SILVER.minSpending) &&
      totalOrderCount >= SILVER.minOrders
    ) {
      return MKT_CUSTOMER_TIER.SILVER;
    }

    if (
      MoneyUtils.greaterThanOrEqual(totalOrderValue, BRONZE.minSpending) &&
      totalOrderCount >= BRONZE.minOrders
    ) {
      return MKT_CUSTOMER_TIER.BRONZE;
    }

    return MKT_CUSTOMER_TIER.BRONZE;
  }

  /**
   * Get customer tier statistics - FIXED N+1 QUERY
   * Uses single aggregation query instead of loop
   */
  async getCustomerTierStatistics(
    workspaceId: string,
  ): Promise<CustomerTierStatistics> {
    this.logger.log(CUSTOMER_MESSAGES.LOG.TIER_STATS_START(workspaceId));

    // Single query to get all customers
    const customers = await this.customerRepository.findAll(workspaceId);

    if (customers.length === 0) {
      return {
        tierDistribution: this.initTierDistribution(),
        totalCustomers: 0,
        averageOrderValue: 0,
        averageOrderCount: 0,
      };
    }

    // Single aggregation query for all order stats - FIXES N+1
    const customerIds = customers.map((c) => c.id);
    const orderStats = await this.orderRepository.getOrderStatsByCustomers(
      workspaceId,
      customerIds,
    );

    // Create lookup map for O(1) access
    const orderStatsMap = keyBy(orderStats, 'customerId');

    // Calculate tier distribution and totals
    const tierDistribution = this.initTierDistribution();
    let totalOrderValue = 0;
    let totalOrderCount = 0;

    for (const customer of customers) {
      // Update tier distribution
      const tier = customer.tier as MKT_CUSTOMER_TIER;

      if (tier && tierDistribution[tier] !== undefined) {
        tierDistribution[tier]++;
      }

      // Get order stats from map (no additional query)
      const stats = orderStatsMap[customer.id];

      if (stats) {
        totalOrderValue = MoneyUtils.add(
          totalOrderValue,
          stats.totalValue,
        ).toNumber();
        totalOrderCount += stats.orderCount;
      }
    }

    const customerCount = customers.length;

    return {
      tierDistribution,
      totalCustomers: customerCount,
      averageOrderValue: MoneyUtils.divideSafe(
        totalOrderValue,
        customerCount,
      ).toNumber(),
      averageOrderCount: MoneyUtils.divideSafe(
        totalOrderCount,
        customerCount,
      ).toNumber(),
    };
  }

  private initTierDistribution(): Record<MKT_CUSTOMER_TIER, number> {
    return {
      [MKT_CUSTOMER_TIER.BRONZE]: 0,
      [MKT_CUSTOMER_TIER.SILVER]: 0,
      [MKT_CUSTOMER_TIER.GOLD]: 0,
      [MKT_CUSTOMER_TIER.DIAMOND]: 0,
      [MKT_CUSTOMER_TIER.DORMANT]: 0,
      [MKT_CUSTOMER_TIER.CHURNED]: 0,
    };
  }

  async getCustomersByTier(
    tier: MKT_CUSTOMER_TIER,
    limit?: number,
    offset?: number,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    return this.customerRepository.findByTier(tier, undefined, {
      limit,
      offset,
    });
  }

  async checkCustomerUpgradeEligibility(customerId: string): Promise<{
    currentTier: MKT_CUSTOMER_TIER;
    canUpgrade: boolean;
    nextTier?: MKT_CUSTOMER_TIER;
    requirements?: string;
  }> {
    const tierResult =
      await this.mktCustomerTierCalculationService.calculateCustomerTier(
        customerId,
      );

    const upgradeInfo =
      this.mktCustomerTierCalculationService.checkUpgradeEligibility(
        tierResult.customerTier,
        tierResult.totalOrderValue,
        tierResult.totalOrderCount,
      );

    return {
      currentTier: tierResult.customerTier,
      ...upgradeInfo,
    };
  }
}
