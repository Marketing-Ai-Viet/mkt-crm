import { Injectable, Logger } from '@nestjs/common';

import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

import {
  CustomerTier,
  MktCustomerTierCalculationService,
  MktCustomerTierService,
} from './index';

@Injectable()
export class MktCustomerTierDemoService {
  private readonly logger = new Logger(MktCustomerTierDemoService.name);

  constructor(
    private readonly customerTierCalculationService: MktCustomerTierCalculationService,
    private readonly customerTierService: MktCustomerTierService,
  ) {}

  /**
   * Demo sử dụng service tính toán hạng khách hàng
   */
  async demonstrateCustomerTierCalculation(): Promise<void> {
    this.logger.log('=== DEMO: Customer Tier Calculation Service ===');

    // Demo với customerId - method mới với query tối ưu
    const workspaceId = 'demo-workspace-123';
    const customerId = 'demo-customer-456';

    this.logger.log('📊 Demo tính toán hạng từ Customer ID với query tối ưu:');
    this.logger.log(`Workspace ID: ${workspaceId}`);
    this.logger.log(`Customer ID: ${customerId}`);
    this.logger.log(
      '✨ Mặc định: includeOnlyCompletedOrders = true, completedStatuses = ["COMPLETED"]',
    );
    this.logger.log(
      '✨ Sử dụng aggregation query (COUNT + SUM) thay vì load toàn bộ orders...',
    );

    try {
      // Gọi method mới với customerId - sử dụng aggregation query với default values
      const tierResult =
        await this.customerTierCalculationService.calculateCustomerTier(
          workspaceId,
          customerId,
        );

      this.logger.log(`✅ Kết quả tính toán (chỉ đơn COMPLETED):`);
      this.logger.log(`Khách hàng: ${tierResult.customerName}`);
      this.logger.log(
        `Tổng chi tiêu: ${tierResult.totalOrderValue.toLocaleString()} VND`,
      );
      this.logger.log(`Số đơn hàng: ${tierResult.totalOrderCount}`);
      this.logger.log(`Hạng khách hàng: ${tierResult.customerTier}`);

      // Demo với tất cả đơn hàng (bao gồm cả chưa hoàn thành)
      this.logger.log('\n📊 Demo tính toán hạng từ TẤT CẢ đơn hàng:');
      const allOrdersTierResult =
        await this.customerTierCalculationService.calculateCustomerTierFromAllOrders(
          workspaceId,
          customerId,
        );

      this.logger.log(`✅ Kết quả tính toán (tất cả đơn hàng):`);
      this.logger.log(`Khách hàng: ${allOrdersTierResult.customerName}`);
      this.logger.log(
        `Tổng chi tiêu: ${allOrdersTierResult.totalOrderValue.toLocaleString()} VND`,
      );
      this.logger.log(`Số đơn hàng: ${allOrdersTierResult.totalOrderCount}`);
      this.logger.log(`Hạng khách hàng: ${allOrdersTierResult.customerTier}`);

      // Demo với chỉ đơn hàng đã hoàn thành (explicit call)
      this.logger.log(
        '\n📊 Demo tính toán hạng với multiple completed statuses:',
      );
      const completedOrdersTierResult =
        await this.customerTierCalculationService.calculateCustomerTier(
          workspaceId,
          customerId,
          {
            includeOnlyCompletedOrders: true,
            completedStatuses: ['COMPLETED', 'DELIVERED', 'PAID', 'SUCCESS'],
          },
        );

      this.logger.log(`✅ Kết quả tính toán (multiple completed statuses):`);
      this.logger.log(`Khách hàng: ${completedOrdersTierResult.customerName}`);
      this.logger.log(
        `Tổng chi tiêu: ${completedOrdersTierResult.totalOrderValue.toLocaleString()} VND`,
      );
      this.logger.log(
        `Số đơn hàng: ${completedOrdersTierResult.totalOrderCount}`,
      );
      this.logger.log(
        `Hạng khách hàng: ${completedOrdersTierResult.customerTier}`,
      );

      // Kiểm tra khả năng nâng hạng
      const upgradeInfo =
        this.customerTierCalculationService.checkUpgradeEligibility(
          tierResult.customerTier,
          tierResult.totalOrderValue,
          tierResult.totalOrderCount,
        );

      if (upgradeInfo.canUpgrade) {
        this.logger.log(`✅ Có thể nâng hạng lên: ${upgradeInfo.nextTier}`);
      } else {
        this.logger.log(
          `❌ Chưa đủ điều kiện nâng hạng: ${upgradeInfo.requirements}`,
        );
      }
    } catch (error) {
      this.logger.error(`❌ Lỗi khi tính toán: ${error.message}`);
      this.logger.log('💡 Demo với dữ liệu mô phỏng thay thế...');

      // Fallback demo với dữ liệu mô phỏng
      await this.demonstrateWithMockData();
    }

    // Hiển thị tiêu chí tất cả các hạng
    this.displayTierCriteria();
  }

