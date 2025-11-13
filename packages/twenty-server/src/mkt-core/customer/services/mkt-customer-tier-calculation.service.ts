import { Injectable, Logger } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_CUSTOMER_TIER } from 'src/mkt-core/customer/constants/mkt-customer.constant';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

export interface CustomerTierResult {
  customerTier: MKT_CUSTOMER_TIER;
  totalOrderValue: number;
  totalOrderCount: number;
  customerId: string;
  customerName: string;
}

@Injectable()
export class MktCustomerTierCalculationService {
  private readonly logger = new Logger(MktCustomerTierCalculationService.name);

  constructor(private readonly mktRepo: MktRepositoryService) {}

  async calculateCustomerTier(
    customerId: string,
    options: {
      includeOnlyCompletedOrders?: boolean | null;
      completedStatuses?: string[] | null;
    } = {},
  ): Promise<CustomerTierResult> {
    const cusRepo = await this.mktRepo.getRepository(
      MktCustomerWorkspaceEntity,
    );
    const orderRepo = await this.mktRepo.getRepository(MktOrderWorkspaceEntity);

    const customer = await cusRepo.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
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
    return mktOrders.reduce((total, order) => {
      // Sử dụng totalAmount nếu có, nếu không sử dụng 0
      const orderValue = order.totalAmount ?? 0;

      return total + orderValue;
    }, 0);
  }

  private determineTier(
    totalOrderValue: number,
    totalOrderCount: number,
  ): MKT_CUSTOMER_TIER {
    if (totalOrderValue >= 10_000_000 && totalOrderCount >= 20) {
      return MKT_CUSTOMER_TIER.DIAMOND;
    }

    if (totalOrderValue >= 5_000_000 && totalOrderCount >= 10) {
      return MKT_CUSTOMER_TIER.GOLD;
    }

    if (totalOrderValue >= 2_000_000 && totalOrderCount >= 5) {
      return MKT_CUSTOMER_TIER.SILVER;
    }

    if (totalOrderValue >= 500_000 && totalOrderCount >= 1) {
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
    const _criteria = this.getTierCriteria();

    switch (currentTier) {
      case MKT_CUSTOMER_TIER.BRONZE:
        if (totalOrderValue >= 2_000_000 && totalOrderCount >= 5) {
          return {
            canUpgrade: true,
            nextTier: MKT_CUSTOMER_TIER.SILVER,
          };
        }

        return {
          canUpgrade: false,
          requirements: `Cần thêm ${Math.max(0, 2_000_000 - totalOrderValue).toLocaleString()} VND và ${Math.max(0, 5 - totalOrderCount)} đơn hàng để lên hạng Bạc`,
        };

      case MKT_CUSTOMER_TIER.SILVER:
        if (totalOrderValue >= 5_000_000 && totalOrderCount >= 10) {
          return {
            canUpgrade: true,
            nextTier: MKT_CUSTOMER_TIER.GOLD,
          };
        }

        return {
          canUpgrade: false,
          requirements: `Cần thêm ${Math.max(0, 5_000_000 - totalOrderValue).toLocaleString()} VND và ${Math.max(0, 10 - totalOrderCount)} đơn hàng để lên hạng Vàng`,
        };

      case MKT_CUSTOMER_TIER.GOLD:
        if (totalOrderValue >= 10_000_000 && totalOrderCount >= 20) {
          return {
            canUpgrade: true,
            nextTier: MKT_CUSTOMER_TIER.DIAMOND,
          };
        }

        return {
          canUpgrade: false,
          requirements: `Cần thêm ${Math.max(0, 10_000_000 - totalOrderValue).toLocaleString()} VND và ${Math.max(0, 20 - totalOrderCount)} đơn hàng để lên hạng Kim Cương`,
        };

      case MKT_CUSTOMER_TIER.DIAMOND:
        return {
          canUpgrade: false,
          requirements: 'Đã đạt hạng cao nhất',
        };

      default:
        return { canUpgrade: false };
    }
  }
}
