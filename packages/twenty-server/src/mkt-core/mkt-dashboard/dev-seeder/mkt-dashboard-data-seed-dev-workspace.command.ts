import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Command, CommandRunner, Option } from 'nest-commander';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Repository } from 'typeorm';

import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktDashboardLayoutWorkspaceEntity } from 'src/mkt-core/mkt-dashboard/workspace-entity/mkt-dashboard-layout.workspace-entity';
import { MktDashboardWidgetWorkspaceEntity } from 'src/mkt-core/mkt-dashboard/workspace-entity/mkt-dashboard-widget.workspace-entity';

type SeedModuleOptions = {
  workspaceId?: string;
};

const DEFAULT_WIDGETS: Partial<MktDashboardWidgetWorkspaceEntity>[] = [
  {
    widgetName: 'Total Revenue',
    widgetCode: 'TOTAL_REVENUE',
    widgetType: 'STAT_CARD',
    dataSource: 'REVENUE',
    defaultColSpan: 3,
    defaultRowSpan: 1,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 1,
    description: 'Total revenue for the selected period',
  },
  {
    widgetName: 'Total Orders',
    widgetCode: 'TOTAL_ORDERS',
    widgetType: 'STAT_CARD',
    dataSource: 'ORDERS',
    defaultColSpan: 3,
    defaultRowSpan: 1,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 2,
    description: 'Total orders for the selected period',
  },
  {
    widgetName: 'Total Customers',
    widgetCode: 'TOTAL_CUSTOMERS',
    widgetType: 'STAT_CARD',
    dataSource: 'CUSTOMERS',
    defaultColSpan: 3,
    defaultRowSpan: 1,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 3,
    description: 'Total customers count',
  },
  {
    widgetName: 'Collection Rate',
    widgetCode: 'COLLECTION_RATE',
    widgetType: 'STAT_CARD',
    dataSource: 'PAYMENTS',
    defaultColSpan: 3,
    defaultRowSpan: 1,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 4,
    description: 'Payment collection rate percentage',
  },
  {
    widgetName: 'Revenue Trend',
    widgetCode: 'REVENUE_TREND',
    widgetType: 'LINE_CHART',
    dataSource: 'REVENUE',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 5,
    description: 'Revenue trend over time',
  },
  {
    widgetName: 'Order Status Distribution',
    widgetCode: 'ORDER_STATUS_DIST',
    widgetType: 'PIE_CHART',
    dataSource: 'ORDERS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 6,
    description: 'Distribution of orders by status',
  },
  {
    widgetName: 'Customer Tier Distribution',
    widgetCode: 'CUSTOMER_TIER_DIST',
    widgetType: 'BAR_CHART',
    dataSource: 'CUSTOMERS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 7,
    description: 'Customers grouped by tier',
  },
  {
    widgetName: 'Payment Status',
    widgetCode: 'PAYMENT_STATUS',
    widgetType: 'PIE_CHART',
    dataSource: 'PAYMENTS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 8,
    description: 'Distribution of payments by status',
  },
  {
    widgetName: 'KPI Scorecard',
    widgetCode: 'KPI_SCORECARD',
    widgetType: 'KPI_SCORECARD',
    dataSource: 'KPIS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 9,
    description: 'KPI achievement scorecard',
  },
  {
    widgetName: 'Staff Leaderboard',
    widgetCode: 'STAFF_LEADERBOARD',
    widgetType: 'LEADERBOARD',
    dataSource: 'COMBINED',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 10,
    description: 'Staff performance leaderboard',
  },
  {
    widgetName: 'Top Customers',
    widgetCode: 'TOP_CUSTOMERS',
    widgetType: 'TABLE',
    dataSource: 'CUSTOMERS',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 11,
    description: 'Top customers by revenue',
  },
  {
    widgetName: 'Alerts Panel',
    widgetCode: 'ALERTS_PANEL',
    widgetType: 'TABLE',
    dataSource: 'COMBINED',
    defaultColSpan: 6,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 12,
    description: 'Active alerts and notifications',
  },
  {
    widgetName: 'Contract Summary',
    widgetCode: 'CONTRACT_SUMMARY',
    widgetType: 'STAT_CARD',
    dataSource: 'CONTRACTS',
    defaultColSpan: 4,
    defaultRowSpan: 1,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 13,
    description: 'Contract summary statistics',
  },
  {
    widgetName: 'Customer Growth',
    widgetCode: 'CUSTOMER_GROWTH',
    widgetType: 'TREND_CHART',
    dataSource: 'CUSTOMERS',
    defaultColSpan: 8,
    defaultRowSpan: 2,
    defaultPeriod: 'THIS_MONTH',
    visibility: 'ALL',
    isActive: true,
    isSystemDefault: true,
    displayOrder: 14,
    description: 'Customer growth trend over time',
  },
];

