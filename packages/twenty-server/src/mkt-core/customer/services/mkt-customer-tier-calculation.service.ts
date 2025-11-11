import { Injectable } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

export enum CustomerTier {
  BRONZE = 'Đồng',
  SILVER = 'Bạc',
  GOLD = 'Vàng',
  DIAMOND = 'Kim Cương',
}

export interface CustomerTierResult {
  customerTier: CustomerTier;
  totalOrderValue: number;
  totalOrderCount: number;
  customerId: string;
  customerName: string;
}

@Injectable()
export class MktCustomerTierCalculationService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Tính toán hạng khách hàng dựa trên customerId
   * Service sẽ tự động query database để lấy thông tin đơn hàng và tính toán
   *
   * Mặc định: chỉ tính đơn hàng có status 'COMPLETED'
   *
   * Tiêu chí:
   * - Đồng (Bronze): 500,000 - 1,999,999 VND, 1-4 đơn
   * - Bạc (Silver): 2,000,000 - 4,999,999 VND, 5-9 đơn
   * - Vàng (Gold): 5,000,000 - 9,999,999 VND, 10-19 đơn
   * - Kim Cương (Diamond): ≥ 10,000,000 VND, ≥ 20 đơn
   */
  async calculateCustomerTier(
    workspaceId: string,
    customerId: string,
    options: {
      includeOnlyCompletedOrders?: boolean;
      completedStatuses?: string[];
    } = {},
  ): Promise<CustomerTierResult> {
    // Get repositories
    const customerRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCustomerWorkspaceEntity>(
        workspaceId,
        'mktCustomer',
      );

    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
        workspaceId,
        'mktOrder',
      );

    // Lấy thông tin khách hàng
    const customer = await customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    // Thiết lập giá trị mặc định cho options
    const {
      includeOnlyCompletedOrders = true,
      completedStatuses = ['COMPLETED'],
    } = options;

    // Tạo query builder với điều kiện cơ bản
    let queryBuilder = orderRepository
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalOrderValue')
      .where('order.mktCustomerId = :customerId', { customerId });

    // Thêm điều kiện lọc đơn hàng đã hoàn thành nếu được yêu cầu
    if (includeOnlyCompletedOrders && completedStatuses?.length) {
      queryBuilder = queryBuilder.andWhere('order.status IN (:...statuses)', {
        statuses: completedStatuses,
      });
    }

    // Lấy tất cả đơn hàng của khách hàng và tính toán bằng query aggregation
    const orderStats = await queryBuilder.getRawOne();

    // Parse kết quả từ query
    const totalOrderCount = parseInt(orderStats.totalOrderCount) || 0;
    const totalOrderValue = parseFloat(orderStats.totalOrderValue) || 0;

    // Xác định hạng khách hàng dựa trên tiêu chí
    const customerTier = this.determineTier(totalOrderValue, totalOrderCount);

    return {
      customerTier,
      totalOrderValue,
      totalOrderCount,
      customerId,
      customerName: customer.name,
    };
  }

  /**
   * Lấy danh sách các status đơn hàng được coi là đã hoàn thành
   */
  getCompletedOrderStatuses(): string[] {
    // Có thể import từ constants hoặc định nghĩa tại đây
    return ['COMPLETED', 'DELIVERED', 'PAID', 'FINISHED', 'SUCCESS'];
  }

  /**
   * Tính toán hạng khách hàng chỉ dựa trên đơn hàng đã hoàn thành
   */
  async calculateCustomerTierFromCompletedOrders(
    workspaceId: string,
    customerId: string,
  ): Promise<CustomerTierResult> {
    return this.calculateCustomerTier(workspaceId, customerId, {
      includeOnlyCompletedOrders: true,
      completedStatuses: this.getCompletedOrderStatuses(),
    });
  }

  /**
   * Tính toán hạng khách hàng từ tất cả đơn hàng (bao gồm cả chưa hoàn thành)
   */
  async calculateCustomerTierFromAllOrders(
    workspaceId: string,
    customerId: string,
  ): Promise<CustomerTierResult> {
    return this.calculateCustomerTier(workspaceId, customerId, {
      includeOnlyCompletedOrders: false,
    });
  }

  /**
   * Method helper để tính toán hạng khách hàng từ dữ liệu có sẵn
   * Dùng khi đã có thông tin khách hàng và đơn hàng
   */
  calculateCustomerTierFromData(
    mktCustomer: MktCustomerWorkspaceEntity,
    mktOrders: MktOrderWorkspaceEntity[],
  ): CustomerTierResult {
    // Tính tổng chi tiêu từ các đơn hàng
    const totalOrderValue = this.calculateTotalOrderValue(mktOrders);

    // Đếm số đơn hàng
    const totalOrderCount = mktOrders.length;

    // Xác định hạng khách hàng dựa trên tiêu chí
    const customerTier = this.determineTier(totalOrderValue, totalOrderCount);

    return {
      customerTier,
      totalOrderValue,
      totalOrderCount,
      customerId: mktCustomer.id,
      customerName: mktCustomer.name,
    };
  }

  /**
   * Tính tổng giá trị đơn hàng
   */
  private calculateTotalOrderValue(
    mktOrders: MktOrderWorkspaceEntity[],
  ): number {
    return mktOrders.reduce((total, order) => {
      // Sử dụng totalAmount nếu có, nếu không sử dụng 0
      const orderValue = order.totalAmount ?? 0;

      return total + orderValue;
    }, 0);
  }

  /**
   * Xác định hạng khách hàng dựa trên tổng chi tiêu và số đơn hàng
   */
  private determineTier(
    totalOrderValue: number,
    totalOrderCount: number,
  ): CustomerTier {
    // Kim Cương (Diamond) - Khách hàng VIP cao cấp nhất
    if (totalOrderValue >= 10_000_000 && totalOrderCount >= 20) {
      return CustomerTier.DIAMOND;
    }

    // Vàng (Gold) - Khách hàng trung thành cao
    if (
      totalOrderValue >= 5_000_000 &&
      totalOrderValue < 10_000_000 &&
      totalOrderCount >= 10 &&
      totalOrderCount <= 19
    ) {
      return CustomerTier.GOLD;
    }

    // Bạc (Silver) - Khách hàng ổn định
    if (
      totalOrderValue >= 2_000_000 &&
      totalOrderValue < 5_000_000 &&
      totalOrderCount >= 5 &&
      totalOrderCount <= 9
    ) {
      return CustomerTier.SILVER;
    }

    // Đồng (Bronze) - Khách hàng mới/cơ bản
    if (
      totalOrderValue >= 500_000 &&
      totalOrderValue < 2_000_000 &&
      totalOrderCount >= 1 &&
      totalOrderCount <= 4
    ) {
      return CustomerTier.BRONZE;
    }

    // Mặc định cho các trường hợp không đạt tiêu chí tối thiểu
    return CustomerTier.BRONZE;
  }

  /**
   * Lấy mô tả chi tiết về các tiêu chí hạng khách hàng
   */
  getTierCriteria(): Record<
    CustomerTier,
    { spending: string; orders: string; description: string }
  > {
    return {
      [CustomerTier.BRONZE]: {
        spending: '500,000 - 1,999,999 VND',
        orders: '1-4 đơn',
        description: 'Khách hàng mới/cơ bản',
      },
      [CustomerTier.SILVER]: {
        spending: '2,000,000 - 4,999,999 VND',
        orders: '5-9 đơn',
        description: 'Khách hàng ổn định',
      },
      [CustomerTier.GOLD]: {
        spending: '5,000,000 - 9,999,999 VND',
        orders: '10-19 đơn',
        description: 'Khách hàng trung thành cao',
      },
      [CustomerTier.DIAMOND]: {
        spending: '≥ 10,000,000 VND',
        orders: '≥ 20 đơn',
        description: 'Khách hàng VIP cao cấp nhất',
      },
    };
  }

  /**
   * Kiểm tra xem khách hàng có đủ điều kiện để nâng hạng hay không
   */
  checkUpgradeEligibility(
    currentTier: CustomerTier,
    totalOrderValue: number,
    totalOrderCount: number,
  ): { canUpgrade: boolean; nextTier?: CustomerTier; requirements?: string } {
    const _criteria = this.getTierCriteria();

    switch (currentTier) {
      case CustomerTier.BRONZE:
        if (totalOrderValue >= 2_000_000 && totalOrderCount >= 5) {
          return {
            canUpgrade: true,
            nextTier: CustomerTier.SILVER,
          };
        }

        return {
          canUpgrade: false,
          requirements: `Cần thêm ${Math.max(0, 2_000_000 - totalOrderValue).toLocaleString()} VND và ${Math.max(0, 5 - totalOrderCount)} đơn hàng để lên hạng Bạc`,
        };

      case CustomerTier.SILVER:
        if (totalOrderValue >= 5_000_000 && totalOrderCount >= 10) {
          return {
            canUpgrade: true,
            nextTier: CustomerTier.GOLD,
          };
        }

        return {
          canUpgrade: false,
          requirements: `Cần thêm ${Math.max(0, 5_000_000 - totalOrderValue).toLocaleString()} VND và ${Math.max(0, 10 - totalOrderCount)} đơn hàng để lên hạng Vàng`,
        };

      case CustomerTier.GOLD:
        if (totalOrderValue >= 10_000_000 && totalOrderCount >= 20) {
          return {
            canUpgrade: true,
            nextTier: CustomerTier.DIAMOND,
          };
        }

        return {
          canUpgrade: false,
          requirements: `Cần thêm ${Math.max(0, 10_000_000 - totalOrderValue).toLocaleString()} VND và ${Math.max(0, 20 - totalOrderCount)} đơn hàng để lên hạng Kim Cương`,
        };

      case CustomerTier.DIAMOND:
        return {
          canUpgrade: false,
          requirements: 'Đã đạt hạng cao nhất',
        };

      default:
        return { canUpgrade: false };
    }
  }
}
