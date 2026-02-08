import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
  ): Promise<PaymentStatsOutput> {
    const dateRange = this.dateRangeService.resolve(period, startDate, endDate);

    try {
      const [paymentsByStatus, overdueCount] = await Promise.all([
        this.getPaymentsByStatus(dateRange),
        this.getOverduePaymentCount(),
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

  private async getPaymentsByStatus(dateRange: {
    startDate: string;
    endDate: string;
  }) {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId ?? '';
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId: wsId,
      });

    // SQL from design doc 7.4
    const rows: RawPaymentStatusRow[] = await dataSource.query(
      `SELECT
        status,
        COUNT(*) AS cnt,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM "mktPayment"
      WHERE "deletedAt" IS NULL
        AND "createdAt" BETWEEN $1 AND $2
      GROUP BY status`,
      [dateRange.startDate, dateRange.endDate],
    );

    return DashboardDataTransformer.transformPaymentStatus(rows);
  }

  private async getOverduePaymentCount(): Promise<number> {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId ?? '';
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId: wsId,
      });

    const rows = await dataSource.query(
      `SELECT COUNT(*) AS count
      FROM "mktPayment"
      WHERE "deletedAt" IS NULL
        AND status IN ('PENDING', 'PROCESSING')
        AND "dueDate" < NOW()`,
    );

    return Number(rows[0]?.count ?? 0);
  }
}
