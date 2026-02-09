import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { getWorkspaceDataSourceWithSchema } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import {
  DashboardDateRangeService,
  DateRange,
} from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import {
  DashboardDataTransformer,
  RawRevenueRow,
  RawRevenueByStaffRow,
  RawRevenueByDepartmentRow,
} from 'src/mkt-core/mkt-dashboard/utils/dashboard-data.transformer';
import { StatisticsUtils } from 'src/mkt-core/mkt-dashboard/utils/statistics.utils';
import { RevenueStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-stats.input';
import { RevenueStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';
import { DASHBOARD_LIMITS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-limits';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'RevenueStatsService';

@Injectable()
export class RevenueStatsService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly dateRangeService: DashboardDateRangeService,
  ) {}

  async getStats(input: RevenueStatsInput): Promise<RevenueStatsOutput> {
    const dateRange = this.dateRangeService.resolve(
      input.period as DashboardPeriod,
      input.startDate,
      input.endDate,
    );

    try {
      // Execute all queries in parallel
      const [
        revenueByPeriod,
        revenueByStaff,
        revenueByDepartment,
        previousPeriodTotal,
      ] = await Promise.all([
        this.getRevenueByPeriod(dateRange),
        this.getRevenueByStaff(
          dateRange,
          input.limit ?? DASHBOARD_LIMITS.TOP_CUSTOMERS,
        ),
        this.getRevenueByDepartment(dateRange),
        this.getPreviousPeriodRevenue(
          input.period as DashboardPeriod,
          dateRange,
        ),
      ]);

      const totalRevenue = MoneyUtils.sumBy(
        revenueByPeriod,
        'amount',
      ).toNumber();

      const growthRate = StatisticsUtils.percentageChange(
        previousPeriodTotal,
        totalRevenue,
      );

      // Calculate projected revenue
      const periodProgress = this.dateRangeService.getPeriodProgress(dateRange);
      const projectedRevenue =
        periodProgress.elapsedDays < periodProgress.totalDays
          ? StatisticsUtils.projectValue(
              totalRevenue,
              periodProgress.elapsedDays,
              periodProgress.totalDays,
            )
          : null;

      const transformedByDepartment =
        DashboardDataTransformer.transformRevenueByDepartment(
          revenueByDepartment,
          totalRevenue,
        );

      return {
        totalRevenue,
        revenueByPeriod,
        revenueByDepartment: transformedByDepartment,
        revenueByStaff,
        growthRate,
        projectedRevenue,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue stats', {
        error: getErrorMessage(error),
        period: input.period,
      });
      throw error;
    }
  }

  private async getRevenueByPeriod(dateRange: DateRange) {
    // Uses raw SQL query via repository's query method
    // SQL from design doc 7.1:
    // SELECT DATE_TRUNC('month', "createdAt") AS period, COUNT(*) AS order_count,
    //   SUM("totalAmount") AS total_revenue, AVG("totalAmount") AS avg_order_value
    // FROM "mktOrder" WHERE "deletedAt" IS NULL AND status = 'COMPLETED'
    //   AND "createdAt" BETWEEN :startDate AND :endDate
    // GROUP BY DATE_TRUNC('month', "createdAt") ORDER BY period

    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows: RawRevenueRow[] = await dataSource.query(
      `SELECT
        DATE_TRUNC('month', "createdAt") AS period,
        COUNT(*) AS order_count,
        SUM("totalAmount") AS total_revenue,
        AVG("totalAmount") AS avg_order_value
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
        AND status = 'COMPLETED'
        AND "createdAt" BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY period
      LIMIT $3`,
      [
        dateRange.startDate,
        dateRange.endDate,
        DASHBOARD_LIMITS.REVENUE_BY_PERIOD_MAX,
      ],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformRevenueByPeriod(rows);
  }

  private async getRevenueByStaff(dateRange: DateRange, limit: number) {
    // SQL from design doc 7.2
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows: RawRevenueByStaffRow[] = await dataSource.query(
      `SELECT
        wm."nameFirstName" || ' ' || wm."nameLastName" AS staff_name,
        wm.id AS staff_id,
        COUNT(o.id) AS order_count,
        SUM(o."totalAmount") AS total_revenue,
        COALESCE(d."departmentName", '') AS department_name
      FROM "mktOrder" o
      JOIN "workspaceMember" wm ON o."accountOwnerId" = wm.id
      LEFT JOIN "mktDepartment" d ON wm."departmentId" = d.id
      WHERE o."deletedAt" IS NULL
        AND o.status = 'COMPLETED'
        AND o."createdAt" BETWEEN $1 AND $2
      GROUP BY wm.id, wm."nameFirstName", wm."nameLastName", d."departmentName"
      ORDER BY total_revenue DESC
      LIMIT $3`,
      [dateRange.startDate, dateRange.endDate, limit],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformRevenueByStaff(rows);
  }

  private async getRevenueByDepartment(
    dateRange: DateRange,
  ): Promise<RawRevenueByDepartmentRow[]> {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    return dataSource.query(
      `SELECT
        d."departmentName" AS department_name,
        d.id AS department_id,
        COALESCE(SUM(o."totalAmount"), 0) AS amount
      FROM "mktDepartment" d
      LEFT JOIN "workspaceMember" wm ON wm."departmentId" = d.id
      LEFT JOIN "mktOrder" o ON o."accountOwnerId" = wm.id
        AND o."deletedAt" IS NULL
        AND o.status = 'COMPLETED'
        AND o."createdAt" BETWEEN $1 AND $2
      WHERE d."deletedAt" IS NULL
      GROUP BY d.id, d."departmentName"
      HAVING COALESCE(SUM(o."totalAmount"), 0) > 0
      ORDER BY amount DESC`,
      [dateRange.startDate, dateRange.endDate],
      undefined,
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getPreviousPeriodRevenue(
    period: DashboardPeriod,
    currentRange: DateRange,
  ): Promise<number> {
    const previousRange = this.dateRangeService.getPreviousPeriod(
      period,
      currentRange,
    );

    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows = await dataSource.query(
      `SELECT COALESCE(SUM("totalAmount"), 0) AS total_revenue
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
        AND status = 'COMPLETED'
        AND "createdAt" BETWEEN $1 AND $2`,
      [previousRange.startDate, previousRange.endDate],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return MoneyUtils.from(rows[0]?.total_revenue ?? '0').toNumber();
  }
}
