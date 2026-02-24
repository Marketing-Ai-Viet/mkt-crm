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
import { RevenueDailyByMonthInput } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-daily-by-month.input';
import { RevenueDailyByQuarterInput } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-daily-by-quarter.input';
import {
  RevenueDailyOutput,
  DailyRevenueItem,
  DailyRevenueMetric,
  DepartmentDailyRevenue,
  RevenueDailyWeekItem,
} from 'src/mkt-core/mkt-dashboard/dto/output/revenue-daily.output';
import { RevenueDailyByMonthOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-daily-by-month.output';
import {
  QuarterBreakdownItem,
  QuarterMonthItem,
  RevenueDailyByQuarterOutput,
} from 'src/mkt-core/mkt-dashboard/dto/output/revenue-daily-by-quarter.output';
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

    // Delegate to range handler when weekEnd is provided
    if (input.weekEnd != null && input.weekEnd > week) {
      return this.getStatsRange({ ...input, week }, input.weekEnd);
    }

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

        gap = this.buildGapAnalysis(
          collected.totalRevenue,
          order.totalRevenue,
          avgCollectionDays,
        );
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
      const primary = this.selectPrimary(mode, collected, order);

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
        weeklyBreakdown: null,
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

  // ─── Month Handler ────────────────────────────────────────────────

  async getStatsByMonth(
    input: RevenueDailyByMonthInput,
  ): Promise<RevenueDailyByMonthOutput> {
    const { year, month } = input;
    const mode = input.revenueMode ?? RevenueMode.DUAL;
    const scope = input.departmentScope ?? DepartmentScope.ALL;

    const monthStart = DateTime.fromObject(
      { year, month, day: 1 },
      { zone: 'utc' },
    ).startOf('day');
    const monthEnd = monthStart.endOf('month');
    const daysInMonth = monthEnd.day;

    const startDate = monthStart.toISO() as string;
    const endDate = monthEnd.toISO() as string;

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

      // 1. Fetch raw daily rows for the entire month (1 SQL per metric type)
      const { cashRows, orderRows } = await this.fetchRawDailyRows(
        dataSource,
        queryRunner,
        startDate,
        endDate,
        mode,
        departmentIds,
      );

      // 2. Get ISO weeks that overlap this month
      const weeks = this.getWeeksInMonth(year, month);

      // 3. Build per-week breakdown with month boundary clamping
      const weeklyBreakdown: RevenueDailyWeekItem[] = [];

      for (const { weekYear, weekNumber } of weeks) {
        weeklyBreakdown.push(
          await this.buildWeekItemPartial(
            weekYear,
            weekNumber,
            cashRows,
            orderRows,
            mode,
            monthStart,
            monthEnd,
            dataSource,
            queryRunner,
            departmentIds,
          ),
        );
      }

      // 4. Aggregate month-level metrics from weekly breakdown
      const { collected, order, gap } = await this.aggregateFromBreakdown(
        weeklyBreakdown,
        mode,
        dataSource,
        queryRunner,
        startDate,
        endDate,
        departmentIds,
      );

      // 5. Build month-level daily revenue (all days in month)
      const primary = this.selectPrimary(mode, collected, order);

      // 6. Department breakdown for the full month
      const departmentBreakdown =
        scope !== DepartmentScope.ALL
          ? await this.getDepartmentBreakdownRange(
              dataSource,
              queryRunner,
              startDate,
              endDate,
              monthStart,
              monthEnd,
              scope === DepartmentScope.BY_TEAM ? 'TEAM' : 'DEPARTMENT',
              mode,
              departmentIds,
            )
          : null;

      return {
        year,
        month,
        monthStart: monthStart.toISODate() as string,
        monthEnd: monthEnd.toISODate() as string,
        daysInMonth,
        totalRevenue: primary.totalRevenue,
        dailyRevenue: primary.dailyRevenue,
        collected,
        order,
        gap,
        weeklyBreakdown,
        departmentBreakdown,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue daily stats by month', {
        error: getErrorMessage(error),
        year,
        month,
      });
      throw error;
    } finally {
      await release();
    }
  }

  // ─── Quarter Handler ─────────────────────────────────────────────

  async getStatsByQuarter(
    input: RevenueDailyByQuarterInput,
  ): Promise<RevenueDailyByQuarterOutput> {
    const { year } = input;
    const quarter = input.quarter ?? null;
    const mode = input.revenueMode ?? RevenueMode.DUAL;
    const scope = input.departmentScope ?? DepartmentScope.ALL;

    // Determine date range: single quarter or full year
    const rangeStart = quarter
      ? DateTime.fromObject(
          { year, month: (quarter - 1) * 3 + 1, day: 1 },
          { zone: 'utc' },
        ).startOf('day')
      : DateTime.fromObject(
          { year, month: 1, day: 1 },
          { zone: 'utc' },
        ).startOf('day');
    const rangeEnd = quarter
      ? DateTime.fromObject(
          { year, month: (quarter - 1) * 3 + 3, day: 1 },
          { zone: 'utc' },
        ).endOf('month')
      : DateTime.fromObject({ year, month: 12, day: 1 }, { zone: 'utc' }).endOf(
          'month',
        );

    const startDate = rangeStart.toISO() as string;
    const endDate = rangeEnd.toISO() as string;

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

      // Fetch raw daily rows for the entire range (1 SQL per metric type)
      const { cashRows, orderRows } = await this.fetchRawDailyRows(
        dataSource,
        queryRunner,
        startDate,
        endDate,
        mode,
        departmentIds,
      );

      const quarters = quarter ? [quarter] : [1, 2, 3, 4];
      const quarterItems: QuarterBreakdownItem[] = [];

      for (const q of quarters) {
        quarterItems.push(
          await this.buildQuarterItem(
            year,
            q,
            cashRows,
            orderRows,
            mode,
            dataSource,
            queryRunner,
            departmentIds,
          ),
        );
      }

      // Aggregate top-level metrics from quarter items
      const collected = this.includesCash(mode)
        ? {
            totalRevenue: MoneyUtils.sumBy(
              quarterItems.map((qi) => ({
                amount: qi.collected?.totalRevenue ?? 0,
              })),
              'amount',
            ).toNumber(),
            dailyRevenue: quarterItems.flatMap(
              (qi) => qi.collected?.dailyRevenue ?? [],
            ),
          }
        : null;

      const order = this.includesOrder(mode)
        ? {
            totalRevenue: MoneyUtils.sumBy(
              quarterItems.map((qi) => ({
                amount: qi.order?.totalRevenue ?? 0,
              })),
              'amount',
            ).toNumber(),
            dailyRevenue: quarterItems.flatMap(
              (qi) => qi.order?.dailyRevenue ?? [],
            ),
          }
        : null;

      let gap: GapAnalysisOutput | null = null;

      if (mode === RevenueMode.DUAL && collected && order) {
        const avgDays = await this.getAvgCollectionDays(
          dataSource,
          queryRunner,
          startDate,
          endDate,
          departmentIds,
        );

        gap = this.buildGapAnalysis(
          collected.totalRevenue,
          order.totalRevenue,
          avgDays,
        );
      }

      const primary = this.selectPrimary(mode, collected, order);

      const totalDays = quarterItems.reduce((sum, qi) => sum + qi.totalDays, 0);

      // monthlyBreakdown: flatten from all quarter items
      const monthlyBreakdown = quarterItems.flatMap(
        (qi) => qi.monthlyBreakdown,
      );

      // quarterlyBreakdown: null for single quarter, array for all quarters
      const quarterlyBreakdown = quarter ? null : quarterItems;

      // Department breakdown for the full range
      const departmentBreakdown =
        scope !== DepartmentScope.ALL
          ? await this.getDepartmentBreakdownRange(
              dataSource,
              queryRunner,
              startDate,
              endDate,
              rangeStart,
              rangeEnd,
              scope === DepartmentScope.BY_TEAM ? 'TEAM' : 'DEPARTMENT',
              mode,
              departmentIds,
            )
          : null;

      return {
        year,
        quarter,
        quarterStart: rangeStart.toISODate() as string,
        quarterEnd: rangeEnd.toISODate() as string,
        totalDays,
        totalRevenue: primary.totalRevenue,
        dailyRevenue: primary.dailyRevenue,
        collected,
        order,
        gap,
        monthlyBreakdown,
        quarterlyBreakdown,
        departmentBreakdown,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue daily stats by quarter', {
        error: getErrorMessage(error),
        year,
        quarter,
      });
      throw error;
    } finally {
      await release();
    }
  }

  private async buildQuarterItem(
    year: number,
    quarter: number,
    cashRows: RawDailyRow[],
    orderRows: RawDailyRow[],
    mode: RevenueMode,
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    departmentIds?: string[],
  ): Promise<QuarterBreakdownItem> {
    const months = this.quarterToMonths(quarter);
    const qStart = DateTime.fromObject(
      { year, month: months[0], day: 1 },
      { zone: 'utc' },
    ).startOf('day');
    const qEnd = DateTime.fromObject(
      { year, month: months[2], day: 1 },
      { zone: 'utc' },
    ).endOf('month');

    const monthlyBreakdown: QuarterMonthItem[] = [];

    for (const m of months) {
      const mStart = DateTime.fromObject(
        { year, month: m, day: 1 },
        { zone: 'utc' },
      ).startOf('day');
      const mEnd = mStart.endOf('month');

      const filteredCash = this.filterRowsByWeek(cashRows, mStart, mEnd);
      const filteredOrder = this.filterRowsByWeek(orderRows, mStart, mEnd);

      const buildMonthMetric = (rows: RawDailyRow[]): DailyRevenueMetric => {
        const dailyRevenue = this.fillDailyGapsPartial(rows, mStart, mEnd);

        return {
          totalRevenue: MoneyUtils.sumBy(dailyRevenue, 'amount').toNumber(),
          dailyRevenue,
        };
      };

      const collected = this.includesCash(mode)
        ? buildMonthMetric(filteredCash)
        : null;
      const order = this.includesOrder(mode)
        ? buildMonthMetric(filteredOrder)
        : null;

      let gap: GapAnalysisOutput | null = null;

      if (mode === RevenueMode.DUAL && collected && order) {
        const avgDays = await this.getAvgCollectionDays(
          dataSource,
          qr,
          mStart.toISO() as string,
          mEnd.toISO() as string,
          departmentIds,
        );

        gap = this.buildGapAnalysis(
          collected.totalRevenue,
          order.totalRevenue,
          avgDays,
        );
      }

      const primary = this.selectPrimary(mode, collected, order);

      monthlyBreakdown.push({
        month: m,
        monthStart: mStart.toISODate() as string,
        monthEnd: mEnd.toISODate() as string,
        daysInMonth: mEnd.day,
        totalRevenue: primary.totalRevenue,
        dailyRevenue: primary.dailyRevenue,
        collected,
        order,
        gap,
      });
    }

    // Aggregate quarter-level metrics
    const collected = this.includesCash(mode)
      ? {
          totalRevenue: MoneyUtils.sumBy(
            monthlyBreakdown.map((m) => ({
              amount: m.collected?.totalRevenue ?? 0,
            })),
            'amount',
          ).toNumber(),
          dailyRevenue: monthlyBreakdown.flatMap(
            (m) => m.collected?.dailyRevenue ?? [],
          ),
        }
      : null;

    const order = this.includesOrder(mode)
      ? {
          totalRevenue: MoneyUtils.sumBy(
            monthlyBreakdown.map((m) => ({
              amount: m.order?.totalRevenue ?? 0,
            })),
            'amount',
          ).toNumber(),
          dailyRevenue: monthlyBreakdown.flatMap(
            (m) => m.order?.dailyRevenue ?? [],
          ),
        }
      : null;

    let gap: GapAnalysisOutput | null = null;

    if (mode === RevenueMode.DUAL && collected && order) {
      const avgDays = await this.getAvgCollectionDays(
        dataSource,
        qr,
        qStart.toISO() as string,
        qEnd.toISO() as string,
        departmentIds,
      );

      gap = this.buildGapAnalysis(
        collected.totalRevenue,
        order.totalRevenue,
        avgDays,
      );
    }

    const primary = this.selectPrimary(mode, collected, order);

    const totalDays = monthlyBreakdown.reduce(
      (sum, m) => sum + m.daysInMonth,
      0,
    );

    return {
      quarter,
      quarterStart: qStart.toISODate() as string,
      quarterEnd: qEnd.toISODate() as string,
      totalDays,
      totalRevenue: primary.totalRevenue,
      dailyRevenue: primary.dailyRevenue,
      collected,
      order,
      gap,
      monthlyBreakdown,
    };
  }

  // ─── Week Range Handler ────────────────────────────────────────────

  private async getStatsRange(
    input: RevenueDailyInput & { week: number },
    inputWeekEnd: number,
  ): Promise<RevenueDailyOutput> {
    const { year } = input;
    const weekStartNum = input.week;
    const mode = input.revenueMode ?? RevenueMode.DUAL;
    const scope = input.departmentScope ?? DepartmentScope.ALL;

    const rangeStart = this.weekToMonday(year, weekStartNum);
    const rangeEnd = this.weekToSunday(year, inputWeekEnd);
    const startDate = rangeStart.toISO() as string;
    const endDate = rangeEnd.toISO() as string;

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

      // 1. Fetch raw data (1 SQL per metric type for entire range)
      const { cashRows, orderRows } = await this.fetchRawDailyRows(
        dataSource,
        queryRunner,
        startDate,
        endDate,
        mode,
        departmentIds,
      );

      // 2. Build per-week breakdown
      const weeklyBreakdown: RevenueDailyWeekItem[] = [];

      for (let wk = weekStartNum; wk <= inputWeekEnd; wk++) {
        weeklyBreakdown.push(
          await this.buildWeekItem(
            year,
            wk,
            cashRows,
            orderRows,
            mode,
            dataSource,
            queryRunner,
            departmentIds,
          ),
        );
      }

      // 3. Aggregate metrics from breakdown
      const { collected, order, gap } = await this.aggregateFromBreakdown(
        weeklyBreakdown,
        mode,
        dataSource,
        queryRunner,
        startDate,
        endDate,
        departmentIds,
      );

      // 4. Department breakdown (aggregated across full range)
      const departmentBreakdown =
        scope !== DepartmentScope.ALL
          ? await this.getDepartmentBreakdownRange(
              dataSource,
              queryRunner,
              startDate,
              endDate,
              rangeStart,
              rangeEnd,
              scope === DepartmentScope.BY_TEAM ? 'TEAM' : 'DEPARTMENT',
              mode,
              departmentIds,
            )
          : null;

      // 5. Primary metric for backward compat
      const primary = this.selectPrimary(mode, collected, order);

      return {
        year,
        week: weekStartNum,
        weekStart: rangeStart.toISODate() as string,
        weekEnd: rangeEnd.toISODate() as string,
        totalRevenue: primary.totalRevenue,
        dailyRevenue: primary.dailyRevenue,
        collected,
        order,
        gap,
        weeklyBreakdown,
        departmentBreakdown,
      };
    } catch (error) {
      this.logger.error('Failed to get revenue daily stats (range)', {
        error: getErrorMessage(error),
        year,
        weekStart: weekStartNum,
        weekEnd: inputWeekEnd,
      });
      throw error;
    } finally {
      await release();
    }
  }

  // ─── Shared Helpers ─────────────────────────────────────────────────

  private includesCash(mode: RevenueMode): boolean {
    return mode !== RevenueMode.ORDER;
  }

  private includesOrder(mode: RevenueMode): boolean {
    return mode !== RevenueMode.CASH;
  }

  private weekToMonday(year: number, week: number): DateTime {
    return DateTime.fromObject(
      { weekYear: year, weekNumber: week, weekday: 1 },
      { zone: 'utc' },
    ).startOf('day');
  }

  private weekToSunday(year: number, week: number): DateTime {
    return this.weekToMonday(year, week).plus({ days: 6 }).endOf('day');
  }

  private selectPrimary(
    mode: RevenueMode,
    collected: DailyRevenueMetric | null,
    order: DailyRevenueMetric | null,
  ): DailyRevenueMetric {
    return (
      mode === RevenueMode.ORDER ? order : collected
    ) as DailyRevenueMetric;
  }

  private quarterToMonths(quarter: number): [number, number, number] {
    const startMonth = (quarter - 1) * 3 + 1;

    return [startMonth, startMonth + 1, startMonth + 2];
  }

  private buildMetricFromRows(
    rows: RawDailyRow[],
    weekStart: DateTime,
  ): DailyRevenueMetric {
    const dailyRevenue = this.fillDailyGaps(rows, weekStart);

    return {
      totalRevenue: MoneyUtils.sumBy(dailyRevenue, 'amount').toNumber(),
      dailyRevenue,
    };
  }

  private buildGapAnalysis(
    collectedTotal: number,
    orderTotal: number,
    avgCollectionDays: number | null,
  ): GapAnalysisOutput {
    return {
      collectionRate: StatisticsUtils.collectionRate(
        collectedTotal,
        orderTotal,
      ),
      revenueGap: MoneyUtils.subtract(orderTotal, collectedTotal).toNumber(),
      avgCollectionDays,
    };
  }

  // ─── Range Sub-Methods ──────────────────────────────────────────────

  private async fetchRawDailyRows(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    mode: RevenueMode,
    departmentIds?: string[],
  ): Promise<{ cashRows: RawDailyRow[]; orderRows: RawDailyRow[] }> {
    const cashRows = this.includesCash(mode)
      ? await this.getCashRevenueByDay(
          dataSource,
          qr,
          startDate,
          endDate,
          departmentIds,
        )
      : [];
    const orderRows = this.includesOrder(mode)
      ? await this.getOrderRevenueByDay(
          dataSource,
          qr,
          startDate,
          endDate,
          departmentIds,
        )
      : [];

    return { cashRows, orderRows };
  }

  private async buildWeekItem(
    year: number,
    wk: number,
    cashRows: RawDailyRow[],
    orderRows: RawDailyRow[],
    mode: RevenueMode,
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    departmentIds?: string[],
  ): Promise<RevenueDailyWeekItem> {
    const wkStart = this.weekToMonday(year, wk);
    const wkEnd = wkStart.plus({ days: 6 }).endOf('day');

    const collected = this.includesCash(mode)
      ? this.buildMetricFromRows(
          this.filterRowsByWeek(cashRows, wkStart, wkEnd),
          wkStart,
        )
      : null;
    const order = this.includesOrder(mode)
      ? this.buildMetricFromRows(
          this.filterRowsByWeek(orderRows, wkStart, wkEnd),
          wkStart,
        )
      : null;

    let gap: GapAnalysisOutput | null = null;

    if (mode === RevenueMode.DUAL && collected && order) {
      const avgDays = await this.getAvgCollectionDays(
        dataSource,
        qr,
        wkStart.toISO() as string,
        wkEnd.toISO() as string,
        departmentIds,
      );

      gap = this.buildGapAnalysis(
        collected.totalRevenue,
        order.totalRevenue,
        avgDays,
      );
    }

    const primary = this.selectPrimary(mode, collected, order);

    return {
      week: wk,
      weekStart: wkStart.toISODate() as string,
      weekEnd: wkEnd.toISODate() as string,
      totalRevenue: primary.totalRevenue,
      dailyRevenue: primary.dailyRevenue,
      collected,
      order,
      gap,
    };
  }

  private async aggregateFromBreakdown(
    breakdown: RevenueDailyWeekItem[],
    mode: RevenueMode,
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    departmentIds?: string[],
  ): Promise<{
    collected: DailyRevenueMetric | null;
    order: DailyRevenueMetric | null;
    gap: GapAnalysisOutput | null;
  }> {
    const collected = this.includesCash(mode)
      ? {
          totalRevenue: MoneyUtils.sumBy(
            breakdown.map((w) => ({
              amount: w.collected?.totalRevenue ?? 0,
            })),
            'amount',
          ).toNumber(),
          dailyRevenue: breakdown.flatMap(
            (w) => w.collected?.dailyRevenue ?? [],
          ),
        }
      : null;

    const order = this.includesOrder(mode)
      ? {
          totalRevenue: MoneyUtils.sumBy(
            breakdown.map((w) => ({ amount: w.order?.totalRevenue ?? 0 })),
            'amount',
          ).toNumber(),
          dailyRevenue: breakdown.flatMap((w) => w.order?.dailyRevenue ?? []),
        }
      : null;

    let gap: GapAnalysisOutput | null = null;

    if (mode === RevenueMode.DUAL && collected && order) {
      const avgDays = await this.getAvgCollectionDays(
        dataSource,
        qr,
        startDate,
        endDate,
        departmentIds,
      );

      gap = this.buildGapAnalysis(
        collected.totalRevenue,
        order.totalRevenue,
        avgDays,
      );
    }

    return { collected, order, gap };
  }

  // ─── Range Data Helpers ─────────────────────────────────────────────

  private filterRowsByWeek(
    rows: RawDailyRow[],
    wkStart: DateTime,
    wkEnd: DateTime,
  ): RawDailyRow[] {
    return rows.filter((row) => {
      const rowDate = DateTime.fromJSDate(new Date(row.period), {
        zone: 'utc',
      });

      return rowDate >= wkStart && rowDate <= wkEnd;
    });
  }

  private async getDepartmentBreakdownRange(
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    startDate: string,
    endDate: string,
    rangeStart: DateTime,
    rangeEnd: DateTime,
    departmentType: string,
    mode: RevenueMode,
    departmentIds?: string[],
  ): Promise<DepartmentDailyRevenue[]> {
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

    return this.groupDepartmentRowsRange(rows, rangeStart, rangeEnd);
  }

  private groupDepartmentRowsRange(
    rows: RawDepartmentDailyRow[],
    rangeStart: DateTime,
    rangeEnd: DateTime,
  ): DepartmentDailyRevenue[] {
    const totalDays = Math.ceil(rangeEnd.diff(rangeStart, 'days').days);

    const deptMap = new Map<
      string,
      {
        departmentId: string;
        departmentName: string;
        departmentType: string;
        rowMap: Map<string, RawDailyRow>;
      }
    >();

    for (const row of rows) {
      let entry = deptMap.get(row.department_id);

      if (!entry) {
        entry = {
          departmentId: row.department_id,
          departmentName: row.department_name,
          departmentType: row.department_type,
          rowMap: new Map(),
        };
        deptMap.set(row.department_id, entry);
      }

      const dateKey = DateTime.fromJSDate(new Date(row.period), {
        zone: 'utc',
      }).toISODate() as string;

      entry.rowMap.set(dateKey, {
        period: row.period,
        order_count: row.order_count,
        total_revenue: row.total_revenue,
      });
    }

    const result: DepartmentDailyRevenue[] = [];

    for (const entry of deptMap.values()) {
      const dailyRevenue: DailyRevenueItem[] = [];

      for (let i = 0; i <= totalDays; i++) {
        const day = rangeStart.plus({ days: i });
        const dateKey = day.toISODate() as string;
        const row = entry.rowMap.get(dateKey);

        dailyRevenue.push({
          date: dateKey,
          dayOfWeek: DAY_NAMES[(day.weekday - 1) % 7],
          amount: row ? MoneyUtils.from(row.total_revenue).toNumber() : 0,
          orderCount: row ? Number(row.order_count) : 0,
        });
      }

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

    return this.buildMetricFromRows(rows, weekStart);
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

    return this.buildMetricFromRows(rows, weekStart);
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
   * Get all ISO weeks that overlap a given calendar month.
   * Returns unique (weekYear, weekNumber) pairs in order.
   * Handles cross-year: Jan 1 may belong to week 52/53 of prev year,
   * Dec 31 may belong to week 1 of next year.
   */
  private getWeeksInMonth(
    year: number,
    month: number,
  ): Array<{ weekYear: number; weekNumber: number }> {
    const monthStart = DateTime.fromObject(
      { year, month, day: 1 },
      { zone: 'utc' },
    );
    const daysInMonth = monthStart.endOf('month').day;
    const seen = new Set<string>();
    const result: Array<{ weekYear: number; weekNumber: number }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const day = DateTime.fromObject({ year, month, day: d }, { zone: 'utc' });
      const key = `${day.weekYear}:${day.weekNumber}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push({ weekYear: day.weekYear, weekNumber: day.weekNumber });
      }
    }

    return result;
  }

  /**
   * Like fillDailyGaps but fills from rangeStart to rangeEnd (variable number of days).
   * Uses day.weekday to map dayOfWeek name.
   */
  private fillDailyGapsPartial(
    rows: RawDailyRow[],
    rangeStart: DateTime,
    rangeEnd: DateTime,
  ): DailyRevenueItem[] {
    const rowMap = new Map<string, RawDailyRow>();

    for (const row of rows) {
      const dateKey = DateTime.fromJSDate(new Date(row.period), {
        zone: 'utc',
      }).toISODate() as string;

      rowMap.set(dateKey, row);
    }

    const totalDays = Math.ceil(
      rangeEnd.startOf('day').diff(rangeStart.startOf('day'), 'days').days,
    );
    const result: DailyRevenueItem[] = [];

    for (let i = 0; i <= totalDays; i++) {
      const day = rangeStart.plus({ days: i });
      const dateKey = day.toISODate() as string;
      const row = rowMap.get(dateKey);

      result.push({
        date: dateKey,
        dayOfWeek: DAY_NAMES[(day.weekday - 1) % 7],
        amount: row ? MoneyUtils.from(row.total_revenue).toNumber() : 0,
        orderCount: row ? Number(row.order_count) : 0,
      });
    }

    return result;
  }

  /**
   * Build a RevenueDailyWeekItem for a month context.
   * Clamps the week's Mon-Sun range to [monthStart, monthEnd].
   */
  private async buildWeekItemPartial(
    weekYear: number,
    weekNumber: number,
    cashRows: RawDailyRow[],
    orderRows: RawDailyRow[],
    mode: RevenueMode,
    monthStart: DateTime,
    monthEnd: DateTime,
    dataSource: WorkspaceDataSource,
    qr: QueryRunner,
    departmentIds?: string[],
  ): Promise<RevenueDailyWeekItem> {
    const wkMonday = DateTime.fromObject(
      { weekYear, weekNumber, weekday: 1 },
      { zone: 'utc' },
    ).startOf('day');
    const wkSunday = wkMonday.plus({ days: 6 }).endOf('day');

    // Clamp to month boundaries
    const effectiveStart = wkMonday < monthStart ? monthStart : wkMonday;
    const effectiveEnd = wkSunday > monthEnd ? monthEnd : wkSunday;

    const filteredCash = this.filterRowsByWeek(
      cashRows,
      effectiveStart,
      effectiveEnd,
    );
    const filteredOrder = this.filterRowsByWeek(
      orderRows,
      effectiveStart,
      effectiveEnd,
    );

    const buildPartialMetric = (rows: RawDailyRow[]): DailyRevenueMetric => {
      const dailyRevenue = this.fillDailyGapsPartial(
        rows,
        effectiveStart,
        effectiveEnd,
      );

      return {
        totalRevenue: MoneyUtils.sumBy(dailyRevenue, 'amount').toNumber(),
        dailyRevenue,
      };
    };

    const collected = this.includesCash(mode)
      ? buildPartialMetric(filteredCash)
      : null;
    const order = this.includesOrder(mode)
      ? buildPartialMetric(filteredOrder)
      : null;

    let gap: GapAnalysisOutput | null = null;

    if (mode === RevenueMode.DUAL && collected && order) {
      const avgDays = await this.getAvgCollectionDays(
        dataSource,
        qr,
        effectiveStart.toISO() as string,
        effectiveEnd.endOf('day').toISO() as string,
        departmentIds,
      );

      gap = this.buildGapAnalysis(
        collected.totalRevenue,
        order.totalRevenue,
        avgDays,
      );
    }

    const primary = this.selectPrimary(mode, collected, order);

    return {
      week: weekNumber,
      weekStart: effectiveStart.toISODate() as string,
      weekEnd: effectiveEnd.toISODate() as string,
      totalRevenue: primary.totalRevenue,
      dailyRevenue: primary.dailyRevenue,
      collected,
      order,
      gap,
    };
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
