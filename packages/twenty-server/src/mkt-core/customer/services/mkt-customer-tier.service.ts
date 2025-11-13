import { Injectable, Logger } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

import {
  CustomerTierResult,
  MktCustomerTierCalculationService,
} from './mkt-customer-tier-calculation.service';

@Injectable()
export class MktCustomerTierService {
  private readonly logger = new Logger(MktCustomerTierService.name);

  constructor(
    private readonly mktCustomerTierCalculationService: MktCustomerTierCalculationService,
    private readonly mktRepo: MktRepositoryService,
  ) {}

  async updateCustomerTier(customerId: string): Promise<CustomerTierResult> {
    const tierResult =
      await this.mktCustomerTierCalculationService.calculateCustomerTier(
        customerId,
      );

    const cusRepo = await this.mktRepo.getRepository(
      MktCustomerWorkspaceEntity,
    );

    await cusRepo.update(customerId, {
      tier: tierResult.customerTier,
      totalOrderValue: tierResult.totalOrderValue,
    });

    return tierResult;
  }

  async updateAllCustomerTiers(batchSize = 100): Promise<CustomerTierResult[]> {
    const cusRepo = await this.mktRepo.getRepository(
      MktCustomerWorkspaceEntity,
    );

    const results: CustomerTierResult[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const customers = await cusRepo.find({
        where: { deletedAt: IsNull() },
        take: batchSize,
        skip: offset,
        order: { createdAt: 'ASC' },
      });

      if (customers.length === 0) {
        hasMore = false;
        break;
      }

      this.logger.log(
        `Processing batch ${offset / batchSize + 1}: ${customers.length} customers`,
      );

      for (const customer of customers) {
        try {
          const tierResult =
            await this.mktCustomerTierCalculationService.calculateCustomerTier(
              customer.id,
            );

          await cusRepo.update(customer.id, {
            tier: tierResult.customerTier,
            totalOrderValue: tierResult.totalOrderValue,
          });

          results.push(tierResult);
        } catch (error) {
          this.logger.error(
            `Error updating tier for customer ${customer.id}: ${error.message}`,
          );
          // Continue with next customer
        }
      }

      offset += batchSize;

      if (customers.length < batchSize) {
        hasMore = false;
      }
    }

    this.logger.log(`Completed updating ${results.length} customer tiers`);

    return results;
  }

  async getCustomerTierStatistics(_workspaceId: string): Promise<{
    tierDistribution: Record<MKT_CUSTOMER_TIER, number>;
    totalCustomers: number;
    averageOrderValue: number;
    averageOrderCount: number;
  }> {
    const cusRepo = await this.mktRepo.getRepository(
      MktCustomerWorkspaceEntity,
    );

    const customers = await cusRepo.find();

    const tierDistribution: Record<MKT_CUSTOMER_TIER, number> = {
      [MKT_CUSTOMER_TIER.BRONZE]: 0,
      [MKT_CUSTOMER_TIER.SILVER]: 0,
      [MKT_CUSTOMER_TIER.GOLD]: 0,
      [MKT_CUSTOMER_TIER.DIAMOND]: 0,
      [MKT_CUSTOMER_TIER.DORMANT]: 0,
      [MKT_CUSTOMER_TIER.CHURNED]: 0,
    };

    let totalOrderValue = 0;
    let totalOrderCount = 0;

    for (const customer of customers) {
      if (
        customer.tier &&
        Object.values(MKT_CUSTOMER_TIER).includes(
          customer.tier as MKT_CUSTOMER_TIER,
        )
      ) {
        tierDistribution[customer.tier as MKT_CUSTOMER_TIER]++;
      }

      totalOrderValue += customer.totalOrderValue || 0;

      const orderRepo = await this.mktRepo.getRepository(
        MktOrderWorkspaceEntity,
      );

      const orderCount = await orderRepo.count({
        where: { mktCustomerId: customer.id },
      });

      totalOrderCount += orderCount;
    }

    return {
      tierDistribution,
      totalCustomers: customers.length,
      averageOrderValue:
        customers.length > 0 ? totalOrderValue / customers.length : 0,
      averageOrderCount:
        customers.length > 0 ? totalOrderCount / customers.length : 0,
    };
  }

  async getCustomersByTier(
    tier: MKT_CUSTOMER_TIER,
    limit?: number,
    offset?: number,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const cusRepo = await this.mktRepo.getRepository(
      MktCustomerWorkspaceEntity,
    );

    const queryBuilder = cusRepo
      .createQueryBuilder('customer')
      .where('customer.tier = :tier', { tier })
      .orderBy('customer.totalOrderValue', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    if (offset) {
      queryBuilder.offset(offset);
    }

    return queryBuilder.getMany();
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
