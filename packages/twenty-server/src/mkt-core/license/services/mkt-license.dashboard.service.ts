import { Injectable, Logger } from '@nestjs/common';

import { Between, MoreThanOrEqual } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import {
  DashboardDataTransformer,
  DateRangeUtils,
  StatisticsUtils,
} from 'src/mkt-core/utils';

export interface LicenseDashboardStats {
  totalLicenses: {
    count: number;
    percentageChange: number; // % thay đổi so với tháng trước
  };
  activeLicenses: {
    count: number;
    dailyChange: number; // thay đổi so với hôm qua
  };
  trialLicenses: {
    count: number;
    percentageChange: number; // % thay đổi so với tháng trước
  };
  expiredLicenses: {
    count: number;
    percentageChange: number; // % thay đổi so với tháng trước
  };
  refundedAmount: {
    amount: number;
    percentageChange: number; // % thay đổi so với tháng trước
  };
  expiringLicenses: {
    count: number;
    daysToExpire: number; // số ngày còn lại trước khi hết hạn
  };
  usageStatistics: {
    activeToday: number; // hoạt động hôm nay
    activeThisWeek: number; // hoạt động tuần này
    activeThisMonth: number; // hoạt động tháng này
  };
}

@Injectable()
export class MktLicenseDashboardService {
  private readonly logger = new Logger(MktLicenseDashboardService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly mktRepo: MktRepositoryService,
  ) {}

  async getDashboardStats(): Promise<LicenseDashboardStats | null> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.error('Workspace ID not found when getting dashboard stats');

