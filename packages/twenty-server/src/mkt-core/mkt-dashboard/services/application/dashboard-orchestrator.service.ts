import { Injectable, Logger } from '@nestjs/common';

import { DashboardCacheService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-cache.service';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import { RevenueStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/revenue-stats.service';
import { OrderStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/order-stats.service';
import { CustomerStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/customer-stats.service';
import { PaymentStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/payment-stats.service';
import { KpiStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/kpi-stats.service';
import { ContractStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/contract-stats.service';
import { DashboardAlertsService } from 'src/mkt-core/mkt-dashboard/services/domain/alerts.service';
import { StaffLeaderboardService } from 'src/mkt-core/mkt-dashboard/services/domain/staff-leaderboard.service';
import { RevenueDailyService } from 'src/mkt-core/mkt-dashboard/services/domain/revenue-daily.service';
import { DashboardSummaryInput } from 'src/mkt-core/mkt-dashboard/dto/input/dashboard-summary.input';
import { DashboardSummaryOutput } from 'src/mkt-core/mkt-dashboard/dto/output/dashboard-summary.output';
import { RevenueStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-stats.input';
import { OrderStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/order-stats.input';
import { CustomerStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/customer-stats.input';
import { KpiScorecardInput } from 'src/mkt-core/mkt-dashboard/dto/input/kpi-scorecard.input';
import { LeaderboardInput } from 'src/mkt-core/mkt-dashboard/dto/input/leaderboard.input';
import { RevenueDailyInput } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-daily.input';
import { RevenueStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';
import { OrderStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/order-stats.output';
import { CustomerStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/customer-stats.output';
import { PaymentStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/payment-stats.output';
import { KpiScorecardOutput } from 'src/mkt-core/mkt-dashboard/dto/output/kpi-scorecard.output';
import { ContractStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/contract-stats.output';
import { AlertsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/alerts.output';
import { StaffLeaderboardOutput } from 'src/mkt-core/mkt-dashboard/dto/output/leaderboard.output';
import { RevenueDailyOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-daily.output';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { StatisticsUtils } from 'src/mkt-core/mkt-dashboard/utils/statistics.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'DashboardOrchestratorService';

@Injectable()
export class DashboardOrchestratorService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly cacheService: DashboardCacheService,
    private readonly dateRangeService: DashboardDateRangeService,
    private readonly revenueStatsService: RevenueStatsService,
    private readonly orderStatsService: OrderStatsService,
    private readonly customerStatsService: CustomerStatsService,
    private readonly paymentStatsService: PaymentStatsService,
    private readonly kpiStatsService: KpiStatsService,
    private readonly contractStatsService: ContractStatsService,
    private readonly alertsService: DashboardAlertsService,
    private readonly leaderboardService: StaffLeaderboardService,
    private readonly revenueDailyService: RevenueDailyService,
  ) {}

  /**
   * Get full dashboard summary with caching
   * Queries all domain stats in parallel for maximum throughput
   */
  async getDashboardSummary(
    workspaceId: string,
    input: DashboardSummaryInput,
  ): Promise<DashboardSummaryOutput> {
    // 1. Check cache (include departmentId in cache key)
    const cacheFilters: Record<string, unknown> = {
      ...input.filters,
      ...(input.departmentId ? { departmentId: input.departmentId } : {}),
    };
    const cached = await this.cacheService.getSummary<DashboardSummaryOutput>(
      workspaceId,
      input.period,
      cacheFilters,
    );

    if (cached) {
      return cached;
    }

    const dateRange = this.dateRangeService.resolve(
      input.period,
      input.startDate,
      input.endDate,
    );

    try {
      // 2. Build individual input objects
      const revenueInput: RevenueStatsInput = {
        period: input.period,
        departmentId: input.departmentId,
        startDate: input.startDate,
        endDate: input.endDate,
      };

      const orderInput: OrderStatsInput = {
        period: input.period,
        departmentId: input.departmentId,
        startDate: input.startDate,
        endDate: input.endDate,
      };

      const customerInput: CustomerStatsInput = {
        period: input.period,
        departmentId: input.departmentId,
        startDate: input.startDate,
        endDate: input.endDate,
      };

      const kpiInput: KpiScorecardInput = {
        period: input.period,
        departmentId: input.departmentId,
      };

      // 3. Query all domain stats in parallel
      const [
        revenueStats,
        orderStats,
        customerStats,
        paymentStats,
        kpiStats,
        contractStats,
        alerts,
      ] = await Promise.all([
        this.revenueStatsService.getStats(revenueInput),
        this.orderStatsService.getStats(orderInput),
        this.customerStatsService.getStats(customerInput),
        this.paymentStatsService.getStats(
          input.period,
          input.startDate,
          input.endDate,
          input.departmentId,
        ),
        this.kpiStatsService.getStats(kpiInput),
        this.contractStatsService.getStats(
          input.period,
          input.startDate,
          input.endDate,
          input.departmentId,
        ),
        this.alertsService.getAlerts(input.departmentId),
      ]);

      // 4. Map domain results to summary output structure
      const result = this.mapToSummaryOutput(
        dateRange,
        input.period,
        revenueStats,
        orderStats,
        customerStats,
        paymentStats,
        kpiStats,
        contractStats,
        alerts,
      );

      // 5. Cache the result
      await this.cacheService.setSummary(
        workspaceId,
        input.period,
        result,
        cacheFilters,
      );

      this.logger.log('Dashboard summary generated', {
        workspaceId,
        period: input.period,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to generate dashboard summary', {
        error: getErrorMessage(error),
        workspaceId,
        period: input.period,
      });
      throw error;
    }
  }

  /**
   * Get individual data source stats (used by widgets)
   */
  async getRevenueStats(input: RevenueStatsInput): Promise<RevenueStatsOutput> {
    return this.revenueStatsService.getStats(input);
  }

  async getOrderStats(input: OrderStatsInput): Promise<OrderStatsOutput> {
    return this.orderStatsService.getStats(input);
  }

  async getCustomerStats(
    input: CustomerStatsInput,
  ): Promise<CustomerStatsOutput> {
    return this.customerStatsService.getStats(input);
  }

  async getPaymentStats(
    period: DashboardPeriod,
    startDate?: string,
    endDate?: string,
    departmentId?: string,
  ): Promise<PaymentStatsOutput> {
    return this.paymentStatsService.getStats(
      period,
      startDate,
      endDate,
      departmentId,
    );
  }

  async getKpiStats(input: KpiScorecardInput): Promise<KpiScorecardOutput> {
    return this.kpiStatsService.getStats(input);
  }

  async getContractStats(
    period: DashboardPeriod,
    startDate?: string,
    endDate?: string,
    departmentId?: string,
  ): Promise<ContractStatsOutput> {
    return this.contractStatsService.getStats(
      period,
      startDate,
      endDate,
      departmentId,
    );
  }

  async getAlerts(departmentId?: string): Promise<AlertsOutput> {
    return this.alertsService.getAlerts(departmentId);
  }

  async getLeaderboard(
    input: LeaderboardInput,
  ): Promise<StaffLeaderboardOutput> {
    return this.leaderboardService.getLeaderboard(input);
  }

  async getRevenueDailyByWeek(
    input: RevenueDailyInput,
  ): Promise<RevenueDailyOutput> {
    return this.revenueDailyService.getStats(input);
  }

  /**
   * Map individual domain stats results to the unified DashboardSummaryOutput
   */
  private mapToSummaryOutput(
    dateRange: { startDate: string; endDate: string },
    periodType: string,
    revenueStats: RevenueStatsOutput,
    orderStats: OrderStatsOutput,
    customerStats: CustomerStatsOutput,
    paymentStats: PaymentStatsOutput,
    kpiStats: KpiScorecardOutput,
    contractStats: ContractStatsOutput,
    alerts: AlertsOutput,
  ): DashboardSummaryOutput {
    // Revenue summary
    const revenueValues = revenueStats.revenueByPeriod.map((r) => r.amount);
    const previousPeriodRevenue =
      revenueStats.projectedRevenue !== null
        ? MoneyUtils.subtract(
            revenueStats.totalRevenue,
            MoneyUtils.multiply(
              revenueStats.growthRate / 100,
              revenueStats.totalRevenue,
            ).toNumber(),
          ).toNumber()
        : 0;

    // Orders summary
    const totalOrders = orderStats.ordersByStatus.reduce(
      (sum, s) => sum + s.count,
      0,
    );

    // Customer summary - build tier and lifecycle items
    const totalCustomers = customerStats.customersByTier.reduce(
      (sum, t) => sum + t.count,
      0,
    );
    const newCustomersThisPeriod = customerStats.customerGrowth.reduce(
      (sum, g) => sum + g.newCustomers,
      0,
    );

    // KPI summary
    const totalKpis = kpiStats.kpisByCategory.reduce(
      (sum, cat) => sum + cat.kpis.length,
      0,
    );
    const achievedKpis = kpiStats.kpisByCategory.reduce(
      (sum, cat) =>
        sum +
        cat.kpis.filter(
          (k) => k.status === 'ACHIEVED' || k.status === 'EXCEEDED',
        ).length,
      0,
    );
    const inProgressKpis = kpiStats.kpisByCategory.reduce(
      (sum, cat) =>
        sum + cat.kpis.filter((k) => k.status === 'IN_PROGRESS').length,
      0,
    );

    return {
      period: {
        start: dateRange.startDate,
        end: dateRange.endDate,
        periodType,
      },
      revenue: {
        totalRevenue: revenueStats.totalRevenue,
        previousPeriodRevenue,
        percentageChange: revenueStats.growthRate,
        trend: StatisticsUtils.detectTrend(revenueValues),
        revenueByMonth: revenueStats.revenueByPeriod.map((r) => ({
          period: r.period,
          amount: r.amount,
        })),
        // Dual-Metric fields
        collectedRevenue: revenueStats.collected?.totalRevenue ?? null,
        orderRevenue: revenueStats.order?.totalRevenue ?? null,
        collectionRate: revenueStats.gap?.collectionRate ?? null,
        revenueGap: revenueStats.gap?.revenueGap ?? null,
        collectedByMonth: revenueStats.collected?.revenueByPeriod ?? null,
        orderByMonth: revenueStats.order?.revenueByPeriod ?? null,
      },
      orders: {
        totalOrders,
        ordersByStatus: orderStats.ordersByStatus,
        newOrdersThisPeriod: totalOrders,
        previousPeriodOrders: 0, // Would need previous period query
        percentageChange: 0,
        averageOrderValue: orderStats.averageOrderValue,
      },
      customers: {
        totalCustomers,
        newCustomersThisPeriod,
        previousPeriodNewCustomers: 0,
        percentageChange: 0,
        customersByTier: customerStats.customersByTier.map((t) => ({
          tier: t.tier,
          count: t.count,
        })),
        customersByLifecycle: [], // Not available from current stats
        churnRate: customerStats.churnRate,
        topCustomers: customerStats.topCustomersByRevenue.map((c) => ({
          id: '',
          name: c.name,
          totalOrderValue: c.revenue,
          tier: null,
        })),
      },
      payments: {
        totalCollected: paymentStats.totalCollected,
        pendingAmount: paymentStats.pendingAmount,
        collectionRate: paymentStats.collectionRate,
        paymentsByStatus: paymentStats.paymentsByStatus,
        overduePayments: paymentStats.overduePayments,
      },
      kpis: {
        totalKpis,
        achievedCount: achievedKpis,
        inProgressCount: inProgressKpis,
        achievementRate: kpiStats.overallAchievementRate,
        kpisByCategory: kpiStats.kpisByCategory.map((cat) => ({
          category: cat.category,
          total: cat.kpis.length,
          achieved: cat.kpis.filter(
            (k) => k.status === 'ACHIEVED' || k.status === 'EXCEEDED',
          ).length,
          rate:
            cat.kpis.length > 0
              ? MoneyUtils.percentageOf(
                  cat.kpis.filter(
                    (k) => k.status === 'ACHIEVED' || k.status === 'EXCEEDED',
                  ).length,
                  cat.kpis.length,
                ).toNumber()
              : 0,
        })),
        topKpis: kpiStats.kpisByCategory
          .flatMap((cat) => cat.kpis)
          .slice(0, 5)
          .map((k) => ({
            kpiName: k.name,
            targetValue: k.target,
            actualValue: k.actual,
            progress: k.progress,
          })),
      },
      contracts: {
        totalActive: contractStats.totalActive,
        expiringThisMonth: contractStats.expiringThisMonth,
        newThisPeriod: contractStats.newThisPeriod,
      },
      alerts,
    };
  }
}
