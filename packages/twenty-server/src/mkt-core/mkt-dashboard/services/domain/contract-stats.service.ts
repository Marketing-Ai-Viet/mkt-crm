import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { getWorkspaceDataSourceWithSchema } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import { ContractStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/contract-stats.output';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'ContractStatsService';

@Injectable()
export class ContractStatsService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly dateRangeService: DashboardDateRangeService,
  ) {}

  async getStats(
    period: DashboardPeriod,
    startDate?: string,
    endDate?: string,
  ): Promise<ContractStatsOutput> {
    const dateRange = this.dateRangeService.resolve(period, startDate, endDate);

    try {
      const [totalActive, expiringThisMonth, newThisPeriod] = await Promise.all(
        [
          this.getTotalActiveContracts(),
          this.getExpiringThisMonth(),
          this.getNewContractsInPeriod(dateRange),
        ],
      );

      return {
        totalActive,
        expiringThisMonth,
        newThisPeriod,
      };
    } catch (error) {
      this.logger.error('Failed to get contract stats', {
        error: getErrorMessage(error),
        period,
      });
      throw error;
    }
  }

  private async getTotalActiveContracts(): Promise<number> {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows = await dataSource.query(
      `SELECT COUNT(*) AS count
      FROM "mktContract"
      WHERE "deletedAt" IS NULL
        AND status != 'TERMINATED'
        AND ("endDate" IS NULL OR "endDate" >= CURRENT_DATE)`,
      [],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return Number(rows[0]?.count ?? 0);
  }

  private async getExpiringThisMonth(): Promise<number> {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    // SQL from design doc 7.7
    const rows = await dataSource.query(
      `SELECT COUNT(*) AS count
      FROM "mktContract"
      WHERE "deletedAt" IS NULL
        AND status != 'TERMINATED'
        AND "endDate" BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
      [],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return Number(rows[0]?.count ?? 0);
  }

  private async getNewContractsInPeriod(dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<number> {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows = await dataSource.query(
      `SELECT COUNT(*) AS count
      FROM "mktContract"
      WHERE "deletedAt" IS NULL
        AND "createdAt" BETWEEN $1 AND $2`,
      [dateRange.startDate, dateRange.endDate],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return Number(rows[0]?.count ?? 0);
  }
}
