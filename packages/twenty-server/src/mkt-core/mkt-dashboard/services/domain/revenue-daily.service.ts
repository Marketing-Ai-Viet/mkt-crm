import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';
import { QueryRunner } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceDataSource } from 'src/engine/twenty-orm/datasource/workspace.datasource';
import { createWorkspaceScopedRunner } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import { DepartmentFilterHelper } from 'src/mkt-core/mkt-dashboard/utils/department-filter.helper';
import {
  RevenueDailyInput,
  DepartmentScope,
} from 'src/mkt-core/mkt-dashboard/dto/input/revenue-daily.input';
import {
  RevenueDailyOutput,
  DailyRevenueItem,
  DailyRevenueMetric,
  DepartmentDailyRevenue,
} from 'src/mkt-core/mkt-dashboard/dto/output/revenue-daily.output';
import { GapAnalysisOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';
import { RevenueMode } from 'src/mkt-core/mkt-dashboard/types/revenue-mode.type';
import { StatisticsUtils } from 'src/mkt-core/mkt-dashboard/utils/statistics.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'RevenueDailyService';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

type RawDailyRow = {
  period: string;
  order_count: string;
  total_revenue: string;
};

type RawDepartmentDailyRow = {
  department_id: string;
  department_name: string;
  department_type: string;
  period: string;
  order_count: string;
  total_revenue: string;
};

@Injectable()
export class RevenueDailyService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async getStats(input: RevenueDailyInput): Promise<RevenueDailyOutput> {
    const now = DateTimeUtils.now();
    const year = input.year;
    const week = input.week ?? now.weekNumber;
    const mode = input.revenueMode ?? RevenueMode.DUAL;
    const scope = input.departmentScope ?? DepartmentScope.ALL;

    // Resolve week → date range (Mon-Sun)
    const weekStart = DateTime.fromObject(
      { weekYear: year, weekNumber: week, weekday: 1 },
      { zone: 'utc' },
    ).startOf('day');
    const weekEnd = weekStart.plus({ days: 6 }).endOf('day');

    const startDate = weekStart.toISO() as string;
    const endDate = weekEnd.toISO() as string;

    const { dataSource, queryRunner, release } =
      await createWorkspaceScopedRunner(
        this.scopedWorkspaceContextFactory,
        this.twentyORMGlobalManager,
      );

    try {
      const departmentIds = await DepartmentFilterHelper.resolveDepartmentIds(
        dataSource,
        input.departmentId,
        queryRunner,
      );

      let collected: DailyRevenueMetric | null = null;
      let order: DailyRevenueMetric | null = null;
      let gap: GapAnalysisOutput | null = null;

      if (mode === RevenueMode.CASH) {
        collected = await this.buildCashDailyMetric(
          dataSource,
          queryRunner,
          startDate,
          endDate,
          weekStart,
          departmentIds,
        );
      } else if (mode === RevenueMode.ORDER) {
        order = await this.buildOrderDailyMetric(
          dataSource,
          queryRunner,
          startDate,
          endDate,
          weekStart,
          departmentIds,
        );
      } else {
        [collected, order] = await Promise.all([
          this.buildCashDailyMetric(
            dataSource,
            queryRunner,
            startDate,
            endDate,
            weekStart,
            departmentIds,
          ),
          this.buildOrderDailyMetric(
            dataSource,
            queryRunner,
            startDate,
            endDate,
            weekStart,
            departmentIds,
          ),
        ]);

        const avgCollectionDays = await this.getAvgCollectionDays(
          dataSource,
          queryRunner,
          startDate,
          endDate,
          departmentIds,
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

      // Department breakdown (only when scope != ALL)
      let departmentBreakdown: DepartmentDailyRevenue[] | null = null;

      if (scope !== DepartmentScope.ALL) {
        const deptType =
          scope === DepartmentScope.BY_TEAM ? 'TEAM' : 'DEPARTMENT';

        departmentBreakdown = await this.getDepartmentBreakdown(
          dataSource,
          queryRunner,
          startDate,
          endDate,
          weekStart,
          deptType,
          mode,
          departmentIds,
        );
      }

      // Primary metric for backward compat
      const primary = (
        mode === RevenueMode.ORDER ? order : collected
      ) as DailyRevenueMetric;

      return {
        year,
        week,
        weekStart: weekStart.toISODate() as string,
        weekEnd: weekEnd.toISODate() as string,
        totalRevenue: primary.totalRevenue,
        dailyRevenue: primary.dailyRevenue,
        collected,
        order,
        gap,
        departmentBreakdown,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue daily stats', {
        error: getErrorMessage(error),
        year,
        week,
      });
      throw error;
    } finally {
      await release();
    }
  }

  // ─── Metric Builders ────────────────────────────────────────────────

  private async buildCashDailyMetric(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    weekStart: DateTime,
    departmentIds?: string[],
  ): Promise<DailyRevenueMetric> {
    const rows = await this.getCashRevenueByDay(
      dataSource,
      qr,
      startDate,
      endDate,
      departmentIds,
    );

    const dailyRevenue = this.fillDailyGaps(rows, weekStart);
    const totalRevenue = MoneyUtils.sumBy(dailyRevenue, 'amount').toNumber();

    return { totalRevenue, dailyRevenue };
  }

  private async buildOrderDailyMetric(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    weekStart: DateTime,
    departmentIds?: string[],
  ): Promise<DailyRevenueMetric> {
    const rows = await this.getOrderRevenueByDay(
      dataSource,
      qr,
      startDate,
      endDate,
      departmentIds,
    );

    const dailyRevenue = this.fillDailyGaps(rows, weekStart);
    const totalRevenue = MoneyUtils.sumBy(dailyRevenue, 'amount').toNumber();

    return { totalRevenue, dailyRevenue };
  }

  // ─── Cash (Payment-based) Queries ───────────────────────────────────

  private async getCashRevenueByDay(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    departmentIds?: string[],
  ): Promise<RawDailyRow[]> {
    const params: (string | string[])[] = [startDate, endDate];
    const nextParam = 3;

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      'o."accountOwnerId"',
      departmentIds,
      nextParam,
    );

    if (deptFilter) {
      params.push(deptFilter.params);
    }

    return dataSource.query(
      `SELECT
        DATE_TRUNC('day', p."confirmedAt") AS period,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS total_revenue
      FROM "mktPayment" p
      JOIN "mktOrder" o ON p."mktOrderId" = o.id
      WHERE p."deletedAt" IS NULL
        AND p.status = 'CONFIRMED'
        AND p."confirmedAt" BETWEEN $1 AND $2
        ${deptFilter?.clause ?? ''}
      GROUP BY DATE_TRUNC('day', p."confirmedAt")
      ORDER BY period`,
      params,
      qr,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ─── Order (Completion-based) Queries ───────────────────────────────

  private async getOrderRevenueByDay(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    departmentIds?: string[],
  ): Promise<RawDailyRow[]> {
    const params: (string | string[])[] = [startDate, endDate];
    const nextParam = 3;

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      '"accountOwnerId"',
      departmentIds,
      nextParam,
    );

    if (deptFilter) {
      params.push(deptFilter.params);
    }

    return dataSource.query(
      `SELECT
        DATE_TRUNC('day', "completedAt") AS period,
        COUNT(*) AS order_count,
        SUM("totalAmount") - SUM(COALESCE("refundAmount", 0)) AS total_revenue
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
        AND status = 'COMPLETED'
        AND "completedAt" IS NOT NULL
        AND "completedAt" BETWEEN $1 AND $2
        ${deptFilter?.clause ?? ''}
      GROUP BY DATE_TRUNC('day', "completedAt")
      ORDER BY period`,
      params,
      qr,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ─── Department Breakdown ───────────────────────────────────────────

  private async getDepartmentBreakdown(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    weekStart: DateTime,
    departmentType: string,
    mode: RevenueMode,
    departmentIds?: string[],
  ): Promise<DepartmentDailyRevenue[]> {
    // Use cash-based query for CASH/DUAL, order-based for ORDER
    const rows =
      mode === RevenueMode.ORDER
        ? await this.getOrderDeptDailyRows(
            dataSource,
            qr,
            startDate,
            endDate,
            departmentType,
            departmentIds,
          )
        : await this.getCashDeptDailyRows(
            dataSource,
            qr,
            startDate,
            endDate,
            departmentType,
            departmentIds,
          );

    return this.groupDepartmentRows(rows, weekStart);
  }

  private async getCashDeptDailyRows(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    departmentType: string,
    departmentIds?: string[],
  ): Promise<RawDepartmentDailyRow[]> {
    const params: (string | string[])[] = [startDate, endDate, departmentType];
    let nextParam = 4;

    let deptIdClause = '';

    if (departmentIds) {
      params.push(departmentIds);
      deptIdClause = `AND d.id = ANY($${nextParam})`;
      nextParam++;
    }

    return dataSource.query(
      `SELECT
        d.id AS department_id,
        d."departmentName" AS department_name,
        d."departmentType" AS department_type,
        DATE_TRUNC('day', p."confirmedAt") AS period,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS total_revenue
      FROM "mktDepartment" d
      JOIN "workspaceMember" wm ON wm."departmentId" = d.id
      JOIN "mktOrder" o ON o."accountOwnerId" = wm.id
      JOIN "mktPayment" p ON p."mktOrderId" = o.id
      WHERE d."deletedAt" IS NULL
        AND p."deletedAt" IS NULL
        AND p.status = 'CONFIRMED'
        AND p."confirmedAt" BETWEEN $1 AND $2
        AND d."departmentType" = $3
        ${deptIdClause}
      GROUP BY d.id, d."departmentName", d."departmentType", DATE_TRUNC('day', p."confirmedAt")
      ORDER BY d."departmentName", period`,
      params,
      qr,
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getOrderDeptDailyRows(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    departmentType: string,
    departmentIds?: string[],
  ): Promise<RawDepartmentDailyRow[]> {
    const params: (string | string[])[] = [startDate, endDate, departmentType];
    let nextParam = 4;

    let deptIdClause = '';

    if (departmentIds) {
      params.push(departmentIds);
      deptIdClause = `AND d.id = ANY($${nextParam})`;
      nextParam++;
    }

    return dataSource.query(
      `SELECT
        d.id AS department_id,
        d."departmentName" AS department_name,
        d."departmentType" AS department_type,
        DATE_TRUNC('day', o."completedAt") AS period,
        COUNT(o.id) AS order_count,
        SUM(o."totalAmount") - SUM(COALESCE(o."refundAmount", 0)) AS total_revenue
      FROM "mktDepartment" d
      JOIN "workspaceMember" wm ON wm."departmentId" = d.id
      JOIN "mktOrder" o ON o."accountOwnerId" = wm.id
      WHERE d."deletedAt" IS NULL
        AND o."deletedAt" IS NULL
        AND o.status = 'COMPLETED'
        AND o."completedAt" IS NOT NULL
        AND o."completedAt" BETWEEN $1 AND $2
        AND d."departmentType" = $3
        ${deptIdClause}
      GROUP BY d.id, d."departmentName", d."departmentType", DATE_TRUNC('day', o."completedAt")
      ORDER BY d."departmentName", period`,
      params,
      qr,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ─── Gap Analysis ──────────────────────────────────────────────────

  private async getAvgCollectionDays(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    departmentIds?: string[],
  ): Promise<number | null> {
    const params: (string | string[])[] = [startDate, endDate];
    const nextParam = 3;

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      'o."accountOwnerId"',
      departmentIds,
      nextParam,
    );

    if (deptFilter) {
      params.push(deptFilter.params);
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
        AND p.status = 'CONFIRMED'
        AND o."completedAt" IS NOT NULL
        AND p."confirmedAt" BETWEEN $1 AND $2
        ${deptFilter?.clause ?? ''}`,
      params,
      qr,
      { shouldBypassPermissionChecks: true },
    );

    const days = rows[0]?.avg_collection_days;

    return days != null ? MoneyUtils.round(Number(days)).toNumber() : null;
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /**
   * Fill missing days with 0 values to ensure all 7 days of the week are returned.
   */
  private fillDailyGaps(
    rows: RawDailyRow[],
    weekStart: DateTime,
  ): DailyRevenueItem[] {
    const rowMap = new Map<string, RawDailyRow>();

    for (const row of rows) {
      const dateKey = DateTime.fromJSDate(new Date(row.period), {
        zone: 'utc',
      }).toISODate() as string;

      rowMap.set(dateKey, row);
    }

    const result: DailyRevenueItem[] = [];

    for (let i = 0; i < 7; i++) {
      const day = weekStart.plus({ days: i });
      const dateKey = day.toISODate() as string;
      const row = rowMap.get(dateKey);

      result.push({
        date: dateKey,
        dayOfWeek: DAY_NAMES[i],
        amount: row ? MoneyUtils.from(row.total_revenue).toNumber() : 0,
        orderCount: row ? Number(row.order_count) : 0,
      });
    }

    return result;
  }

  /**
   * Group raw department-daily rows into DepartmentDailyRevenue[] with filled gaps.
   */
  private groupDepartmentRows(
    rows: RawDepartmentDailyRow[],
    weekStart: DateTime,
  ): DepartmentDailyRevenue[] {
    const deptMap = new Map<
      string,
      {
        departmentId: string;
        departmentName: string;
        departmentType: string;
        rows: RawDailyRow[];
      }
    >();

    for (const row of rows) {
      let entry = deptMap.get(row.department_id);

      if (!entry) {
        entry = {
          departmentId: row.department_id,
          departmentName: row.department_name,
          departmentType: row.department_type,
          rows: [],
        };
        deptMap.set(row.department_id, entry);
      }

      entry.rows.push({
        period: row.period,
        order_count: row.order_count,
        total_revenue: row.total_revenue,
      });
    }

    const result: DepartmentDailyRevenue[] = [];

    for (const entry of deptMap.values()) {
      const dailyRevenue = this.fillDailyGaps(entry.rows, weekStart);
      const totalRevenue = MoneyUtils.sumBy(dailyRevenue, 'amount').toNumber();

      result.push({
        departmentId: entry.departmentId,
        departmentName: entry.departmentName,
        departmentType: entry.departmentType,
        totalRevenue,
        dailyRevenue,
      });
    }

    return result;
  }
}
