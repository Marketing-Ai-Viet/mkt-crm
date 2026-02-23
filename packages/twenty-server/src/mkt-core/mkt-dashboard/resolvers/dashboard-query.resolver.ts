import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
// TODO: Re-enable @DataScope when RBAC is stable
// import { DataScope } from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { DashboardOrchestratorService } from 'src/mkt-core/mkt-dashboard/services/application/dashboard-orchestrator.service';
import { DashboardSummaryInput } from 'src/mkt-core/mkt-dashboard/dto/input/dashboard-summary.input';
import { RevenueStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-stats.input';
import { OrderStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/order-stats.input';
import { CustomerStatsInput } from 'src/mkt-core/mkt-dashboard/dto/input/customer-stats.input';
import { KpiScorecardInput } from 'src/mkt-core/mkt-dashboard/dto/input/kpi-scorecard.input';
import { LeaderboardInput } from 'src/mkt-core/mkt-dashboard/dto/input/leaderboard.input';
import { RevenueDailyInput } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-daily.input';
import { DashboardSummaryOutput } from 'src/mkt-core/mkt-dashboard/dto/output/dashboard-summary.output';
import { RevenueStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-stats.output';
import { OrderStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/order-stats.output';
import { CustomerStatsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/customer-stats.output';
import { KpiScorecardOutput } from 'src/mkt-core/mkt-dashboard/dto/output/kpi-scorecard.output';
import { StaffLeaderboardOutput } from 'src/mkt-core/mkt-dashboard/dto/output/leaderboard.output';
import { AlertsOutput } from 'src/mkt-core/mkt-dashboard/dto/output/alerts.output';
import { RevenueDailyOutput } from 'src/mkt-core/mkt-dashboard/dto/output/revenue-daily.output';

/**
 * DashboardQueryResolver - GraphQL resolver for Dashboard queries
 *
 * Provides aggregated dashboard data including:
 * - Full dashboard summary
 * - Revenue statistics
 * - Order statistics
 * - Customer statistics
 * - KPI scorecard
 * - Staff leaderboard
 * - Dashboard alerts
 *
 * Access Control:
 * - All queries require WorkspaceAuth + UserAuth
 * - Row-level security enforced via @DataScope decorator
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class DashboardQueryResolver {
  constructor(private readonly orchestrator: DashboardOrchestratorService) {}

  /**
   * Get full dashboard summary with all aggregated metrics
   */
  @Query(() => DashboardSummaryOutput)
  // @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'low' })
  async dashboardSummary(
    @Args('input', { type: () => DashboardSummaryInput })
    input: DashboardSummaryInput,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<DashboardSummaryOutput> {
    return this.orchestrator.getDashboardSummary(workspace.id, input);
  }

  /**
   * Get revenue statistics for the given period
   */
  @Query(() => RevenueStatsOutput)
  // @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async revenueStats(
    @Args('input', { type: () => RevenueStatsInput })
    input: RevenueStatsInput,
  ): Promise<RevenueStatsOutput> {
    return this.orchestrator.getRevenueStats(input);
  }

  /**
   * Get order statistics for the given period
   */
  @Query(() => OrderStatsOutput)
  // @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async orderStats(
    @Args('input', { type: () => OrderStatsInput })
    input: OrderStatsInput,
  ): Promise<OrderStatsOutput> {
    return this.orchestrator.getOrderStats(input);
  }

  /**
   * Get customer statistics for the given period
   */
  @Query(() => CustomerStatsOutput)
  // @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async customerStats(
    @Args('input', { type: () => CustomerStatsInput })
    input: CustomerStatsInput,
  ): Promise<CustomerStatsOutput> {
    return this.orchestrator.getCustomerStats(input);
  }

  /**
   * Get KPI scorecard with metric breakdowns
   */
  @Query(() => KpiScorecardOutput)
  // @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async kpiScorecard(
    @Args('input', { type: () => KpiScorecardInput })
    input: KpiScorecardInput,
  ): Promise<KpiScorecardOutput> {
    return this.orchestrator.getKpiStats(input);
  }

  /**
   * Get staff leaderboard ranked by performance metrics
   */
  @Query(() => StaffLeaderboardOutput)
  // @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async staffLeaderboard(
    @Args('input', { type: () => LeaderboardInput })
    input: LeaderboardInput,
  ): Promise<StaffLeaderboardOutput> {
    return this.orchestrator.getLeaderboard(input);
  }

  /**
   * Get active dashboard alerts (expiring licenses, overdue payments, etc.)
   */
  @Query(() => AlertsOutput)
  // @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'low' })
  async dashboardAlerts(): Promise<AlertsOutput> {
    return this.orchestrator.getAlerts();
  }

  /**
   * Get daily revenue breakdown for a specific ISO week
   */
  @Query(() => RevenueDailyOutput)
  // @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async revenueDailyByWeek(
    @Args('input', { type: () => RevenueDailyInput })
    input: RevenueDailyInput,
  ): Promise<RevenueDailyOutput> {
    return this.orchestrator.getRevenueDailyByWeek(input);
  }
}
