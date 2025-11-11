import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

import {
  CustomerTier,
  CustomerTierResult,
  MktCustomerTierCalculationService,
} from './mkt-customer-tier-calculation.service';

@Injectable()
export class MktCustomerTierService {
  private readonly logger = new Logger(MktCustomerTierService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktCustomerTierCalculationService: MktCustomerTierCalculationService,
  ) {}

  /**
   * Cập nhật hạng khách hàng cho một khách hàng cụ thể
   */
  async updateCustomerTier(
    workspaceId: string,
    customerId: string,
  ): Promise<CustomerTierResult> {
    // Sử dụng method mới để tính toán hạng
    const tierResult =
      await this.mktCustomerTierCalculationService.calculateCustomerTier(
        workspaceId,
        customerId,
      );

    // Get customer repository để cập nhật
    const customerRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCustomerWorkspaceEntity>(
        workspaceId,
        'mktCustomer',
      );

    // Cập nhật thông tin khách hàng
    await customerRepository.update(customerId, {
      tier: tierResult.customerTier,
      totalOrderValue: tierResult.totalOrderValue,
    });

    return tierResult;
  }

  /**
   * Cập nhật hạng cho tất cả khách hàng trong workspace
   */
  async updateAllCustomerTiers(
    workspaceId: string,
  ): Promise<CustomerTierResult[]> {
    const customerRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCustomerWorkspaceEntity>(
        workspaceId,
        'mktCustomer',
      );

    // Lấy tất cả khách hàng
    const customers = await customerRepository.find();
    const results: CustomerTierResult[] = [];

    for (const customer of customers) {
      try {
        // Sử dụng method mới để tính toán hạng
        const tierResult =
          await this.mktCustomerTierCalculationService.calculateCustomerTier(
            workspaceId,
            customer.id,
          );

        // Cập nhật database
        await customerRepository.update(customer.id, {
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

    return results;
  }

  /**
   * Lấy thống kê hạng khách hàng theo workspace
   */
  async getCustomerTierStatistics(workspaceId: string): Promise<{
    tierDistribution: Record<CustomerTier, number>;
    totalCustomers: number;
    averageOrderValue: number;
    averageOrderCount: number;
  }> {
    const customerRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCustomerWorkspaceEntity>(
        workspaceId,
        'mktCustomer',
      );

    const customers = await customerRepository.find();

    const tierDistribution: Record<CustomerTier, number> = {
      [CustomerTier.BRONZE]: 0,
      [CustomerTier.SILVER]: 0,
      [CustomerTier.GOLD]: 0,
      [CustomerTier.DIAMOND]: 0,
    };

    let totalOrderValue = 0;
    let totalOrderCount = 0;

    for (const customer of customers) {
      // Cập nhật tier distribution
      if (
        customer.tier &&
        Object.values(CustomerTier).includes(customer.tier as CustomerTier)
      ) {
        tierDistribution[customer.tier as CustomerTier]++;
      }

      // Tính tổng order value và count
      totalOrderValue += customer.totalOrderValue || 0;

      // Lấy số lượng orders cho customer này
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
          workspaceId,
          'mktOrder',
        );

      const orderCount = await orderRepository.count({
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

  /**
   * Lấy danh sách khách hàng theo hạng
   */
  async getCustomersByTier(
    workspaceId: string,
    tier: CustomerTier,
    limit?: number,
    offset?: number,
  ): Promise<MktCustomerWorkspaceEntity[]> {
    const customerRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktCustomerWorkspaceEntity>(
        workspaceId,
        'mktCustomer',
      );

    const queryBuilder = customerRepository
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

  /**
   * Kiểm tra khách hàng có thể nâng hạng hay không
   */
  async checkCustomerUpgradeEligibility(
    workspaceId: string,
    customerId: string,
  ): Promise<{
    currentTier: CustomerTier;
    canUpgrade: boolean;
    nextTier?: CustomerTier;
    requirements?: string;
  }> {
    // Sử dụng method mới để lấy thông tin hiện tại
    const tierResult =
      await this.mktCustomerTierCalculationService.calculateCustomerTier(
        workspaceId,
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
