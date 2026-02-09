import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { getWorkspaceDataSourceWithSchema } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import { DepartmentFilterHelper } from 'src/mkt-core/mkt-dashboard/utils/department-filter.helper';
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
      input.period,
      input.startDate,
      input.endDate,
    );

    try {
      const dataSource = await getWorkspaceDataSourceWithSchema(
        this.scopedWorkspaceContextFactory,
        this.twentyORMGlobalManager,
      );

      const departmentIds = await DepartmentFilterHelper.resolveDepartmentIds(
        dataSource,
        input.departmentId,
      );

      const [customersByTier, customerGrowth, ltvStats, topCustomers] =
        await Promise.all([
          this.getCustomersByTier(dateRange, departmentIds),
          this.getCustomerGrowth(dateRange, input.period, departmentIds),
          this.getLtvAndChurnStats(dateRange, departmentIds),
          this.getTopCustomersByRevenue(
            dateRange,
            input.topCustomersLimit ?? DASHBOARD_LIMITS.TOP_CUSTOMERS,
            departmentIds,
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

  private async getCustomersByTier(
    dateRange: { startDate: string; endDate: string },
    departmentIds?: string[],
  ) {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const params: (string | string[])[] = [dateRange.endDate];

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      'c."accountOwnerId"',
      departmentIds,
      2,
    );

    if (deptFilter) {
      params.push(deptFilter.params);
    }

    const rows: RawCustomerTierRow[] = await dataSource.query(
      `SELECT
        COALESCE(c."tier"::text, 'NONE') AS tier,
        COUNT(*) AS count,
        COALESCE(SUM(c."customerLtv"), 0) AS total_ltv
      FROM "mktCustomer" c
      WHERE c."deletedAt" IS NULL
        AND c."createdAt" <= $1
        ${deptFilter?.clause ?? ''}
      GROUP BY c."tier"
      ORDER BY total_ltv DESC`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformCustomerTierStats(rows);
  }

  private async getCustomerGrowth(
    dateRange: { startDate: string; endDate: string },
    period: DashboardPeriod,
    departmentIds?: string[],
  ) {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const params: (string | string[])[] = [
      dateRange.startDate,
      dateRange.endDate,
    ];

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      '"accountOwnerId"',
      departmentIds,
      3,
    );

    if (deptFilter) {
      params.push(deptFilter.params);
    }

    const truncInterval = this.dateRangeService.getDateTruncInterval(period);

    const newCustomerRows: RawCustomerGrowthRow[] = await dataSource.query(
      `SELECT
        DATE_TRUNC('${truncInterval}', "createdAt") AS period,
        COUNT(*) AS new_customers,
        0 AS churned_customers
      FROM "mktCustomer"
      WHERE "deletedAt" IS NULL
        AND "createdAt" BETWEEN $1 AND $2
        ${deptFilter?.clause ?? ''}
      GROUP BY DATE_TRUNC('${truncInterval}', "createdAt")
      ORDER BY period`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformCustomerGrowth(newCustomerRows);
  }

  private async getLtvAndChurnStats(
    dateRange: { startDate: string; endDate: string },
    departmentIds?: string[],
  ): Promise<{
    averageLtv: number;
    churnRate: number;
    engagementDistribution: Array<{ range: string; count: number }>;
  }> {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const ltvParams: (string | string[])[] = [dateRange.endDate];

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      '"accountOwnerId"',
      departmentIds,
      2,
    );

    if (deptFilter) {
      ltvParams.push(deptFilter.params);
    }

    const rows = await dataSource.query(
      `SELECT
        COALESCE(AVG("customerLtv"), 0) AS avg_ltv,
        COUNT(*) AS total_customers,
        COUNT(*) FILTER (WHERE "lifecycleStage" = 'CHURNED') AS churned_customers
      FROM "mktCustomer"
      WHERE "deletedAt" IS NULL
        AND "createdAt" <= $1
        ${deptFilter?.clause ?? ''}`,
      ltvParams,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    const row = rows[0];
    const totalCustomers = Number(row?.total_customers ?? 0);
    const churnedCustomers = Number(row?.churned_customers ?? 0);

    // Engagement distribution by order count ranges
    const engDeptFilter = DepartmentFilterHelper.buildOwnerFilter(
      'c."accountOwnerId"',
      departmentIds,
      1,
    );

    const engParams: string[][] = [];
    let engDeptClause = '';

    if (engDeptFilter) {
      engParams.push(engDeptFilter.params as unknown as string[]);
      engDeptClause = engDeptFilter.clause;
    }

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
        LEFT JOIN "mktOrder" o ON o."mktCustomerId" = c.id AND o."deletedAt" IS NULL
        WHERE c."deletedAt" IS NULL
          ${engDeptClause}
        GROUP BY c.id
      ) sub
      GROUP BY range
      ORDER BY MIN(order_count)`,
      engParams,
      undefined,
      { shouldBypassPermissionChecks: true },
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
    departmentIds?: string[],
  ) {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const params: (string | number | string[])[] = [
      dateRange.startDate,
      dateRange.endDate,
      limit,
    ];

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      'o."accountOwnerId"',
      departmentIds,
      4,
    );

    if (deptFilter) {
      params.push(deptFilter.params);
    }

    const rows = await dataSource.query(
      `SELECT
        c."name" AS name,
        COALESCE(SUM(o."totalAmount"), 0) AS revenue,
        COUNT(o.id) AS order_count
      FROM "mktCustomer" c
      JOIN "mktOrder" o ON o."mktCustomerId" = c.id
      WHERE c."deletedAt" IS NULL
        AND o."deletedAt" IS NULL
        AND o.status = 'COMPLETED'
        AND o."createdAt" BETWEEN $1 AND $2
        ${deptFilter?.clause ?? ''}
      GROUP BY c.id, c."name"
      ORDER BY revenue DESC
      LIMIT $3`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
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