  /**
   * Demo với dữ liệu mô phỏng
   */
  async demonstrateWithMockData(): Promise<void> {
    this.logger.log('\n=== DEMO: Tính toán với dữ liệu mô phỏng ===');

    // Mô phỏng dữ liệu khách hàng
    const mockCustomer = {
      id: 'customer-123',
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
    } as MktCustomerWorkspaceEntity;

    // Mô phỏng dữ liệu đơn hàng
    const mockOrders = [
      { id: 'order-1', totalAmount: 800000, mktCustomerId: 'customer-123' },
      { id: 'order-2', totalAmount: 1200000, mktCustomerId: 'customer-123' },
      { id: 'order-3', totalAmount: 500000, mktCustomerId: 'customer-123' },
    ] as MktOrderWorkspaceEntity[];

    // Sử dụng method helper với dữ liệu có sẵn
    const tierResult =
      this.customerTierCalculationService.calculateCustomerTierFromData(
        mockCustomer,
        mockOrders,
      );

    this.logger.log(`Khách hàng: ${tierResult.customerName}`);
    this.logger.log(
      `Tổng chi tiêu: ${tierResult.totalOrderValue.toLocaleString()} VND`,
    );
    this.logger.log(`Số đơn hàng: ${tierResult.totalOrderCount}`);
    this.logger.log(`Hạng khách hàng: ${tierResult.customerTier}`);

    // Kiểm tra khả năng nâng hạng
    const upgradeInfo =
      this.customerTierCalculationService.checkUpgradeEligibility(
        tierResult.customerTier,
        tierResult.totalOrderValue,
        tierResult.totalOrderCount,
      );

    if (upgradeInfo.canUpgrade) {
      this.logger.log(`✅ Có thể nâng hạng lên: ${upgradeInfo.nextTier}`);
    } else {
      this.logger.log(
        `❌ Chưa đủ điều kiện nâng hạng: ${upgradeInfo.requirements}`,
      );
    }
  }

  /**
   * Demo các kịch bản khác nhau
   */
  async demonstrateMultipleScenarios(): Promise<void> {
    this.logger.log('\n=== DEMO: Multiple Customer Scenarios ===');

    const scenarios = [
      {
        name: 'Khách hàng mới',
        totalAmount: 600000,
        orderCount: 1,
        expected: CustomerTier.BRONZE,
      },
      {
        name: 'Khách hàng ổn định',
        totalAmount: 3000000,
        orderCount: 7,
        expected: CustomerTier.SILVER,
      },
      {
        name: 'Khách hàng trung thành',
        totalAmount: 7500000,
        orderCount: 15,
        expected: CustomerTier.GOLD,
      },
      {
        name: 'Khách hàng VIP',
        totalAmount: 15000000,
        orderCount: 25,
        expected: CustomerTier.DIAMOND,
      },
    ];

    for (const scenario of scenarios) {
      const mockCustomer = {
        name: scenario.name,
      } as MktCustomerWorkspaceEntity;
      const mockOrders = Array(scenario.orderCount)
        .fill(null)
        .map((_, index) => ({
          id: `order-${index}`,
          totalAmount: scenario.totalAmount / scenario.orderCount,
        })) as MktOrderWorkspaceEntity[];

      const result =
        this.customerTierCalculationService.calculateCustomerTierFromData(
          mockCustomer,
          mockOrders,
        );

      const isCorrect = result.customerTier === scenario.expected ? '✅' : '❌';

      this.logger.log(`${isCorrect} ${scenario.name}:`);
      this.logger.log(
        `   Chi tiêu: ${result.totalOrderValue.toLocaleString()} VND`,
      );
      this.logger.log(`   Đơn hàng: ${result.totalOrderCount}`);
      this.logger.log(
        `   Hạng: ${result.customerTier} (Expected: ${scenario.expected})`,
      );
      this.logger.log('');
    }
  }

  /**
   * Hiển thị tiêu chí các hạng khách hàng
   */
  private displayTierCriteria(): void {
    this.logger.log('\n=== Tiêu chí các hạng khách hàng ===');

    const criteria = this.customerTierCalculationService.getTierCriteria();

    Object.entries(criteria).forEach(([tier, info]) => {
      this.logger.log(`${this.getTierIcon(tier as CustomerTier)} ${tier}:`);
      this.logger.log(`   ${info.description}`);
      this.logger.log(`   Chi tiêu: ${info.spending}`);
      this.logger.log(`   Đơn hàng: ${info.orders}`);
      this.logger.log('');
    });
  }

  /**
   * Lấy icon cho từng hạng
   */
  private getTierIcon(tier: CustomerTier): string {
    switch (tier) {
      case CustomerTier.BRONZE:
        return '🥉';
      case CustomerTier.SILVER:
        return '🥈';
      case CustomerTier.GOLD:
        return '🥇';
      case CustomerTier.DIAMOND:
        return '💎';
      default:
        return '⭐';
    }
  }

  /**
   * Chạy tất cả demo
   */
  async runAllDemos(): Promise<void> {
    await this.demonstrateCustomerTierCalculation();
    await this.demonstrateMultipleScenarios();
  }
}
