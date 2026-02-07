import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import {
  DashboardDataTransformer,
  RawCustomerTierRow,
  RawCustomerGrowthRow,
} from 'src/mkt-core/mkt-dashboard/utils/dashboard-data.transformer';
import { StatisticsUtils } from 'src/mkt-core/mkt-dashboard/utils/statistics.utils';
import { CustomerStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/customer-stats.input';
import { CustomerStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/customer-stats.output';
import { DASHBOARD_LIMITS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-limits';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'CustomerStatsService';

@Injectable()
export class CustomerStatsService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly dateRangeService: DashboardDateRangeService,
  ) {}

  async getStats(input: CustomerStatsInput): Promise<CustomerStatsOutput> {
    const dateRange = this.dateRangeService.resolve(
      input.period as DashboardPeriod,
      input.startDate,
      input.endDate,
    );

    try {
      const [customersByTier, customerGrowth, ltvStats, topCustomers] =
        await Promise.all([
          this.getCustomersByTier(dateRange),
          this.getCustomerGrowth(dateRange),
          this.getLtvAndChurnStats(dateRange),
          this.getTopCustomersByRevenue(
            dateRange,
            input.topCustomersLimit ?? DASHBOARD_LIMITS.TOP_CUSTOMERS,
          ),
        ]);

      return {
        customersByTier,
        customerGrowth,
        averageLtv: ltvStats.averageLtv,
        churnRate: ltvStats.churnRate,
        engagementDistribution: ltvStats.engagementDistribution,
        topCustomersByRevenue: topCustomers,
      };
    } catch (error) {
      this.logger.error('Failed to get customer stats', {
        error: getErrorMessage(error),
        period: input.period,
      });
      throw error;
    }
  }

  private async getCustomersByTier(dateRange: {
    startDate: string;
    endDate: string;
  }) {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace(wsId);

    const rows: RawCustomerTierRow[] = await dataSource.query(
      `SELECT
        COALESCE(c."customerTier", 'NONE') AS tier,
        COUNT(*) AS count,
        COALESCE(SUM(c."lifetimeValue"), 0) AS total_ltv
      FROM "mktCustomer" c
      WHERE c."deletedAt" IS NULL
        AND c."createdAt" <= $2
      GROUP BY c."customerTier"
      ORDER BY total_ltv DESC`,
      [dateRange.startDate, dateRange.endDate],
    );

    return DashboardDataTransformer.transformCustomerTierStats(rows);
  }

  private async getCustomerGrowth(dateRange: {
    startDate: string;
    endDate: string;
  }) {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace(wsId);

    // SQL from design doc 7.3
    const newCustomerRows: RawCustomerGrowthRow[] = await dataSource.query(
      `SELECT
        DATE_TRUNC('month', "createdAt") AS period,
        COUNT(*) AS new_customers,
        0 AS churned_customers
      FROM "mktCustomer"
      WHERE "deletedAt" IS NULL
        AND "createdAt" BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY period`,
      [dateRange.startDate, dateRange.endDate],
    );

    return DashboardDataTransformer.transformCustomerGrowth(newCustomerRows);
  }

  private async getLtvAndChurnStats(dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<{
    averageLtv: number;
    churnRate: number;
    engagementDistribution: Array<{ range: string; count: number }>;
  }> {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace(wsId);

    const rows = await dataSource.query(
      `SELECT
        COALESCE(AVG("lifetimeValue"), 0) AS avg_ltv,
        COUNT(*) AS total_customers,
        COUNT(*) FILTER (WHERE "customerLifecycleStage" = 'CHURNED') AS churned_customers
      FROM "mktCustomer"
      WHERE "deletedAt" IS NULL
        AND "createdAt" <= $1`,
      [dateRange.endDate],
    );

    const row = rows[0];
    const totalCustomers = Number(row?.total_customers ?? 0);
    const churnedCustomers = Number(row?.churned_customers ?? 0);

    // Engagement distribution by order count ranges
    const engagementRows = await dataSource.query(
      `SELECT
        CASE
          WHEN order_count = 0 THEN '0 orders'
          WHEN order_count BETWEEN 1 AND 5 THEN '1-5 orders'
          WHEN order_count BETWEEN 6 AND 20 THEN '6-20 orders'
          ELSE '20+ orders'
        END AS range,
        COUNT(*) AS count
      FROM (
        SELECT c.id, COUNT(o.id) AS order_count
        FROM "mktCustomer" c
        LEFT JOIN "mktOrder" o ON o."customerId" = c.id AND o."deletedAt" IS NULL
        WHERE c."deletedAt" IS NULL
        GROUP BY c.id
      ) sub
      GROUP BY range
      ORDER BY MIN(order_count)`,
    );

    return {
      averageLtv: MoneyUtils.from(row?.avg_ltv ?? '0').toNumber(),
      churnRate: StatisticsUtils.achievementRate(
        churnedCustomers,
        totalCustomers,
      ),
      engagementDistribution: engagementRows.map(
        (r: { range: string; count: string }) => ({
          range: r.range,
          count: Number(r.count),
        }),
      ),
    };
  }

  private async getTopCustomersByRevenue(
    dateRange: { startDate: string; endDate: string },
    limit: number,
  ) {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace(wsId);

    const rows = await dataSource.query(
      `SELECT
        c."name" AS name,
        COALESCE(SUM(o."totalAmount"), 0) AS revenue,
        COUNT(o.id) AS order_count
      FROM "mktCustomer" c
      JOIN "mktOrder" o ON o."customerId" = c.id
      WHERE c."deletedAt" IS NULL
        AND o."deletedAt" IS NULL
        AND o.status = 'COMPLETED'
        AND o."createdAt" BETWEEN $1 AND $2
      GROUP BY c.id, c."name"
      ORDER BY revenue DESC
      LIMIT $3`,
      [dateRange.startDate, dateRange.endDate, limit],
    );

    return rows.map(
      (r: { name: string; revenue: string; order_count: string }) => ({
        name: r.name,
        revenue: MoneyUtils.from(r.revenue).toNumber(),
        orderCount: Number(r.order_count),
      }),
    );
  }
}