      return null;
    }

    try {
      const [
        totalLicenses,
        activeLicenses,
        trialLicenses,
        expiredLicenses,
        refundedAmount,
        expiringLicenses,
        usageStatistics,
      ] = await Promise.all([
        this.getTotalLicensesStats(workspaceId),
        this.getActiveLicensesStats(workspaceId),
        this.getTrialLicensesStats(workspaceId),
        this.getExpiredLicensesStats(workspaceId),
        this.getRefundedAmountStats(workspaceId),
        this.getExpiringLicensesStats(workspaceId),
        this.getUsageStatistics(workspaceId),
      ]);

      return {
        totalLicenses,
        activeLicenses,
        trialLicenses,
        expiredLicenses,
        refundedAmount,
        expiringLicenses,
        usageStatistics,
      };
    } catch (error) {
      this.logger.error('Error getting dashboard stats', error);

      return null;
    }
  }

  private async getTotalLicensesStats(workspaceId: string) {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const currentMonth = DateRangeUtils.getCurrentMonth();
    const lastMonth = DateRangeUtils.getLastMonth();

    // Get current month count
    const currentCount = await licenseRepository.count({
      where: {
        createdAt: MoreThanOrEqual(
          DateRangeUtils.toISOString(currentMonth.start),
        ),
      },
    });

    // Get last month count
    const lastMonthCount = await licenseRepository.count({
      where: {
        createdAt: Between(
          DateRangeUtils.toISOString(lastMonth.start),
          DateRangeUtils.toISOString(lastMonth.end),
        ),
      },
    });

    return DashboardDataTransformer.transformCountWithComparison(
      currentCount,
      lastMonthCount,
    );
  }

  private async getActiveLicensesStats(workspaceId: string) {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const today = DateRangeUtils.getToday();
    const yesterday = DateRangeUtils.getYesterday();

    // Count licenses with login today
    const todayCount = await licenseRepository.count({
      where: {
        status: MKT_LICENSE_STATUS.ACTIVE,
        lastLoginAt: MoreThanOrEqual(today.start),
      },
    });

    // Count licenses with login yesterday
    const yesterdayCount = await licenseRepository.count({
      where: {
        status: MKT_LICENSE_STATUS.ACTIVE,
        lastLoginAt: Between(yesterday.start, yesterday.end),
      },
    });

    return DashboardDataTransformer.transformCountWithDailyChange(
      todayCount,
      yesterdayCount,
    );
  }

  private async getTrialLicensesStats(workspaceId: string) {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const currentMonth = DateRangeUtils.getCurrentMonth();
    const lastMonth = DateRangeUtils.getLastMonth();

    // Assuming trial licenses are identified by a specific field or pattern
    // This might need adjustment based on actual data structure
    const currentCount = await licenseRepository.count({
      where: {
        // Add trial license identification logic here
        // For example: isTrial: true, or variant.type: 'TRIAL'
        createdAt: MoreThanOrEqual(
          DateRangeUtils.toISOString(currentMonth.start),
        ),
      },
      relations: ['mktVariant'],
    });

    const lastMonthCount = await licenseRepository.count({
      where: {
        createdAt: Between(
          DateRangeUtils.toISOString(lastMonth.start),
          DateRangeUtils.toISOString(lastMonth.end),
        ),
      },
      relations: ['mktVariant'],
    });

    return DashboardDataTransformer.transformCountWithComparison(
      currentCount,
      lastMonthCount,
    );
  }

  private async getExpiredLicensesStats(workspaceId: string) {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const currentMonth = DateRangeUtils.getCurrentMonth();
    const lastMonth = DateRangeUtils.getLastMonth();

    const currentCount = await licenseRepository.count({
      where: {
        status: MKT_LICENSE_STATUS.EXPIRED,
        updatedAt: MoreThanOrEqual(
          DateRangeUtils.toISOString(currentMonth.start),
        ),
      },
    });

    const lastMonthCount = await licenseRepository.count({
      where: {
        status: MKT_LICENSE_STATUS.EXPIRED,
        updatedAt: Between(
          DateRangeUtils.toISOString(lastMonth.start),
          DateRangeUtils.toISOString(lastMonth.end),
        ),
      },
    });

    return DashboardDataTransformer.transformCountWithComparison(
      currentCount,
      lastMonthCount,
    );
  }

  private async getRefundedAmountStats(workspaceId: string) {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const paymentRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentWorkspaceEntity>(
        workspaceId,
        'mktPayment',
        { shouldBypassPermissionChecks: true },
      );

    const currentMonth = DateRangeUtils.getCurrentMonth();
    const lastMonth = DateRangeUtils.getLastMonth();

    // Get refunded licenses this month
    const refundedLicensesThisMonth = await licenseRepository.find({
      where: {
        status: MKT_LICENSE_STATUS.REFUND,
        updatedAt: MoreThanOrEqual(
          DateRangeUtils.toISOString(currentMonth.start),
        ),
      },
      relations: ['mktOrder'],
    });

    // Get refunded licenses last month
    const refundedLicensesLastMonth = await licenseRepository.find({
      where: {
        status: MKT_LICENSE_STATUS.REFUND,
        updatedAt: Between(
          DateRangeUtils.toISOString(lastMonth.start),
          DateRangeUtils.toISOString(lastMonth.end),
        ),
      },
      relations: ['mktOrder'],
    });

    // Calculate refund amounts by getting payment information
    const currentAmount = await this.calculateRefundAmount(
      refundedLicensesThisMonth,
      paymentRepository,
    );

    const lastMonthAmount = await this.calculateRefundAmount(
      refundedLicensesLastMonth,
      paymentRepository,
    );

    return DashboardDataTransformer.transformAmountWithComparison(
      currentAmount,
      lastMonthAmount,
    );
  }

  private async calculateRefundAmount(
    licenses: MktLicenseWorkspaceEntity[],
    paymentRepository: Awaited<
      ReturnType<
        typeof this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentWorkspaceEntity>
      >
    >,
  ): Promise<number> {
    const amounts: number[] = [];

    for (const license of licenses) {
      if (license.mktOrder) {
        const payments = await paymentRepository.find({
          where: {
            mktOrderId: license.mktOrder.id,
            status: 'REFUNDED', // Assuming payment has status field
          },
        });

        const orderRefundAmount =
          DashboardDataTransformer.calculateRevenueSummary(payments);

        if (orderRefundAmount > 0) {
          amounts.push(orderRefundAmount);
        }
      }
    }

    return StatisticsUtils.calculateSum(amounts);
  }

  private async getExpiringLicensesStats(workspaceId: string) {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const futurePeriod = DateRangeUtils.getFuturePeriod(30);

    const expiringLicenses = await licenseRepository.count({
      where: {
        status: MKT_LICENSE_STATUS.ACTIVE,
        expiresAt: Between(futurePeriod.start, futurePeriod.end),
      },
    });

    return DashboardDataTransformer.transformExpiringData(expiringLicenses, 30);
  }

  private async getUsageStatistics(workspaceId: string) {
    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const today = DateRangeUtils.getToday();
    const lastWeek = DateRangeUtils.getLastNDays(7);
    const lastMonth = DateRangeUtils.getLastNDays(30);

    const [activeToday, activeThisWeek, activeThisMonth] = await Promise.all([
      licenseRepository.count({
        where: {
          status: MKT_LICENSE_STATUS.ACTIVE,
          lastLoginAt: MoreThanOrEqual(today.start),
        },
      }),
      licenseRepository.count({
        where: {
          status: MKT_LICENSE_STATUS.ACTIVE,
          lastLoginAt: MoreThanOrEqual(lastWeek.start),
        },
      }),
      licenseRepository.count({
        where: {
          status: MKT_LICENSE_STATUS.ACTIVE,
          lastLoginAt: MoreThanOrEqual(lastMonth.start),
        },
      }),
    ]);

    return DashboardDataTransformer.transformUsageStats(
      activeToday,
      activeThisWeek,
      activeThisMonth,
    );
  }

  // Additional helper methods for detailed analysis

  async getLicensesByStatus(
    status: MKT_LICENSE_STATUS,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.error(
        'Workspace ID not found when getting licenses by status',
      );

      return [];
    }

    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    return await licenseRepository.find({
      where: { status },
      relations: ['mktVariant', 'mktOrder', 'mktCustomer'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getExpiringLicensesDetailed(
    daysAhead = 30,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.error(
        'Workspace ID not found when getting expiring licenses',
      );

      return [];
    }

    const licenseRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
        workspaceId,
        'mktLicense',
        { shouldBypassPermissionChecks: true },
      );

    const now = new Date();
    const futureDate = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
    );

    return await licenseRepository.find({
      where: {
        status: MKT_LICENSE_STATUS.ACTIVE,
        expiresAt: Between(now, futureDate),
      },
      relations: ['mktVariant', 'mktOrder', 'mktCustomer'],
      order: { expiresAt: 'ASC' },
    });
  }

  async getRevenueByPeriod(startDate: Date, endDate: Date): Promise<number> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      this.logger.error(
        'Workspace ID not found when getting revenue by period',
      );

      return 0;
    }

    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
        workspaceId,
        'mktOrder',
        { shouldBypassPermissionChecks: true },
      );

    const orders = await orderRepository.find({
      where: {
        createdAt: Between(
          DateRangeUtils.toISOString(startDate),
          DateRangeUtils.toISOString(endDate),
        ),
        status: ORDER_STATUS.COMPLETED, // Assuming completed orders
      },
      relations: ['mktPayments'],
    });

    const revenues = orders.map((order) =>
      DashboardDataTransformer.calculateRevenueSummary(order.mktPayments || []),
    );

    return StatisticsUtils.calculateSum(revenues);
  }
}
