import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageQueueModule } from 'src/engine/core-modules/message-queue/message-queue.module';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { DASHBOARD_BLOCK_HOOKS } from 'src/mkt-core/mkt-dashboard/constants/dashboard-block-hooks.constants';
import { DashboardSnapshotDailyJob } from 'src/mkt-core/mkt-dashboard/jobs/dashboard-snapshot-daily.job';
import { DashboardCacheWarmupJob } from 'src/mkt-core/mkt-dashboard/jobs/dashboard-cache-warmup.job';
import { DashboardSnapshotCleanupJob } from 'src/mkt-core/mkt-dashboard/jobs/dashboard-snapshot-cleanup.job';
import { DashboardCacheInvalidationListener } from 'src/mkt-core/mkt-dashboard/listeners/dashboard-cache-invalidation.listener';
import { DashboardWidgetRepository } from 'src/mkt-core/mkt-dashboard/repositories/dashboard-widget.repository';
import { DashboardSnapshotRepository } from 'src/mkt-core/mkt-dashboard/repositories/dashboard-snapshot.repository';
import { DashboardLayoutRepository } from 'src/mkt-core/mkt-dashboard/repositories/dashboard-layout.repository';
import { DashboardQueryResolver } from 'src/mkt-core/mkt-dashboard/resolvers/dashboard-query.resolver';
import { DashboardWidgetResolver } from 'src/mkt-core/mkt-dashboard/resolvers/dashboard-widget.resolver';
import { DashboardOrchestratorService } from 'src/mkt-core/mkt-dashboard/services/application/dashboard-orchestrator.service';
import { DashboardCacheService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-cache.service';
import { DashboardCronRegistrationService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-cron-registration.service';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';
import { DashboardSnapshotService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-snapshot.service';
import { DashboardWidgetService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-widget.service';
import { DashboardAlertsService } from 'src/mkt-core/mkt-dashboard/services/domain/alerts.service';
import { ContractStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/contract-stats.service';
import { CustomerStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/customer-stats.service';
import { KpiStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/kpi-stats.service';
import { OrderStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/order-stats.service';
import { PaymentStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/payment-stats.service';
import { RevenueStatsService } from 'src/mkt-core/mkt-dashboard/services/domain/revenue-stats.service';
import { StaffLeaderboardService } from 'src/mkt-core/mkt-dashboard/services/domain/staff-leaderboard.service';

@Module({
  imports: [
    TwentyORMModule,
    TypeOrmModule.forFeature([Workspace], 'core'),
    MessageQueueModule,
    WorkspaceCacheStorageModule,
  ],
  providers: [
    // Block Hooks
    ...DASHBOARD_BLOCK_HOOKS,

    // Event Listeners
    DashboardCacheInvalidationListener,

    // Repositories
    DashboardWidgetRepository,
    DashboardSnapshotRepository,
    DashboardLayoutRepository,

    // Core Services
    DashboardCacheService,
    DashboardDateRangeService,
    DashboardWidgetService,
    DashboardSnapshotService,
    DashboardCronRegistrationService,

    // Domain Services
    RevenueStatsService,
    OrderStatsService,
    CustomerStatsService,
    PaymentStatsService,
    KpiStatsService,
    ContractStatsService,
    DashboardAlertsService,
    StaffLeaderboardService,

    // Application Services
    DashboardOrchestratorService,

    // Jobs
    DashboardSnapshotDailyJob,
    DashboardCacheWarmupJob,
    DashboardSnapshotCleanupJob,

    // Resolvers
    DashboardQueryResolver,
    DashboardWidgetResolver,
  ],
  exports: [
    DashboardOrchestratorService,
    DashboardWidgetService,
    DashboardSnapshotService,
    DashboardCacheService,
  ],
})
export class MktDashboardModule {}
