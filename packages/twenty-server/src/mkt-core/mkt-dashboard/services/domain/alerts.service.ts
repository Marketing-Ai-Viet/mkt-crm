import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { getWorkspaceDataSourceWithSchema } from 'src/mkt-core/mkt-dashboard/utils/workspace-query.helper';
import { DepartmentFilterHelper } from 'src/mkt-core/mkt-dashboard/utils/department-filter.helper';
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

  async getAlerts(departmentId?: string): Promise<AlertsOutput> {
    try {
      const dataSource = await getWorkspaceDataSourceWithSchema(
        this.scopedWorkspaceContextFactory,
        this.twentyORMGlobalManager,
      );

      const departmentIds = await DepartmentFilterHelper.resolveDepartmentIds(
        dataSource,
        departmentId,
      );

      const [
        overdueOrders,
        expiringContracts,
        pendingPayments,
        underperformingKpis,
      ] = await Promise.all([
        this.getOverdueOrders(departmentIds),
        this.getExpiringContracts(departmentIds),
        this.getPendingPayments(departmentIds),
        this.getUnderperformingKpis(departmentIds),
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

  private async getOverdueOrders(departmentIds?: string[]) {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const params: (number | string[])[] = [DASHBOARD_LIMITS.OVERDUE_ORDERS];

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      '"accountOwnerId"',
      departmentIds,
      2,
    );

    if (deptFilter) {
      params.push(deptFilter.params as unknown as string[]);
    }

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
        ${deptFilter?.clause ?? ''}
      ORDER BY days_overdue DESC
      LIMIT $1`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformOverdueOrders(rows);
  }

  private async getExpiringContracts(departmentIds?: string[]) {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const params: (number | string[])[] = [DASHBOARD_LIMITS.EXPIRING_CONTRACTS];

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      '"accountOwnerId"',
      departmentIds,
      2,
    );

    if (deptFilter) {
      params.push(deptFilter.params as unknown as string[]);
    }

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
        ${deptFilter?.clause ?? ''}
      ORDER BY "endDate"
      LIMIT $1`,
      params,
      undefined,
      { shouldBypassPermissionChecks: true },
    );

    return DashboardDataTransformer.transformExpiringContracts(rows);
  }

  private async getPendingPayments(
    departmentIds?: string[],
  ): Promise<
    Array<{ id: string; name: string; amount: number; daysPending: number }>
  > {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const params: (number | string[])[] = [DASHBOARD_LIMITS.PENDING_PAYMENTS];

    let deptClause = '';

    if (departmentIds) {
      params.push(departmentIds as unknown as string[]);
      deptClause = `AND o."accountOwnerId" IN (
          SELECT wm.id FROM "workspaceMember" wm
          WHERE wm."deletedAt" IS NULL AND wm."departmentId" = ANY($2)
        )`;
    }

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
        ${deptClause}
      ORDER BY days_pending DESC
      LIMIT $1`,
      params,
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

  private async getUnderperformingKpis(
    departmentIds?: string[],
  ): Promise<Array<{ kpiName: string; progress: number; target: number }>> {
    const dataSource = await getWorkspaceDataSourceWithSchema(
      this.scopedWorkspaceContextFactory,
      this.twentyORMGlobalManager,
    );

    const params: (number | string[])[] = [
      DASHBOARD_LIMITS.UNDERPERFORMING_KPIS,
    ];

    const deptFilter = DepartmentFilterHelper.buildOwnerFilter(
      '"assignedToId"',
      departmentIds,
      2,
    );

    if (deptFilter) {
      params.push(deptFilter.params as unknown as string[]);
    }

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
        ${deptFilter?.clause ?? ''}
      ORDER BY progress ASC
      LIMIT $1`,
      params,
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
