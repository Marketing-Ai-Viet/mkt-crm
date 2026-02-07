import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import {
  DashboardDataTransformer,
  RawLeaderboardRow,
} from 'src/mkt-core/mkt-dashboard/utils/dashboard-data.transformer';
import { LeaderboardInput } from 'src/mkt-core/mkt-dashboard/dto/input/leaderboard.input';
import { StaffLeaderboardOutput } from 'src/mkt-core/mkt-dashboard/dto/output/leaderboard.output';
import { DASHBOARD_LIMITS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-limits';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'StaffLeaderboardService';

@Injectable()
export class StaffLeaderboardService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly dateRangeService: DashboardDateRangeService,
  ) {}

  async getLeaderboard(
    input: LeaderboardInput,
  ): Promise<StaffLeaderboardOutput> {
    const dateRange = this.dateRangeService.resolve(
      input.period as DashboardPeriod,
      input.startDate,
      input.endDate,
    );

    const limit = Math.min(
      input.limit ?? DASHBOARD_LIMITS.LEADERBOARD_MAX,
      DASHBOARD_LIMITS.LEADERBOARD_MAX,
    );
    const offset = input.offset ?? 0;

    try {
      const rankings = await this.getStaffRankings(dateRange, limit, offset);

      return {
        rankings,
        period: {
          start: dateRange.startDate,
          end: dateRange.endDate,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get staff leaderboard', {
        error: getErrorMessage(error),
        period: input.period,
      });
      throw error;
    }
  }

  private async getStaffRankings(
    dateRange: { startDate: string; endDate: string },
    limit: number,
    offset: number,
  ) {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace(wsId);

    const rows: RawLeaderboardRow[] = await dataSource.query(
      `SELECT
        wm.id AS staff_id,
        wm."nameFirstName" || ' ' || wm."nameLastName" AS staff_name,
        COALESCE(d.name, '') AS department_name,
        COALESCE(order_stats.order_count, 0) AS order_count,
        COALESCE(order_stats.total_revenue, 0) AS total_revenue,
        COALESCE(customer_stats.new_customers, 0) AS new_customers,
        COALESCE(kpi_stats.kpi_achievement, 0) AS kpi_achievement
      FROM "workspaceMember" wm
      LEFT JOIN "mktDepartment" d ON wm."mktDepartmentId" = d.id
      LEFT JOIN (
        SELECT
          "accountOwnerId",
          COUNT(*) AS order_count,
          SUM("totalAmount") AS total_revenue
        FROM "mktOrder"
        WHERE "deletedAt" IS NULL
          AND status = 'COMPLETED'
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY "accountOwnerId"
      ) order_stats ON order_stats."accountOwnerId" = wm.id
      LEFT JOIN (
        SELECT
          "accountOwnerId",
          COUNT(*) AS new_customers
        FROM "mktCustomer"
        WHERE "deletedAt" IS NULL
          AND "createdAt" BETWEEN $1 AND $2
        GROUP BY "accountOwnerId"
      ) customer_stats ON customer_stats."accountOwnerId" = wm.id
      LEFT JOIN (
        SELECT
          "assigneeId",
          ROUND(
            COUNT(*) FILTER (WHERE status IN ('ACHIEVED', 'EXCEEDED'))::numeric
            / NULLIF(COUNT(*), 0) * 100, 2
          ) AS kpi_achievement
        FROM "mktKpi"
        WHERE "deletedAt" IS NULL
          AND "periodYear" = EXTRACT(YEAR FROM NOW())
        GROUP BY "assigneeId"
      ) kpi_stats ON kpi_stats."assigneeId" = wm.id
      WHERE wm."deletedAt" IS NULL
        AND (
          order_stats.order_count > 0
          OR customer_stats.new_customers > 0
          OR kpi_stats.kpi_achievement > 0
        )
      ORDER BY COALESCE(order_stats.total_revenue, 0) DESC
      LIMIT $3 OFFSET $4`,
      [dateRange.startDate, dateRange.endDate, limit, offset],
    );

    return DashboardDataTransformer.transformLeaderboard(rows);
  }
}
