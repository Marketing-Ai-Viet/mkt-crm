import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { getWorkspaceDataSourceWithSchema } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import { DepartmentFilterHelper } from 'src/mkt-core/mkt-dashboard/utils/department-filter.helper';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import {
  DashboardDataTransformer,
  RawPaymentStatusRow,
} from 'src/mkt-core/mkt-dashboard/utils/dashboard-data.transformer';
import { StatisticsUtils } from 'src/mkt-core/mkt-dashboard/utils/statistics.utils';
import { PaymentStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/payment-stats.output';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'PaymentStatsService';

@Injectable()
export class PaymentStatsService {
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
    departmentId?: string,
  ): Promise<PaymentStatsOutput> {
    const dateRange = this.dateRangeService.resolve(period, startDate, endDate);

    try {
      const dataSource = await getWorkspaceDataSourceWithSchema(
        this.scopedWorkspaceContextFactory,
        this.twentyORMGlobalManager,
      );

      const departmentIds = await DepartmentFilterHelper.resolveDepartmentIds(
        dataSource,
        departmentId,
      );

      const [paymentsByStatus, overdueCount] = await Promise.all([
        this.getPaymentsByStatus(dateRange, departmentIds),
        this.getOverduePaymentCount(departmentIds),
      ]);

      // Calculate totals from status breakdown
      let totalCollected = 0;
      let pendingAmount = 0;
      let totalAmount = 0;

      for (const item of paymentsByStatus) {
        totalAmount = MoneyUtils.add(totalAmount, item.amount).toNumber();

        if (item.status === 'COMPLETED' || item.status === 'CONFIRMED') {
          totalCollected = MoneyUtils.add(
            totalCollected,
            item.amount,
          ).toNumber();
        }

        if (item.status === 'PENDING' || item.status === 'PROCESSING') {
          pendingAmount = MoneyUtils.add(pendingAmount, item.amount).toNumber();
        }
      }

      const collectionRate = StatisticsUtils.collectionRate(
        totalCollected,
        totalAmount,
      );

      return {
        totalCollected,
        pendingAmount,
        collectionRate,
        paymentsByStatus,
        overduePayments: overdueCount,
      };
    } catch (error) {
      this.logger.error('Failed to get payment stats', {
        error: getErrorMessage(error),
        period,
      });
      throw error;
    }
  }

  private async getPaymentsByStatus(
    dateRange: { startDate: string; endDate: string },
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

    let deptClause = '';

    if (departmentIds) {
      params.push(departmentIds);
      deptClause = `AND "mktOrderId" IN (
          SELECT o.id FROM "mktOrder" o
          WHERE o."accountOwnerId" IN (
            SELECT wm.id FROM "workspaceMember" wm
            WHERE wm."deletedAt" IS NULL AND wm."departmentId" = ANY($3)
          )
        )`;
    }

    // SQL from design doc 7.4
    const rows: RawPaymentStatusRow[] = await dataSource.query(
      `SELECT
        status,
        COUNT(*) AS cnt,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM "mktPayment"
      WHERE "deletedAt" IS NULL
        AND "createdAt" BETWEEN $1 AND $2
        ${deptClause}
      GROUP BY status`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformPaymentStatus(rows);
  }

  private async getOverduePaymentCount(
    departmentIds?: string[],
  ): Promise<number> {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const params: string[][] = [];
    let deptClause = '';

    if (departmentIds) {
      params.push(departmentIds);
      deptClause = `AND "mktOrderId" IN (
          SELECT o.id FROM "mktOrder" o
          WHERE o."accountOwnerId" IN (
            SELECT wm.id FROM "workspaceMember" wm
            WHERE wm."deletedAt" IS NULL AND wm."departmentId" = ANY($1)
          )
        )`;
    }

    const rows = await dataSource.query(
      `SELECT COUNT(*) AS count
      FROM "mktPayment"
      WHERE "deletedAt" IS NULL
        AND status IN ('PENDING', 'PROCESSING')
        AND "expiredAt" < NOW()
        ${deptClause}`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return Number(rows[0]?.count ?? 0);
  }
}
