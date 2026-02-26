import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  DataScope,
  RequireExecutive,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/decorators';
import { DashboardWidgetService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-widget.service';
import { DashboardLayoutRepository } from 'src/mkt-core/mkt-dashboard/repositories/dashboard-layout.repository';
import { CreateDashboardWidgetInput } from 'src/mkt-core/mkt-dashboard/dto/input/create-widget.input';
import { UpdateWidgetPositionInput } from 'src/mkt-core/mkt-dashboard/dto/input/update-widget-position.input';
import { SaveDashboardLayoutInput } from 'src/mkt-core/mkt-dashboard/dto/input/save-layout.input';
import { WidgetOutput } from 'src/mkt-core/mkt-dashboard/dto/output/widget.output';
import { DASHBOARD_INVALIDATION_EVENTS } from 'src/mkt-core/mkt-dashboard/listeners/dashboard-cache-invalidation.listener';
import { MktDashboardWidgetWorkspaceEntity } from 'src/mkt-core/mkt-dashboard/workspace-entity/mkt-dashboard-widget.workspace-entity';

/**
 * DashboardWidgetResolver - GraphQL resolver for Dashboard Widget CRUD and Layout operations
 *
 * Provides:
 * - Widget listing and lookup
 * - Widget creation, position update, and deactivation
 * - Dashboard layout persistence
 *
 * Access Control:
 * - All operations require WorkspaceAuth + UserAuth
 * - @RequireExecutive: Only hierarchy level ≤ 3 (CEO, C_LEVEL, VP) can access
 * - Row-level security enforced via @DataScope decorator
 * - Mutations emit cache invalidation events
 */
@Resolver()
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class DashboardWidgetResolver {
  constructor(
    private readonly widgetService: DashboardWidgetService,
    private readonly layoutRepository: DashboardLayoutRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get all active dashboard widgets
   */
  @Query(() => [WidgetOutput])
  @RequireExecutive()
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'low' })
  async dashboardWidgets(): Promise<WidgetOutput[]> {
    const widgets = await this.widgetService.getActiveWidgets();

    return widgets.map((widget) => this.mapToWidgetOutput(widget));
  }

  /**
   * Get a single dashboard widget by ID
   */
  @Query(() => WidgetOutput)
  @RequireExecutive()
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'low' })
  async dashboardWidget(
    @Args('widgetId', { type: () => String }) widgetId: string,
  ): Promise<WidgetOutput> {
    const widget = await this.widgetService.getWidgetById(widgetId);

    return this.mapToWidgetOutput(widget);
  }

  // ============================================
  // MUTATIONS
  // ============================================

  /**
   * Create a new dashboard widget
   */
  @Mutation(() => WidgetOutput)
  @RequireExecutive()
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'high' })
  async createDashboardWidget(
    @Args('input', { type: () => CreateDashboardWidgetInput })
    input: CreateDashboardWidgetInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<WidgetOutput> {
    const result = await this.widgetService.createWidget(
      input,
      workspaceMemberId,
    );

    this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.WIDGET_CHANGED, {
      workspaceId: workspace.id,
      widgetId: result.id,
    });

    return this.mapToWidgetOutput(result);
  }

  /**
   * Update widget position and layout within the dashboard grid
   */
  @Mutation(() => WidgetOutput, { nullable: true })
  @RequireExecutive()
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async updateWidgetPosition(
    @Args('input', { type: () => UpdateWidgetPositionInput })
    input: UpdateWidgetPositionInput,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<WidgetOutput | null> {
    const result = await this.widgetService.updateWidgetPosition(input);

    if (result) {
      this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.WIDGET_CHANGED, {
        workspaceId: workspace.id,
        widgetId: input.widgetId,
      });
    }

    return result ? this.mapToWidgetOutput(result) : null;
  }

  /**
   * Deactivate a widget (soft delete)
   */
  @Mutation(() => Boolean)
  @RequireExecutive()
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'high' })
  async deactivateWidget(
    @Args('widgetId', { type: () => String }) widgetId: string,
    @AuthWorkspace() workspace: Workspace,
  ): Promise<boolean> {
    await this.widgetService.deactivateWidget(widgetId);

    this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.WIDGET_CHANGED, {
      workspaceId: workspace.id,
      widgetId,
    });

    return true;
  }

  /**
   * Save dashboard layout configuration for the current user
   */
  @Mutation(() => Boolean)
  @RequireExecutive()
  @DataScope({ resource: 'DASHBOARD', mode: 'AUTO', auditLevel: 'medium' })
  async saveDashboardLayout(
    @Args('input', { type: () => SaveDashboardLayoutInput })
    input: SaveDashboardLayoutInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<boolean> {
    await this.layoutRepository.create({
      ...input,
      ownerId: workspaceMemberId,
    });

    this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.LAYOUT_CHANGED, {
      workspaceId: workspace.id,
      userId: workspaceMemberId,
    });

    return true;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapToWidgetOutput(
    entity: MktDashboardWidgetWorkspaceEntity,
  ): WidgetOutput {
    return {
      id: entity.id,
      widgetName: entity.widgetName,
      widgetCode: entity.widgetCode,
      widgetType: entity.widgetType,
      dataSource: entity.dataSource,
      defaultColSpan: entity.defaultColSpan,
      defaultRowSpan: entity.defaultRowSpan,
      defaultPeriod: entity.defaultPeriod,
      filterConfig: (entity.filterConfig as Record<string, unknown>) ?? null,
      visibility: entity.visibility,
      isActive: entity.isActive,
      isSystemDefault: entity.isSystemDefault,
      displayOrder: entity.displayOrder,
      cacheTtlSeconds: entity.cacheTtlSeconds ?? null,
      widgetConfig: (entity.widgetConfig as Record<string, unknown>) ?? null,
      description: entity.description ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
