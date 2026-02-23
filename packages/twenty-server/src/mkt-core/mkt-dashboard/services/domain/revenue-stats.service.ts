import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceDataSource } from 'src/engine/twenty-orm/datasource/workspace.datasource';
import { getWorkspaceDataSourceWithSchema } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import { DepartmentFilterHelper } from 'src/mkt-core/mkt-dashboard/utils/department-filter.helper';
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
import {
  RevenueStatsOutput,
  RevenueMetricOutput,
} from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';
import { DASHBOARD_LIMITS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-limits';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { RevenueMode } from 'src/mkt-core/mkt-dashboard/types/revenue-mode.type';
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

      const { staffId } = input;
      const mode = input.revenueMode ?? RevenueMode.DUAL;
      const limit = input.limit ?? DASHBOARD_LIMITS.TOP_CUSTOMERS;
      const periodProgress = this.dateRangeService.getPeriodProgress(dateRange);

      let collected: RevenueMetricOutput | null = null;
      let order: RevenueMetricOutput | null = null;
      let gap: RevenueStatsOutput['gap'] = null;

      if (mode === RevenueMode.CASH) {
        collected = await this.buildCashMetric(
          dataSource,
          dateRange,
          input.period,
          periodProgress,
          limit,
          departmentIds,
          staffId,
        );
      } else if (mode === RevenueMode.ORDER) {
        order = await this.buildOrderMetric(
          dataSource,
          dateRange,
          input.period,
          periodProgress,
          limit,
          departmentIds,
          staffId,
        );
      } else {
        // DUAL — run cash + order in parallel, then compute gap
        [collected, order] = await Promise.all([
          this.buildCashMetric(
            dataSource,
            dateRange,
            input.period,
            periodProgress,
            limit,
            departmentIds,
            staffId,
          ),
          this.buildOrderMetric(
            dataSource,
            dateRange,
            input.period,
            periodProgress,
            limit,
            departmentIds,
            staffId,
          ),
        ]);

        const avgCollectionDays = await this.getAvgCollectionDays(
          dataSource,
          dateRange,
          departmentIds,
          staffId,
        );

        gap = {
          collectionRate: StatisticsUtils.collectionRate(
            collected.totalRevenue,
            order.totalRevenue,
          ),
          revenueGap: MoneyUtils.subtract(
            order.totalRevenue,
            collected.totalRevenue,
          ).toNumber(),
          avgCollectionDays,
        };
      }

      // Backward compat: map from primary metric
      // CASH/DUAL → collected is guaranteed set; ORDER → order is guaranteed set
      const primary = (
        mode === RevenueMode.ORDER ? order : collected
      ) as RevenueMetricOutput;

      return {
        totalRevenue: primary.totalRevenue,
        revenueByPeriod: primary.revenueByPeriod,
        revenueByDepartment: primary.revenueByDepartment,
        revenueByStaff: primary.revenueByStaff,
        growthRate: primary.growthRate,
        projectedRevenue: primary.projectedRevenue,
        collected,
        order,
        gap,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue stats', {
        error: getErrorMessage(error),
        period: input.period,
      });
      throw error;
    }
  }

  // ─── Metric Builders ────────────────────────────────────────────────

  private async buildCashMetric(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    period: DashboardPeriod,
    periodProgress: { elapsedDays: number; totalDays: number },
    limit: number,
    departmentIds?: string[],
    staffId?: string,
  ): Promise<RevenueMetricOutput> {
    const [byPeriod, byStaff, rawByDept, previousTotal] = await Promise.all([
      this.getCashRevenueByPeriod(
        dataSource,
        dateRange,
        period,
        departmentIds,
        staffId,
      ),
      this.getCashRevenueByStaff(
        dataSource,
        dateRange,
        limit,
        departmentIds,
        staffId,
      ),
      this.getCashRevenueByDepartment(dataSource, dateRange, departmentIds),
      this.getCashPreviousPeriodRevenue(
        dataSource,
        period,
        dateRange,
        departmentIds,
        staffId,
      ),
    ]);

    const totalRevenue = MoneyUtils.sumBy(byPeriod, 'amount').toNumber();
    const growthRate = StatisticsUtils.percentageChange(
      previousTotal,
      totalRevenue,
    );
    const projectedRevenue =
      periodProgress.elapsedDays < periodProgress.totalDays
        ? StatisticsUtils.projectValue(
            totalRevenue,
            periodProgress.elapsedDays,
            periodProgress.totalDays,
          )
        : null;
    const revenueByDepartment =
      DashboardDataTransformer.transformRevenueByDepartment(
        rawByDept,
        totalRevenue,
      );

    return {
      totalRevenue,
      revenueByPeriod: byPeriod,
      revenueByDepartment,
      revenueByStaff: byStaff,
      growthRate,
      projectedRevenue,
    };
  }

  private async buildOrderMetric(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    period: DashboardPeriod,
    periodProgress: { elapsedDays: number; totalDays: number },
    limit: number,
    departmentIds?: string[],
    staffId?: string,
  ): Promise<RevenueMetricOutput> {
    const [byPeriod, byStaff, rawByDept, previousTotal] = await Promise.all([
      this.getOrderRevenueByPeriod(
        dataSource,
        dateRange,
        period,
        departmentIds,
        staffId,
      ),
      this.getOrderRevenueByStaff(
        dataSource,
        dateRange,
        limit,
        departmentIds,
        staffId,
      ),
      this.getOrderRevenueByDepartment(dataSource, dateRange, departmentIds),
      this.getOrderPreviousPeriodRevenue(
        dataSource,
        period,
        dateRange,
        departmentIds,
        staffId,
      ),
    ]);

    const totalRevenue = MoneyUtils.sumBy(byPeriod, 'amount').toNumber();
    const growthRate = StatisticsUtils.percentageChange(
      previousTotal,
      totalRevenue,
    );
    const projectedRevenue =
      periodProgress.elapsedDays < periodProgress.totalDays
        ? StatisticsUtils.projectValue(
            totalRevenue,
            periodProgress.elapsedDays,
            periodProgress.totalDays,
          )
        : null;
    const revenueByDepartment =
      DashboardDataTransformer.transformRevenueByDepartment(
        rawByDept,
        totalRevenue,
      );

    return {
      totalRevenue,
      revenueByPeriod: byPeriod,
      revenueByDepartment,
      revenueByStaff: byStaff,
      growthRate,
      projectedRevenue,
    };
  }

  // ─── Cash (Payment-based) Queries ───────────────────────────────────

  private async getCashRevenueByPeriod(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    period: DashboardPeriod,
    departmentIds?: string[],
    staffId?: string,
  ) {
    const params: (string | number)[] = [
      dateRange.startDate,
      dateRange.endDate,
      DASHBOARD_LIMITS.REVENUE_BY_PERIOD_MAX,
    ];

    let nextParam = 4;
    let staffClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND o."accountOwnerId" = $${nextParam}`;
      nextParam++;
    }

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      'o."accountOwnerId"',
      departmentIds,
      nextParam,
    );

    if (deptFilter) {
      params.push(deptFilter.params as unknown as string);
    }

    const truncInterval = this.dateRangeService.getDateTruncInterval(period);

    const rows: RawRevenueRow[] = await dataSource.query(
      `SELECT
        DATE_TRUNC('${truncInterval}', p."confirmedAt") AS period,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS total_revenue
      FROM "mktPayment" p
      JOIN "mktOrder" o ON p."mktOrderId" = o.id
      WHERE p."deletedAt" IS NULL
        AND p.status IN ('COMPLETED', 'CONFIRMED')
        AND p."confirmedAt" BETWEEN $1 AND $2
        ${staffClause}
        ${deptFilter?.clause ?? ''}
      GROUP BY DATE_TRUNC('${truncInterval}', p."confirmedAt")
      ORDER BY period
      LIMIT $3`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformRevenueByPeriod(rows);
  }

  private async getCashRevenueByStaff(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    limit: number,
    departmentIds?: string[],
    staffId?: string,
  ) {
    const params: (string | number)[] = [
      dateRange.startDate,
      dateRange.endDate,
      limit,
    ];

    let nextParam = 4;
    let staffClause = '';
    let deptClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND wm.id = $${nextParam}`;
      nextParam++;
    }

    if (departmentIds) {
      params.push(departmentIds as unknown as string);
      deptClause = `AND wm."departmentId" = ANY($${nextParam})`;
    }

    const rows: RawRevenueByStaffRow[] = await dataSource.query(
      `SELECT
        wm."nameFirstName" || ' ' || wm."nameLastName" AS staff_name,
        wm.id AS staff_id,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS total_revenue,
        COALESCE(d."departmentName", '') AS department_name
      FROM "mktPayment" p
      JOIN "mktOrder" o ON p."mktOrderId" = o.id
      JOIN "workspaceMember" wm ON o."accountOwnerId" = wm.id
      LEFT JOIN "mktDepartment" d ON wm."departmentId" = d.id
      WHERE p."deletedAt" IS NULL
        AND p.status IN ('COMPLETED', 'CONFIRMED')
        AND p."confirmedAt" BETWEEN $1 AND $2
        ${staffClause}
        ${deptClause}
      GROUP BY wm.id, wm."nameFirstName", wm."nameLastName", d."departmentName"
      ORDER BY total_revenue DESC
      LIMIT $3`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformRevenueByStaff(rows);
  }

  private async getCashRevenueByDepartment(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    departmentIds?: string[],
  ): Promise<RawRevenueByDepartmentRow[]> {
    const params: string[] = [dateRange.startDate, dateRange.endDate];
    let deptClause = '';

    if (departmentIds) {
      params.push(departmentIds as unknown as string);
      deptClause = `AND d.id = ANY($3)`;
    }

    return dataSource.query(
      `SELECT
        d."departmentName" AS department_name,
        d.id AS department_id,
        COALESCE(SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)), 0) AS amount
      FROM "mktDepartment" d
      LEFT JOIN "workspaceMember" wm ON wm."departmentId" = d.id
      LEFT JOIN "mktOrder" o ON o."accountOwnerId" = wm.id
        AND o."deletedAt" IS NULL
      LEFT JOIN "mktPayment" p ON p."mktOrderId" = o.id
        AND p."deletedAt" IS NULL
        AND p.status IN ('COMPLETED', 'CONFIRMED')
        AND p."confirmedAt" BETWEEN $1 AND $2
      WHERE d."deletedAt" IS NULL
        ${deptClause}
      GROUP BY d.id, d."departmentName"
      HAVING COALESCE(SUM(p.amount), 0) > 0
      ORDER BY amount DESC`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getCashPreviousPeriodRevenue(
    dataSource: WorkspaceDataSource,
    period: DashboardPeriod,
    currentRange: DateRange,
    departmentIds?: string[],
    staffId?: string,
  ): Promise<number> {
    const previousRange = this.dateRangeService.getPreviousPeriod(
      period,
      currentRange,
    );

    const params: string[] = [previousRange.startDate, previousRange.endDate];

    let nextParam = 3;
    let staffClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND o."accountOwnerId" = $${nextParam}`;
      nextParam++;
    }

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      'o."accountOwnerId"',
      departmentIds,
      nextParam,
    );

    if (deptFilter) {
      params.push(deptFilter.params as unknown as string);
    }

    const rows = await dataSource.query(
      `SELECT COALESCE(
        SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)), 0
      ) AS total_revenue
      FROM "mktPayment" p
      JOIN "mktOrder" o ON p."mktOrderId" = o.id
      WHERE p."deletedAt" IS NULL
        AND p.status IN ('COMPLETED', 'CONFIRMED')
        AND p."confirmedAt" BETWEEN $1 AND $2
        ${staffClause}
        ${deptFilter?.clause ?? ''}`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return MoneyUtils.from(rows[0]?.total_revenue ?? '0').toNumber();
  }

  // ─── Order (Completion-based) Queries ───────────────────────────────

  private async getOrderRevenueByPeriod(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    period: DashboardPeriod,
    departmentIds?: string[],
    staffId?: string,
  ) {
    const params: (string | number)[] = [
      dateRange.startDate,
      dateRange.endDate,
      DASHBOARD_LIMITS.REVENUE_BY_PERIOD_MAX,
    ];

    let nextParam = 4;
    let staffClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND "accountOwnerId" = $${nextParam}`;
      nextParam++;
    }

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      '"accountOwnerId"',
      departmentIds,
      nextParam,
    );

    if (deptFilter) {
      params.push(deptFilter.params as unknown as string);
    }

    const truncInterval = this.dateRangeService.getDateTruncInterval(period);

    const rows: RawRevenueRow[] = await dataSource.query(
      `SELECT
        DATE_TRUNC('${truncInterval}', "completedAt") AS period,
        COUNT(*) AS order_count,
        SUM("totalAmount") - SUM(COALESCE("refundAmount", 0)) AS total_revenue,
        AVG("totalAmount") AS avg_order_value
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
        AND status = 'COMPLETED'
        AND "completedAt" IS NOT NULL
        AND "completedAt" BETWEEN $1 AND $2
        ${staffClause}
        ${deptFilter?.clause ?? ''}
      GROUP BY DATE_TRUNC('${truncInterval}', "completedAt")
      ORDER BY period
      LIMIT $3`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformRevenueByPeriod(rows);
  }

  private async getOrderRevenueByStaff(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    limit: number,
    departmentIds?: string[],
    staffId?: string,
  ) {
    const params: (string | number)[] = [
      dateRange.startDate,
      dateRange.endDate,
      limit,
    ];

    let nextParam = 4;
    let staffClause = '';
    let deptClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND wm.id = $${nextParam}`;
      nextParam++;
    }

    if (departmentIds) {
      params.push(departmentIds as unknown as string);
      deptClause = `AND wm."departmentId" = ANY($${nextParam})`;
    }

    const rows: RawRevenueByStaffRow[] = await dataSource.query(
      `SELECT
        wm."nameFirstName" || ' ' || wm."nameLastName" AS staff_name,
        wm.id AS staff_id,
        COUNT(o.id) AS order_count,
        SUM(o."totalAmount") - SUM(COALESCE(o."refundAmount", 0)) AS total_revenue,
        COALESCE(d."departmentName", '') AS department_name
      FROM "mktOrder" o
      JOIN "workspaceMember" wm ON o."accountOwnerId" = wm.id
      LEFT JOIN "mktDepartment" d ON wm."departmentId" = d.id
      WHERE o."deletedAt" IS NULL
        AND o.status = 'COMPLETED'
        AND o."completedAt" IS NOT NULL
        AND o."completedAt" BETWEEN $1 AND $2
        ${staffClause}
        ${deptClause}
      GROUP BY wm.id, wm."nameFirstName", wm."nameLastName", d."departmentName"
      ORDER BY total_revenue DESC
      LIMIT $3`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformRevenueByStaff(rows);
  }

  private async getOrderRevenueByDepartment(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    departmentIds?: string[],
  ): Promise<RawRevenueByDepartmentRow[]> {
    const params: string[] = [dateRange.startDate, dateRange.endDate];
    let deptClause = '';

    if (departmentIds) {
      params.push(departmentIds as unknown as string);
      deptClause = `AND d.id = ANY($3)`;
    }

    return dataSource.query(
      `SELECT
        d."departmentName" AS department_name,
        d.id AS department_id,
        COALESCE(SUM(o."totalAmount") - SUM(COALESCE(o."refundAmount", 0)), 0) AS amount
      FROM "mktDepartment" d
      LEFT JOIN "workspaceMember" wm ON wm."departmentId" = d.id
      LEFT JOIN "mktOrder" o ON o."accountOwnerId" = wm.id
        AND o."deletedAt" IS NULL
        AND o.status = 'COMPLETED'
        AND o."completedAt" IS NOT NULL
        AND o."completedAt" BETWEEN $1 AND $2
      WHERE d."deletedAt" IS NULL
        ${deptClause}
      GROUP BY d.id, d."departmentName"
      HAVING COALESCE(SUM(o."totalAmount"), 0) > 0
      ORDER BY amount DESC`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getOrderPreviousPeriodRevenue(
    dataSource: WorkspaceDataSource,
    period: DashboardPeriod,
    currentRange: DateRange,
    departmentIds?: string[],
    staffId?: string,
  ): Promise<number> {
    const previousRange = this.dateRangeService.getPreviousPeriod(
      period,
      currentRange,
    );

    const params: string[] = [previousRange.startDate, previousRange.endDate];

    let nextParam = 3;
    let staffClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND "accountOwnerId" = $${nextParam}`;
      nextParam++;
    }

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      '"accountOwnerId"',
      departmentIds,
      nextParam,
    );

    if (deptFilter) {
      params.push(deptFilter.params as unknown as string);
    }

    const rows = await dataSource.query(
      `SELECT COALESCE(
        SUM("totalAmount") - SUM(COALESCE("refundAmount", 0)), 0
      ) AS total_revenue
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
        AND status = 'COMPLETED'
        AND "completedAt" IS NOT NULL
        AND "completedAt" BETWEEN $1 AND $2
        ${staffClause}
        ${deptFilter?.clause ?? ''}`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return MoneyUtils.from(rows[0]?.total_revenue ?? '0').toNumber();
  }

  // ─── Gap Analysis ──────────────────────────────────────────────────

  private async getAvgCollectionDays(
    dataSource: WorkspaceDataSource,
    dateRange: DateRange,
    departmentIds?: string[],
    staffId?: string,
  ): Promise<number | null> {
    const params: string[] = [dateRange.startDate, dateRange.endDate];

    let nextParam = 3;
    let staffClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND o."accountOwnerId" = $${nextParam}`;
      nextParam++;
    }

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      'o."accountOwnerId"',
      departmentIds,
      nextParam,
    );

    if (deptFilter) {
      params.push(deptFilter.params as unknown as string);
    }

    const rows = await dataSource.query(
      `SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (p."confirmedAt" - o."completedAt")) / 86400),
        0
      ) AS avg_collection_days
      FROM "mktPayment" p
      JOIN "mktOrder" o ON p."mktOrderId" = o.id
      WHERE p."deletedAt" IS NULL
        AND o."deletedAt" IS NULL
        AND p.status IN ('COMPLETED', 'CONFIRMED')
        AND o."completedAt" IS NOT NULL
        AND p."confirmedAt" BETWEEN $1 AND $2
        ${staffClause}
        ${deptFilter?.clause ?? ''}`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    const days = rows[0]?.avg_collection_days;

    return days != null ? MoneyUtils.round(Number(days)).toNumber() : null;
  }
}
