import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { createWorkspaceScopedRunner } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import { DepartmentFilterHelper } from 'src/mkt-core/mkt-dashboard/utils/department-filter.helper';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import { StaffRevenueInput } from 'src/mkt-core/mkt-dashboard/dto/input/staff-revenue.input';
import {
  StaffDepartmentInfo,
  StaffRevenueItem,
  StaffRevenueOutput,
} from 'src/mkt-core/mkt-dashboard/dto/output/staff-revenue.output';
import { GapAnalysisOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';
import { DepartmentScope } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-daily.input';
import { DASHBOARD_LIMITS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-limits';
import { RevenueMode } from 'src/mkt-core/mkt-dashboard/types/revenue-mode.type';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { StatisticsUtils } from 'src/mkt-core/mkt-dashboard/utils/statistics.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'StaffRevenueService';

type RawStaffRevenueRow = {
  staff_id: string;
  staff_name: string;
  direct_dept_id: string | null;
  direct_dept_name: string | null;
  direct_dept_type: string | null;
  root_dept_id: string | null;
  root_dept_name: string | null;
  root_dept_type: string | null;
  order_count: string;
  order_revenue: string;
  collected_revenue: string;
};

@Injectable()
export class StaffRevenueService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly dateRangeService: DashboardDateRangeService,
  ) {}

  async getStaffRevenue(input: StaffRevenueInput): Promise<StaffRevenueOutput> {
    const period = input.period ?? DashboardPeriod.THIS_MONTH;
    const revenueMode = input.revenueMode ?? RevenueMode.DUAL;
    const limit = Math.min(
      input.limit ?? 20,
      DASHBOARD_LIMITS.STAFF_REVENUE_MAX,
    );
    const offset = input.offset ?? 0;

    const dateRange = this.dateRangeService.resolve(
      period,
      input.startDate,
      input.endDate,
    );

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

      const { sql, params } = this.buildStaffQuery(
        dateRange,
        limit,
        offset,
        revenueMode,
        departmentIds,
        input.staffId,
        input.departmentScope,
      );

      const { sql: countSql, params: countParams } = this.buildCountQuery(
        dateRange,
        revenueMode,
        departmentIds,
        input.staffId,
        input.departmentScope,
      );

      const [rows, countResult] = await Promise.all([
        dataSource.query(sql, params, queryRunner, {
          shouldBypassPermissionChecks: true,
        }),
        dataSource.query(countSql, countParams, queryRunner, {
          shouldBypassPermissionChecks: true,
        }),
      ]);

      const items = this.transformRows(
        rows as RawStaffRevenueRow[],
        revenueMode,
      );
      const totalCount = Number(countResult[0]?.total_count ?? 0);

      const gap = this.buildGapAnalysis(items, revenueMode);

      return {
        items,
        period: {
          start: dateRange.startDate,
          end: dateRange.endDate,
        },
        totalCount,
        gap,
      };
    } catch (error) {
      this.logger.error('Failed to get staff revenue', {
        error: getErrorMessage(error),
        period,
      });
      throw error;
    } finally {
      await release();
    }
  }

  private buildStaffQuery(
    dateRange: { startDate: string; endDate: string },
    limit: number,
    offset: number,
    revenueMode: RevenueMode,
    departmentIds?: string[],
    staffId?: string,
    departmentScope?: DepartmentScope,
  ): { sql: string; params: (string | number | string[])[] } {
    const params: (string | number | string[])[] = [
      dateRange.startDate,
      dateRange.endDate,
      limit,
      offset,
    ];

    let nextParam = 5;
    let staffClause = '';
    let deptClause = '';
    let scopeClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND wm.id = $${nextParam}`;
      nextParam++;
    }

    if (departmentIds) {
      params.push(departmentIds as unknown as string);
      deptClause = `AND wm."departmentId" = ANY($${nextParam})`;
      nextParam++;
    }

    if (departmentScope === DepartmentScope.BY_TEAM) {
      scopeClause = `AND d."departmentType" = 'TEAM'`;
    } else if (departmentScope === DepartmentScope.BY_DEPARTMENT) {
      scopeClause = `AND d."departmentType" = 'DEPARTMENT'`;
    }

    const sortColumn =
      revenueMode === RevenueMode.ORDER ? 'order_revenue' : 'collected_revenue';

    const sql = `SELECT
  wm.id AS staff_id,
  wm."nameFirstName" || ' ' || wm."nameLastName" AS staff_name,
  d.id AS direct_dept_id,
  COALESCE(d."departmentName", '') AS direct_dept_name,
  d."departmentType" AS direct_dept_type,
  root_d.id AS root_dept_id,
  COALESCE(root_d."departmentName", '') AS root_dept_name,
  root_d."departmentType" AS root_dept_type,
  COALESCE(order_stats.order_count, 0) AS order_count,
  COALESCE(order_stats.total_revenue, 0) AS order_revenue,
  COALESCE(cash_stats.collected_revenue, 0) AS collected_revenue
FROM "workspaceMember" wm
LEFT JOIN "mktDepartment" d ON wm."departmentId" = d.id AND d."deletedAt" IS NULL
LEFT JOIN LATERAL (
  SELECT a."ancestorId"
  FROM "mktDepartmentAncestry" a
  WHERE a."departmentId" = wm."departmentId" AND a."deletedAt" IS NULL
  ORDER BY a.distance DESC LIMIT 1
) root_anc ON TRUE
LEFT JOIN "mktDepartment" root_d ON root_d.id = root_anc."ancestorId" AND root_d."deletedAt" IS NULL
LEFT JOIN (
  SELECT
    "accountOwnerId",
    COUNT(*) AS order_count,
    SUM("totalAmount") - SUM(COALESCE("refundAmount", 0)) AS total_revenue
  FROM "mktOrder"
  WHERE "deletedAt" IS NULL
    AND status = 'COMPLETED'
    AND "completedAt" IS NOT NULL
    AND "completedAt" BETWEEN $1 AND $2
  GROUP BY "accountOwnerId"
) order_stats ON order_stats."accountOwnerId" = wm.id
LEFT JOIN (
  SELECT
    o."accountOwnerId",
    SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS collected_revenue
  FROM "mktPayment" p
  JOIN "mktOrder" o ON p."mktOrderId" = o.id
  WHERE p."deletedAt" IS NULL
    AND p.status = 'CONFIRMED'
    AND p."confirmedAt" BETWEEN $1 AND $2
  GROUP BY o."accountOwnerId"
) cash_stats ON cash_stats."accountOwnerId" = wm.id
WHERE wm."deletedAt" IS NULL
  ${staffClause}
  ${deptClause}
  ${scopeClause}
  AND (COALESCE(order_stats.order_count, 0) > 0 OR COALESCE(cash_stats.collected_revenue, 0) > 0)
ORDER BY ${sortColumn} DESC
LIMIT $3 OFFSET $4`;

    return { sql, params };
  }

  private buildCountQuery(
    dateRange: { startDate: string; endDate: string },
    revenueMode: RevenueMode,
    departmentIds?: string[],
    staffId?: string,
    departmentScope?: DepartmentScope,
  ): { sql: string; params: (string | number | string[])[] } {
    const params: (string | number | string[])[] = [
      dateRange.startDate,
      dateRange.endDate,
    ];

    let nextParam = 3;
    let staffClause = '';
    let deptClause = '';
    let scopeClause = '';

    if (staffId) {
      params.push(staffId);
      staffClause = `AND wm.id = $${nextParam}`;
      nextParam++;
    }

    if (departmentIds) {
      params.push(departmentIds as unknown as string);
      deptClause = `AND wm."departmentId" = ANY($${nextParam})`;
      nextParam++;
    }

    if (departmentScope === DepartmentScope.BY_TEAM) {
      scopeClause = `AND d."departmentType" = 'TEAM'`;
    } else if (departmentScope === DepartmentScope.BY_DEPARTMENT) {
      scopeClause = `AND d."departmentType" = 'DEPARTMENT'`;
    }

    void revenueMode;

    const sql = `SELECT COUNT(*) AS total_count
FROM "workspaceMember" wm
LEFT JOIN "mktDepartment" d ON wm."departmentId" = d.id AND d."deletedAt" IS NULL
LEFT JOIN (
  SELECT
    "accountOwnerId",
    COUNT(*) AS order_count
  FROM "mktOrder"
  WHERE "deletedAt" IS NULL
    AND status = 'COMPLETED'
    AND "completedAt" IS NOT NULL
    AND "completedAt" BETWEEN $1 AND $2
  GROUP BY "accountOwnerId"
) order_stats ON order_stats."accountOwnerId" = wm.id
LEFT JOIN (
  SELECT
    o."accountOwnerId",
    SUM(p.amount) - SUM(COALESCE(p."refundedAmount", 0)) AS collected_revenue
  FROM "mktPayment" p
  JOIN "mktOrder" o ON p."mktOrderId" = o.id
  WHERE p."deletedAt" IS NULL
    AND p.status = 'CONFIRMED'
    AND p."confirmedAt" BETWEEN $1 AND $2
  GROUP BY o."accountOwnerId"
) cash_stats ON cash_stats."accountOwnerId" = wm.id
WHERE wm."deletedAt" IS NULL
  ${staffClause}
  ${deptClause}
  ${scopeClause}
  AND (COALESCE(order_stats.order_count, 0) > 0 OR COALESCE(cash_stats.collected_revenue, 0) > 0)`;

    return { sql, params };
  }

  private transformRows(
    rows: RawStaffRevenueRow[],
    revenueMode: RevenueMode,
  ): StaffRevenueItem[] {
    return rows.map((row) => {
      const orderRevenue = Number(row.order_revenue);
      const collectedRevenue = Number(row.collected_revenue);
      const orderCount = Number(row.order_count);

      let totalRevenue: number;

      if (revenueMode === RevenueMode.CASH) {
        totalRevenue = collectedRevenue;
      } else if (revenueMode === RevenueMode.ORDER) {
        totalRevenue = orderRevenue;
      } else {
        totalRevenue = collectedRevenue;
      }

      const directDepartment: StaffDepartmentInfo | null = row.direct_dept_id
        ? {
            departmentId: row.direct_dept_id,
            departmentName: row.direct_dept_name || null,
            departmentType: row.direct_dept_type || null,
          }
        : null;

      const rootDepartment: StaffDepartmentInfo | null = row.root_dept_id
        ? {
            departmentId: row.root_dept_id,
            departmentName: row.root_dept_name || null,
            departmentType: row.root_dept_type || null,
          }
        : null;

      return {
        staffId: row.staff_id,
        staffName: row.staff_name,
        directDepartment,
        rootDepartment,
        totalRevenue,
        collectedRevenue:
          revenueMode === RevenueMode.ORDER ? null : collectedRevenue,
        orderRevenue: revenueMode === RevenueMode.CASH ? null : orderRevenue,
        orderCount,
      };
    });
  }

  private buildGapAnalysis(
    items: StaffRevenueItem[],
    revenueMode: RevenueMode,
  ): GapAnalysisOutput | null {
    if (revenueMode !== RevenueMode.DUAL) return null;

    const totalOrderRevenue = MoneyUtils.sumBy(
      items.filter((i) => i.orderRevenue !== null),
      'orderRevenue' as never,
    ).toNumber();

    const totalCollectedRevenue = MoneyUtils.sumBy(
      items.filter((i) => i.collectedRevenue !== null),
      'collectedRevenue' as never,
    ).toNumber();

    const collectionRate = StatisticsUtils.collectionRate(
      totalCollectedRevenue,
      totalOrderRevenue,
    );

    const revenueGap = MoneyUtils.subtract(
      totalOrderRevenue,
      totalCollectedRevenue,
    ).toNumber();

    return {
      collectionRate,
      revenueGap,
      avgCollectionDays: null,
    };
  }
}
