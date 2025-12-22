import { Injectable, Logger } from '@nestjs/common';

import keyBy from 'lodash.keyby';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { CustomerTierStatistics } from 'src/mkt-core/customer/types';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

import {
  CustomerTierResult,
  MktCustomerTierCalculationService,
} from './mkt-customer-tier-calculation.service';

@Injectable()
export class MktCustomerTierService {
  private readonly logger = new Logger(MktCustomerTierService.name);

  constructor(
    private readonly mktCustomerTierCalculationService: MktCustomerTierCalculationService,
    private readonly customerRepository: MktCustomerRepository,
    private readonly orderRepository: MktOrderRepository,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
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

  async updateAllCustomerTiers(batchSize = 100): Promise<CustomerTierResult[]> {
    const results: CustomerTierResult[] = [];
    let offset = 0;
    let hasMore = true;

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

      this.logger.log(
        CUSTOMER_MESSAGES.LOG.BATCH_PROCESS_START(
          offset / batchSize + 1,
          customers.length,
        ),
      );

      for (const customer of customers) {
        try {
          const tierResult =
            await this.mktCustomerTierCalculationService.calculateCustomerTier(
              customer.id,
            );

          await this.customerRepository.update(customer.id, {
            tier: tierResult.customerTier,
            totalOrderValue: tierResult.totalOrderValue,
          });

          results.push(tierResult);
        } catch (error) {
          this.logger.error(
            CUSTOMER_MESSAGES.ERROR.TIER_UPDATE_FAILED(customer.id),
            error instanceof Error ? error.stack : String(error),
          );
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
