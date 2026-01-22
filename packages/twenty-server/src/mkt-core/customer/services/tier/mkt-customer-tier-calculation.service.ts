import { Injectable, Logger } from '@nestjs/common';

import chunk from 'lodash.chunk';

import {
  MKT_CUSTOMER_TIER,
  MKT_CUSTOMER_TIER_THRESHOLDS,
} from 'src/mkt-core/customer/constants/mkt-customer.constant';
import {
  COMPLETED_ORDER_STATUSES,
  TIER_BULK_PROCESSING_CONFIG,
} from 'src/mkt-core/customer/constants/mkt-customer-tier.constants';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import {
  BulkCustomerTierResult,
  CustomerOrderAggregation,
  CustomerTierResult,
} from 'src/mkt-core/customer/types';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

@Injectable()
export class MktCustomerTierCalculationService {
  private readonly logger = new Logger(MktCustomerTierCalculationService.name);

  constructor(
    private readonly customerRepository: MktCustomerRepository,
    private readonly orderRepository: MktOrderRepository,
  ) {}

  async calculateCustomerTier(
    customerId: string,
    options: {
      includeOnlyCompletedOrders?: boolean | null;
      completedStatuses?: string[] | null;
    } = {},
  ): Promise<CustomerTierResult> {
    const cusRepo = await this.customerRepository.getRepository();
    const orderRepo = await this.orderRepository.getRepository();

    const customer = await cusRepo.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error(CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId));
    }

    const {
      includeOnlyCompletedOrders = true,
      completedStatuses = ['COMPLETED'],
    } = options;

    let queryBuilder = orderRepo
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalOrderValue')
      .where('order.mktCustomerId = :customerId', { customerId });

    if (includeOnlyCompletedOrders && completedStatuses?.length) {
      queryBuilder = queryBuilder.andWhere('order.status IN (:...statuses)', {
        statuses: completedStatuses,
      });
    }

    const orderStats = await queryBuilder.getRawOne();

    const totalOrderCount = parseInt(orderStats.totalOrderCount) || 0;
    const totalOrderValue = parseFloat(orderStats.totalOrderValue) || 0;

    this.logger.log(
      `Customer ID: ${customerId}, Total Order Value: ${totalOrderValue}, Total Order Count: ${totalOrderCount}`,
    );

    const customerTier = this.determineTier(totalOrderValue, totalOrderCount);

    return {
      customerTier,
      totalOrderValue,
      totalOrderCount,
      customerId,
      customerName: customer.name,
    };
  }

  getCompletedOrderStatuses(): string[] {
    return ['COMPLETED', 'DELIVERED', 'PAID', 'FINISHED', 'SUCCESS'];
  }

  async calculateCustomerTierFromCompletedOrders(
    customerId: string,
  ): Promise<CustomerTierResult> {
    return this.calculateCustomerTier(customerId, {
      includeOnlyCompletedOrders: true,
      completedStatuses: this.getCompletedOrderStatuses(),
    });
  }

  async calculateCustomerTierFromAllOrders(
    customerId: string,
  ): Promise<CustomerTierResult> {
    return this.calculateCustomerTier(customerId, {
      includeOnlyCompletedOrders: false,
    });
  }

  /**
   * Calculate tiers for multiple customers in a single bulk query
   * Optimized: 1 query for N customers instead of N queries
   *
   * @param customerIds - Array of customer IDs to calculate tiers for
   * @returns Map of customerId -> CustomerTierResult
   */
  async calculateBulkCustomerTiers(
    customerIds: string[],
  ): Promise<BulkCustomerTierResult> {
    if (customerIds.length === 0) {
      return new Map();
    }

    const cusRepo = await this.customerRepository.getRepository();
    const orderRepo = await this.orderRepository.getRepository();

    const results: BulkCustomerTierResult = new Map();
    const batches = chunk(customerIds, TIER_BULK_PROCESSING_CONFIG.BATCH_SIZE);

    for (const batchIds of batches) {
      // Get customer names for this batch
      const customers = await cusRepo.find({
        where: batchIds.map((id) => ({ id })),
        select: ['id', 'name'],
      });

      const customerNameMap = new Map(
        customers.map((c) => [c.id, c.name ?? '']),
      );

      // Bulk aggregation query - 1 query for all customers in batch
      const aggregations = await orderRepo
        .createQueryBuilder('order')
        .select('order.mktCustomerId', 'customerId')
        .addSelect('COUNT(order.id)', 'totalOrderCount')
        .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalOrderValue')
        .where('order.mktCustomerId IN (:...customerIds)', {
          customerIds: batchIds,
        })
        .andWhere('order.status IN (:...statuses)', {
          statuses: COMPLETED_ORDER_STATUSES,
        })
        .groupBy('order.mktCustomerId')
        .getRawMany<CustomerOrderAggregation>();

      // Create a map for quick lookup
      const aggregationMap = new Map(
        aggregations.map((agg) => [agg.customerId, agg]),
      );

      // Process each customer in batch
      for (const customerId of batchIds) {
        const aggregation = aggregationMap.get(customerId);
        const customerName = customerNameMap.get(customerId) ?? '';

        const totalOrderCount = aggregation
          ? parseInt(aggregation.totalOrderCount, 10) || 0
          : 0;
        const totalOrderValue = aggregation
          ? parseFloat(aggregation.totalOrderValue) || 0
          : 0;

        const customerTier = this.determineTier(
          totalOrderValue,
          totalOrderCount,
        );

        results.set(customerId, {
          customerId,
          customerName,
          customerTier,
          totalOrderCount,
          totalOrderValue,
        });
      }

      this.logger.debug(
        `Processed batch of ${batchIds.length} customers, total aggregations: ${aggregations.length}`,
      );
    }

    return results;
  }

  calculateCustomerTierFromData(
    mktCustomer: MktCustomerWorkspaceEntity,
    mktOrders: MktOrderWorkspaceEntity[],
  ): CustomerTierResult {
    const totalOrderValue = this.calculateTotalOrderValue(mktOrders);

    const totalOrderCount = mktOrders.length;

    const customerTier = this.determineTier(totalOrderValue, totalOrderCount);

    return {
      customerTier,
      totalOrderValue,
      totalOrderCount,
      customerId: mktCustomer.id,
      customerName: mktCustomer.name,
    };
  }

  private calculateTotalOrderValue(
    mktOrders: MktOrderWorkspaceEntity[],
  ): number {
    return MoneyUtils.sumBy(mktOrders, 'totalAmount').toNumber();
  }

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

  getTierCriteria(): Record<
    MKT_CUSTOMER_TIER,
    { spending: string; orders: string; description: string }
  > {
    return {
      [MKT_CUSTOMER_TIER.BRONZE]: {
        spending: '500,000 - 1,999,999 VND',
        orders: '1-4 đơn',
        description: 'Khách hàng mới/cơ bản',
      },
      [MKT_CUSTOMER_TIER.SILVER]: {
        spending: '2,000,000 - 4,999,999 VND',
        orders: '5-9 đơn',
        description: 'Khách hàng ổn định',
      },
      [MKT_CUSTOMER_TIER.GOLD]: {
        spending: '5,000,000 - 9,999,999 VND',
        orders: '10-19 đơn',
        description: 'Khách hàng trung thành cao',
      },
      [MKT_CUSTOMER_TIER.DIAMOND]: {
        spending: '≥ 10,000,000 VND',
        orders: '≥ 20 đơn',
        description: 'Khách hàng VIP cao cấp nhất',
      },
      [MKT_CUSTOMER_TIER.DORMANT]: {
        spending: 'N/A',
        orders: 'N/A',
        description: 'Khách hàng không hoạt động',
      },
      [MKT_CUSTOMER_TIER.CHURNED]: {
        spending: 'N/A',
        orders: 'N/A',
        description: 'Khách hàng đã rời bỏ',
      },
    };
  }

  checkUpgradeEligibility(
    currentTier: MKT_CUSTOMER_TIER,
    totalOrderValue: number,
    totalOrderCount: number,
  ): {
    canUpgrade: boolean;
    nextTier?: MKT_CUSTOMER_TIER;
    requirements?: string;
  } {
    const { SILVER, GOLD, DIAMOND } = MKT_CUSTOMER_TIER_THRESHOLDS;

    switch (currentTier) {
      case MKT_CUSTOMER_TIER.BRONZE: {
        if (
          MoneyUtils.greaterThanOrEqual(totalOrderValue, SILVER.minSpending) &&
          totalOrderCount >= SILVER.minOrders
        ) {
          return { canUpgrade: true, nextTier: MKT_CUSTOMER_TIER.SILVER };
        }

        const remainingSpending = MoneyUtils.subtract(
          SILVER.minSpending,
          totalOrderValue,
        ).toNumber();
        const remainingOrders = Math.max(0, SILVER.minOrders - totalOrderCount);

        return {
          canUpgrade: false,
          requirements: CUSTOMER_MESSAGES.INFO.UPGRADE_REQUIREMENTS(
            Math.max(0, remainingSpending),
            remainingOrders,
            'Bạc',
          ),
        };
      }

      case MKT_CUSTOMER_TIER.SILVER: {
        if (
          MoneyUtils.greaterThanOrEqual(totalOrderValue, GOLD.minSpending) &&
          totalOrderCount >= GOLD.minOrders
        ) {
          return { canUpgrade: true, nextTier: MKT_CUSTOMER_TIER.GOLD };
        }

        const remainingSpending = MoneyUtils.subtract(
          GOLD.minSpending,
          totalOrderValue,
        ).toNumber();
        const remainingOrders = Math.max(0, GOLD.minOrders - totalOrderCount);

        return {
          canUpgrade: false,
          requirements: CUSTOMER_MESSAGES.INFO.UPGRADE_REQUIREMENTS(
            Math.max(0, remainingSpending),
            remainingOrders,
            'Vàng',
          ),
        };
      }

      case MKT_CUSTOMER_TIER.GOLD: {
        if (
          MoneyUtils.greaterThanOrEqual(totalOrderValue, DIAMOND.minSpending) &&
          totalOrderCount >= DIAMOND.minOrders
        ) {
          return { canUpgrade: true, nextTier: MKT_CUSTOMER_TIER.DIAMOND };
        }

        const remainingSpending = MoneyUtils.subtract(
          DIAMOND.minSpending,
          totalOrderValue,
        ).toNumber();
        const remainingOrders = Math.max(
          0,
          DIAMOND.minOrders - totalOrderCount,
        );

        return {
          canUpgrade: false,
          requirements: CUSTOMER_MESSAGES.INFO.UPGRADE_REQUIREMENTS(
            Math.max(0, remainingSpending),
            remainingOrders,
            'Kim Cương',
          ),
        };
      }

      case MKT_CUSTOMER_TIER.DIAMOND:
        return {
          canUpgrade: false,
          requirements: CUSTOMER_MESSAGES.INFO.MAX_TIER_REACHED,
        };

      default:
        return { canUpgrade: false };
    }
  }
}