const DEFAULT_LAYOUT_WIDGET_ORDER = [
  {
    widgetCode: 'TOTAL_REVENUE',
    gridCol: 1,
    gridRow: 1,
    colSpan: 3,
    rowSpan: 1,
    isVisible: true,
  },
  {
    widgetCode: 'TOTAL_ORDERS',
    gridCol: 4,
    gridRow: 1,
    colSpan: 3,
    rowSpan: 1,
    isVisible: true,
  },
  {
    widgetCode: 'TOTAL_CUSTOMERS',
    gridCol: 7,
    gridRow: 1,
    colSpan: 3,
    rowSpan: 1,
    isVisible: true,
  },
  {
    widgetCode: 'COLLECTION_RATE',
    gridCol: 10,
    gridRow: 1,
    colSpan: 3,
    rowSpan: 1,
    isVisible: true,
  },
  {
    widgetCode: 'REVENUE_TREND',
    gridCol: 1,
    gridRow: 2,
    colSpan: 6,
    rowSpan: 2,
    isVisible: true,
  },
  {
    widgetCode: 'ORDER_STATUS_DIST',
    gridCol: 7,
    gridRow: 2,
    colSpan: 6,
    rowSpan: 2,
    isVisible: true,
  },
  {
    widgetCode: 'CUSTOMER_TIER_DIST',
    gridCol: 1,
    gridRow: 4,
    colSpan: 6,
    rowSpan: 2,
    isVisible: true,
  },
  {
    widgetCode: 'PAYMENT_STATUS',
    gridCol: 7,
    gridRow: 4,
    colSpan: 6,
    rowSpan: 2,
    isVisible: true,
  },
  {
    widgetCode: 'KPI_SCORECARD',
    gridCol: 1,
    gridRow: 6,
    colSpan: 6,
    rowSpan: 2,
    isVisible: true,
  },
  {
    widgetCode: 'STAFF_LEADERBOARD',
    gridCol: 7,
    gridRow: 6,
    colSpan: 6,
    rowSpan: 2,
    isVisible: true,
  },
  {
    widgetCode: 'TOP_CUSTOMERS',
    gridCol: 1,
    gridRow: 8,
    colSpan: 6,
    rowSpan: 2,
    isVisible: true,
  },
  {
    widgetCode: 'ALERTS_PANEL',
    gridCol: 7,
    gridRow: 8,
    colSpan: 6,
    rowSpan: 2,
    isVisible: true,
  },
  {
    widgetCode: 'CONTRACT_SUMMARY',
    gridCol: 1,
    gridRow: 10,
    colSpan: 4,
    rowSpan: 1,
    isVisible: true,
  },
  {
    widgetCode: 'CUSTOMER_GROWTH',
    gridCol: 5,
    gridRow: 10,
    colSpan: 8,
    rowSpan: 2,
    isVisible: true,
  },
];

const DEFAULT_LAYOUT: Partial<MktDashboardLayoutWorkspaceEntity> = {
  name: 'System Default Dashboard',
  layoutType: 'SYSTEM_DEFAULT',
  widgetOrder: DEFAULT_LAYOUT_WIDGET_ORDER,
  isDefault: true,
  isActive: true,
};

@Command({
  name: 'mkt-dashboard-data-seed-dev-workspace',
  description: 'Seed dashboard default widgets and layout for workspace',
})
export class MktDashboardDataSeedDevWorkspaceCommand extends CommandRunner {
  private readonly logger = new Logger(
    MktDashboardDataSeedDevWorkspaceCommand.name,
  );

  constructor(
    @InjectRepository(Workspace, 'core')
    private readonly workspaceRepository: Repository<Workspace>,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {
    super();
  }

  @Option({
    flags: '-w, --workspace-id [workspace_id]',
    description: 'workspace id',
  })
  parseWorkspaceId(value: string): string {
    return value;
  }

  async run(_passedParam: string[], options: SeedModuleOptions): Promise<void> {
    this.logger.log('Starting dashboard data seeding...');

    let workspaces: Workspace[] = [];

    if (options?.workspaceId) {
      const workspace = await this.workspaceRepository.findOne({
        where: { id: options.workspaceId },
      });

      if (workspace) {
        workspaces = [workspace];
      } else {
        this.logger.error(`Workspace ${options.workspaceId} not found`);

        return;
      }
    } else {
      workspaces = await this.workspaceRepository.find({
        where: {
          activationStatus: WorkspaceActivationStatus.ACTIVE,
        },
      });
    }

    for (const workspace of workspaces) {
      try {
        await this.seedWorkspace(workspace.id);
        this.logger.log(`Dashboard data seeded for workspace: ${workspace.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to seed dashboard data for workspace ${workspace.id}:`,
          error,
        );
      }
    }

    this.logger.log('Dashboard data seeding completed.');
  }

  private async seedWorkspace(workspaceId: string): Promise<void> {
    const widgetRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDashboardWidgetWorkspaceEntity>(
        workspaceId,
        'mktDashboardWidget',
      );

    const layoutRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDashboardLayoutWorkspaceEntity>(
        workspaceId,
        'mktDashboardLayout',
      );

    const existing = await widgetRepo.find({
      where: { isSystemDefault: true } as never,
    });

    if (existing.length > 0) {
      this.logger.log(
        `Widgets already seeded for workspace ${workspaceId}, skipping widgets...`,
      );
    } else {
      const savedWidgets = await widgetRepo.save(DEFAULT_WIDGETS);

      this.logger.log(
        `Inserted ${savedWidgets.length} default widgets for workspace ${workspaceId}`,
      );
    }

    const existingLayout = await layoutRepo.find({
      where: { layoutType: 'SYSTEM_DEFAULT' } as never,
    });

    if (existingLayout.length > 0) {
      this.logger.log(
        `Default layout already exists for workspace ${workspaceId}, skipping layout...`,
      );
    } else {
      await layoutRepo.save(DEFAULT_LAYOUT);

      this.logger.log(`Inserted default layout for workspace ${workspaceId}`);
    }

    this.logger.log(
      `Dashboard seeding completed for workspace ${workspaceId}: ${DEFAULT_WIDGETS.length} widgets, 1 layout`,
    );
  }
}
