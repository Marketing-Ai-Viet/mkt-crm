import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { getWorkspaceDataSourceWithSchema } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import {
  DashboardDataTransformer,
  RawOrderStatusRow,
  RawOrderTrendRow,
  RawTopProductRow,
} from 'src/mkt-core/mkt-dashboard/utils/dashboard-data.transformer';
import { OrderStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/order-stats.input';
import { OrderStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/order-stats.output';
import { DASHBOARD_LIMITS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-limits';
import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'OrderStatsService';

@Injectable()
export class OrderStatsService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly dateRangeService: DashboardDateRangeService,
  ) {}

  async getStats(input: OrderStatsInput): Promise<OrderStatsOutput> {
    const dateRange = this.dateRangeService.resolve(
      input.period as DashboardPeriod,
      input.startDate,
      input.endDate,
    );

    try {
      const [ordersByStatus, orderTrend, topProducts, avgValues] =
        await Promise.all([
          this.getOrdersByStatus(dateRange),
          this.getOrderTrend(dateRange),
          this.getTopProducts(
            dateRange,
            input.topProductsLimit ?? DASHBOARD_LIMITS.TOP_PRODUCTS,
          ),
          this.getAverageValues(dateRange),
        ]);

      return {
        ordersByStatus,
        orderTrend,
        averageOrderValue: avgValues.averageOrderValue,
        averageProcessingTime: avgValues.averageProcessingTime,
        conversionRate: avgValues.conversionRate,
        topProducts,
      };
    } catch (error) {
      this.logger.error('Failed to get order stats', {
        error: getErrorMessage(error),
        period: input.period,
      });
      throw error;
    }
  }

  private async getOrdersByStatus(dateRange: {
    startDate: string;
    endDate: string;
  }) {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows: RawOrderStatusRow[] = await dataSource.query(
      `SELECT
        status,
        COUNT(*) AS count,
        COALESCE(SUM("totalAmount"), 0) AS total_amount
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
        AND "createdAt" BETWEEN $1 AND $2
      GROUP BY status
      ORDER BY count DESC`,
      [dateRange.startDate, dateRange.endDate],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformOrdersByStatus(rows);
  }

  private async getOrderTrend(dateRange: {
    startDate: string;
    endDate: string;
  }) {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows: RawOrderTrendRow[] = await dataSource.query(
      `SELECT
        DATE_TRUNC('month', "createdAt") AS period,
        COUNT(*) AS count,
        COALESCE(SUM("totalAmount"), 0) AS amount
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
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

    return DashboardDataTransformer.transformOrderTrend(rows);
  }

  private async getTopProducts(
    dateRange: { startDate: string; endDate: string },
    limit: number,
  ) {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows: RawTopProductRow[] = await dataSource.query(
      `SELECT
        oi."snapshotProductName" AS product_name,
        oi."externalMktProductId" AS product_id,
        SUM(oi.quantity) AS quantity,
        SUM(oi."totalPrice") AS revenue
      FROM "mktOrderItem" oi
      JOIN "mktOrder" o ON oi."mktOrderId" = o.id
      WHERE o."deletedAt" IS NULL
        AND oi."deletedAt" IS NULL
        AND o."createdAt" BETWEEN $1 AND $2
      GROUP BY oi."externalMktProductId", oi."snapshotProductName"
      ORDER BY revenue DESC
      LIMIT $3`,
      [dateRange.startDate, dateRange.endDate, limit],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformTopProducts(rows);
  }

  private async getAverageValues(dateRange: {
    startDate: string;
    endDate: string;
  }): Promise<{
    averageOrderValue: number;
    averageProcessingTime: number;
    conversionRate: number;
  }> {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows = await dataSource.query(
      `SELECT
        COALESCE(AVG("totalAmount"), 0) AS avg_order_value,
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_orders,
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400
          ) FILTER (WHERE status = 'COMPLETED'),
          0
        ) AS avg_processing_days
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
        AND "createdAt" BETWEEN $1 AND $2`,
      [dateRange.startDate, dateRange.endDate],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    const row = rows[0];
    const totalOrders = Number(row?.total_orders ?? 0);
    const completedOrders = Number(row?.completed_orders ?? 0);

    return {
      averageOrderValue: MoneyUtils.from(
        row?.avg_order_value ?? '0',
      ).toNumber(),
      averageProcessingTime: MoneyUtils.round(
        Number(row?.avg_processing_days ?? 0),
      ).toNumber(),
      conversionRate:
        totalOrders > 0
          ? MoneyUtils.percentageOf(completedOrders, totalOrders).toNumber()
          : 0,
    };
  }
}
