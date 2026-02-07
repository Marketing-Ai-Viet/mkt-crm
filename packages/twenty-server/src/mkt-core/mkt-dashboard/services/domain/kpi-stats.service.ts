import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import {
  DashboardDataTransformer,
  RawKpiCategoryRow,
} from 'src/mkt-core/mkt-dashboard/utils/dashboard-data.transformer';
import { KpiScorecardInput } from 'src/mkt-core/mkt-dashboard/dto/input/kpi-scorecard.input';
import { KpiScorecardOutput } from 'src/mkt-core/mkt-dashboard/dto/output/kpi-scorecard.output';
import { DASHBOARD_LIMITS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-limits';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'KpiStatsService';

@Injectable()
export class KpiStatsService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly dateRangeService: DashboardDateRangeService,
  ) {}

  async getStats(input: KpiScorecardInput): Promise<KpiScorecardOutput> {
    const year = input.year ?? DateTimeUtils.now().year;

    try {
      const [categoryStats, kpiDetails, trends] = await Promise.all([
        this.getKpiByCategory(year, input.category),
        this.getKpiDetails(year, input.category),
        this.getKpiTrends(year),
      ]);

      // Calculate overall achievement rate
      const totalKpis = categoryStats.reduce((sum, cat) => sum + cat.total, 0);
      const totalAchieved = categoryStats.reduce(
        (sum, cat) => sum + cat.achieved,
        0,
      );
      const overallAchievementRate =
        totalKpis > 0
          ? MoneyUtils.percentageOf(totalAchieved, totalKpis).toNumber()
          : 0;

      return {
        overallAchievementRate,
        kpisByCategory: kpiDetails,
        trends,
      };
    } catch (error) {
      this.logger.error('Failed to get KPI stats', {
        error: getErrorMessage(error),
        year,
      });
      throw error;
    }
  }

  private async getKpiByCategory(year: number, category?: string) {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace(wsId);

    // SQL from design doc 7.5
    const params: (number | string)[] = [year];
    let categoryFilter = '';

    if (category) {
      categoryFilter = ' AND "kpiCategory" = $2';
      params.push(category);
    }

    const rows: RawKpiCategoryRow[] = await dataSource.query(
      `SELECT
        "kpiCategory" AS kpi_category,
        COUNT(*) AS total_kpis,
        COUNT(*) FILTER (WHERE status IN ('ACHIEVED', 'EXCEEDED')) AS achieved,
        ROUND(
          COUNT(*) FILTER (WHERE status IN ('ACHIEVED', 'EXCEEDED'))::numeric
          / NULLIF(COUNT(*), 0) * 100, 2
        ) AS achievement_rate
      FROM "mktKpi"
      WHERE "deletedAt" IS NULL
        AND "periodYear" = $1${categoryFilter}
      GROUP BY "kpiCategory"`,
      params,
    );

    return DashboardDataTransformer.transformKpiCategories(rows);
  }

  private async getKpiDetails(
    year: number,
    category?: string,
  ): Promise<
    Array<{
      category: string;
      kpis: Array<{
        name: string;
        target: number;
        actual: number;
        progress: number;
        status: string;
      }>;
    }>
  > {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace(wsId);

    const params: (number | string)[] = [
      year,
      DASHBOARD_LIMITS.KPIS_PER_CATEGORY,
    ];
    let categoryFilter = '';

    if (category) {
      categoryFilter = ' AND "kpiCategory" = $3';
      params.push(category);
    }

    const rows = await dataSource.query(
      `SELECT
        "kpiCategory",
        name,
        "targetValue",
        "actualValue",
        CASE
          WHEN "targetValue" > 0
          THEN ROUND("actualValue"::numeric / "targetValue" * 100, 2)
          ELSE 0
        END AS progress,
        status
      FROM "mktKpi"
      WHERE "deletedAt" IS NULL
        AND "periodYear" = $1${categoryFilter}
      ORDER BY "kpiCategory", name
      LIMIT $2`,
      params,
    );

    // Group by category
    const grouped = new Map<
      string,
      Array<{
        name: string;
        target: number;
        actual: number;
        progress: number;
        status: string;
      }>
    >();

    for (const row of rows) {
      const cat = row.kpiCategory as string;
      const kpi = {
        name: row.name as string,
        target: MoneyUtils.from(String(row.targetValue ?? 0)).toNumber(),
        actual: MoneyUtils.from(String(row.actualValue ?? 0)).toNumber(),
        progress: Number(row.progress ?? 0),
        status: row.status as string,
      };

      const existing = grouped.get(cat);

      if (existing) {
        existing.push(kpi);
      } else {
        grouped.set(cat, [kpi]);
      }
    }

    return Array.from(grouped.entries()).map(([cat, kpis]) => ({
      category: cat,
      kpis,
    }));
  }

  private async getKpiTrends(
    year: number,
  ): Promise<Array<{ period: string; achievementRate: number }>> {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace(wsId);

    const rows = await dataSource.query(
      `SELECT
        "periodQuarter" AS period,
        ROUND(
          COUNT(*) FILTER (WHERE status IN ('ACHIEVED', 'EXCEEDED'))::numeric
          / NULLIF(COUNT(*), 0) * 100, 2
        ) AS achievement_rate
      FROM "mktKpi"
      WHERE "deletedAt" IS NULL
        AND "periodYear" = $1
        AND "periodQuarter" IS NOT NULL
      GROUP BY "periodQuarter"
      ORDER BY "periodQuarter"`,
      [year],
    );

    return rows.map((r: { period: string; achievement_rate: string }) => ({
      period: `Q${r.period}`,
      achievementRate: Number(r.achievement_rate ?? 0),
    }));
  }
}
