import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { getWorkspaceDataSourceWithSchema } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import {
  DashboardDataTransformer,
  RawOverdueOrderRow,
  RawExpiringContractRow,
} from 'src/mkt-core/mkt-dashboard/utils/dashboard-data.transformer';
import { AlertsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/alerts.output';
import { DASHBOARD_LIMITS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-limits';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { getErrorMessage } from 'src/mkt-core/utils';

const LOG_CONTEXT = 'DashboardAlertsService';

@Injectable()
export class DashboardAlertsService {
  private readonly logger = new Logger(LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async getAlerts(): Promise<AlertsOutput> {
    try {
      const [
        overdueOrders,
        expiringContracts,
        pendingPayments,
        underperformingKpis,
      ] = await Promise.all([
        this.getOverdueOrders(),
        this.getExpiringContracts(),
        this.getPendingPayments(),
        this.getUnderperformingKpis(),
      ]);

      return {
        overdueOrders,
        expiringContracts,
        pendingPayments,
        underperformingKpis,
      };
    } catch (error) {
      this.logger.error('Failed to get alerts', {
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  private async getOverdueOrders() {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    // SQL from design doc 7.6
    const rows: RawOverdueOrderRow[] = await dataSource.query(
      `SELECT
        id, "orderCode" AS order_code, "totalAmount" AS total_amount,
        "paymentDeadline" AS payment_deadline,
        EXTRACT(DAY FROM NOW() - "paymentDeadline") AS days_overdue
      FROM "mktOrder"
      WHERE "deletedAt" IS NULL
        AND status IN ('LOCKED', 'PROCESSING')
        AND "paymentDeadline" < NOW()
      ORDER BY days_overdue DESC
      LIMIT $1`,
      [DASHBOARD_LIMITS.OVERDUE_ORDERS],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformOverdueOrders(rows);
  }

  private async getExpiringContracts() {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    // SQL from design doc 7.7
    const rows: RawExpiringContractRow[] = await dataSource.query(
      `SELECT
        id, name, "contractNumber" AS contract_number,
        "endDate" AS end_date,
        "endDate" - CURRENT_DATE AS days_to_expiry
      FROM "mktContract"
      WHERE "deletedAt" IS NULL
        AND status != 'TERMINATED'
        AND "endDate" BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY "endDate"
      LIMIT $1`,
      [DASHBOARD_LIMITS.EXPIRING_CONTRACTS],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformExpiringContracts(rows);
  }

  private async getPendingPayments(): Promise<
    Array<{ id: string; name: string; amount: number; daysPending: number }>
  > {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows = await dataSource.query(
      `SELECT
        p.id,
        COALESCE(o."orderCode", 'N/A') AS name,
        p.amount,
        EXTRACT(DAY FROM NOW() - p."createdAt") AS days_pending
      FROM "mktPayment" p
      LEFT JOIN "mktOrder" o ON p."mktOrderId" = o.id
      WHERE p."deletedAt" IS NULL
        AND p.status IN ('PENDING', 'PROCESSING')
      ORDER BY days_pending DESC
      LIMIT $1`,
      [DASHBOARD_LIMITS.PENDING_PAYMENTS],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return rows.map(
      (r: {
        id: string;
        name: string;
        amount: string;
        days_pending: string;
      }) => ({
        id: r.id,
        name: r.name,
        amount: MoneyUtils.from(r.amount).toNumber(),
        daysPending: Math.floor(Number(r.days_pending ?? 0)),
      }),
    );
  }

  private async getUnderperformingKpis(): Promise<
    Array<{ kpiName: string; progress: number; target: number }>
  > {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const rows = await dataSource.query(
      `SELECT
        "kpiName" AS kpi_name,
        "targetValue" AS target,
        CASE
          WHEN "targetValue" > 0
          THEN ROUND("actualValue"::numeric / "targetValue"::numeric * 100, 2)
          ELSE 0
        END AS progress
      FROM "mktKpi"
      WHERE "deletedAt" IS NULL
        AND status IN ('IN_PROGRESS', 'DRAFT')
        AND "periodYear" = EXTRACT(YEAR FROM NOW())
        AND ("targetValue" > 0 AND "actualValue"::numeric / "targetValue" < 0.5)
      ORDER BY progress ASC
      LIMIT $1`,
      [DASHBOARD_LIMITS.UNDERPERFORMING_KPIS],
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return rows.map(
      (r: { kpi_name: string; progress: string; target: string }) => ({
        kpiName: r.kpi_name,
        progress: Number(r.progress ?? 0),
        target: MoneyUtils.from(r.target).toNumber(),
      }),
    );
  }
}
