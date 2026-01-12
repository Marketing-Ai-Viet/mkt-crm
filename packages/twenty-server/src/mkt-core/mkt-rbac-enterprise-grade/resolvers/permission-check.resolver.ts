import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import {
  CheckPermissionInput,
  BatchPermissionCheckInput,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/inputs';
import {
  PermissionResultOutput,
  BatchPermissionCheckResult,
  UserPermissionSummaryOutput,
  AssignedTemplateOutput,
  ActiveTemporaryPermissionOutput,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/dto/outputs';
import {
  MktUserPermissionTemplateRepository,
  MktTemporaryPermissionRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Permission Check Resolver
 *
 * GraphQL resolver for permission checking operations.
 *
 * Queries:
 * - rbacCheckPermission: Check single permission
 * - rbacCheckPermissionBatch: Check multiple permissions
 * - rbacUserPermissions: Get user's effective permissions
 * - rbacUserRoles: Get user's assigned roles
 * - rbacUserPermissionSummary: Get comprehensive user permission summary
 */
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class PermissionCheckResolver {
  private readonly logger = new Logger(PermissionCheckResolver.name);

  constructor(
    private readonly enforcerService: CasbinEnforcerService,
    private readonly userTemplateRepository: MktUserPermissionTemplateRepository,
    private readonly temporaryPermissionRepository: MktTemporaryPermissionRepository,
  ) {}

  /**
   * Check if current user has permission
   */
  @Query(() => PermissionResultOutput, {
    name: 'rbacCheckPermission',
    description: 'Check if user has permission for an action on a resource',
  })
  async checkPermission(
    @Args('input') input: CheckPermissionInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<PermissionResultOutput> {
    const startTime = DateTimeUtils.now();

    // Use provided userId or fallback to current workspaceMemberId
    const targetUserId = input.userId ?? workspaceMemberId;

    const result = await this.enforcerService.checkPermission({
      userId: targetUserId,
      workspaceId: workspace.id,
      resource: input.resourceType,
      action: input.action,
      attributes: input.context as Record<string, unknown> | undefined,
    });

    const executionTimeMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    return {
      granted: result.allowed,
      source: 'CASBIN',
      reason: result.reason,
      executionTimeMs,
      fromCache: false,
    };
  }

  /**
   * Check multiple permissions at once
   */
  @Query(() => BatchPermissionCheckResult, {
    name: 'rbacCheckPermissionBatch',
    description: 'Check multiple permissions in a single request',
  })
  async checkPermissionBatch(
    @Args('input') input: BatchPermissionCheckInput,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<BatchPermissionCheckResult> {
    const startTime = DateTimeUtils.now();

    const checks = input.checks.map((check) => ({
      resource: check.resourceType,
      action: check.action,
      resourceId: check.resourceId,
      attributes: check.context as Record<string, unknown> | undefined,
    }));

    const batchResult = await this.enforcerService.checkPermissionBatch({
      userId: workspaceMemberId,
      workspaceId: workspace.id,
      checks,
    });

    const results: PermissionResultOutput[] = [];

    for (const [key, allowed] of batchResult.results.entries()) {
      results.push({
        granted: allowed,
        source: 'CASBIN',
        reason: allowed ? 'Permission granted' : 'Permission denied',
        metadata: { key },
      });
    }

    const totalTimeMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    return {
      results,
      totalTimeMs,
    };
  }

  /**
   * Get user's roles in current workspace
   */
  @Query(() => [String], {
    name: 'rbacUserRoles',
    description: 'Get all roles assigned to the user',
  })
  async getUserRoles(
    @Args('workspaceMemberId', { nullable: true })
    targetWorkspaceMemberId: string | undefined,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<string[]> {
    const targetId = targetWorkspaceMemberId ?? workspaceMemberId;

    return this.enforcerService.getUserRoles(targetId, workspace.id);
  }

  /**
   * Get user's effective permissions
   */
  @Query(() => [[String]], {
    name: 'rbacUserPermissions',
    description: 'Get all effective permissions for the user',
  })
  async getUserPermissions(
    @Args('workspaceMemberId', { nullable: true })
    targetWorkspaceMemberId: string | undefined,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<string[][]> {
    const targetId = targetWorkspaceMemberId ?? workspaceMemberId;

    return this.enforcerService.getUserPermissions(targetId, workspace.id);
  }

  /**
   * Get comprehensive user permission summary
   */
  @Query(() => UserPermissionSummaryOutput, {
    name: 'rbacUserPermissionSummary',
    description: 'Get comprehensive permission summary for a user',
  })
  async getUserPermissionSummary(
    @Args('workspaceMemberId', { nullable: true })
    targetWorkspaceMemberId: string | undefined,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<UserPermissionSummaryOutput> {
    const targetId = targetWorkspaceMemberId ?? workspaceMemberId;

    // Get assigned templates
    const userTemplates =
      await this.userTemplateRepository.findByWorkspaceMemberId(
        targetId,
        workspace.id,
      );

    const assignedTemplates: AssignedTemplateOutput[] = userTemplates.map(
      (ut) => ({
        templateId: ut.templateId,
        templateName: ut.template?.templateName ?? 'Unknown',
        assignedAt: DateTimeUtils.toISO(
          DateTimeUtils.parse(ut.assignedAt ?? ut.createdAt),
        ),
        expiresAt: ut.expiresAt
          ? DateTimeUtils.toISO(DateTimeUtils.parse(ut.expiresAt))
          : undefined,
      }),
    );

    // Get active temporary permissions
    const tempPermissions =
      await this.temporaryPermissionRepository.findActiveByGranteeId(
        targetId,
        undefined,
        workspace.id,
      );

    const temporaryPermissions: ActiveTemporaryPermissionOutput[] =
      tempPermissions.map((tp) => ({
        id: tp.id,
        action: this.buildActionString(tp.canRead, tp.canUpdate, tp.canDelete),
        resourceType: tp.objectName,
        resourceId: tp.recordId ?? undefined,
        expiresAt: DateTimeUtils.toISO(DateTimeUtils.parse(tp.expiresAt)),
      }));

    return {
      userId: targetId,
      assignedTemplates,
      temporaryPermissions,
      totalTemplates: assignedTemplates.length,
      totalTemporaryPermissions: temporaryPermissions.length,
    };
  }

  /**
   * Check if user has specific role
   */
  @Query(() => Boolean, {
    name: 'rbacHasRole',
    description: 'Check if user has a specific role',
  })
  async hasRole(
    @Args('roleName') roleName: string,
    @Args('workspaceMemberId', { nullable: true })
    targetWorkspaceMemberId: string | undefined,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<boolean> {
    const targetId = targetWorkspaceMemberId ?? workspaceMemberId;

    return this.enforcerService.hasRole(targetId, workspace.id, roleName);
  }

  /**
   * Reload policies for current workspace (admin only)
   */
  @Mutation(() => Boolean, {
    name: 'rbacReloadPolicies',
    description: 'Reload policies for current workspace (admin operation)',
  })
  async reloadPolicies(
    @AuthWorkspace() workspace: Workspace,
  ): Promise<boolean> {
    await this.enforcerService.reloadPolicies(workspace.id);

    this.logger.log(`Policies reloaded for workspace: ${workspace.id}`);

    return true;
  }

  /**
   * Invalidate permission cache for current workspace
   */
  @Mutation(() => Boolean, {
    name: 'rbacInvalidateCache',
    description: 'Invalidate permission cache for current workspace',
  })
  async invalidateCache(
    @AuthWorkspace() workspace: Workspace,
  ): Promise<boolean> {
    await this.enforcerService.invalidateCache(workspace.id);

    this.logger.log(`Cache invalidated for workspace: ${workspace.id}`);

    return true;
  }

  // ==================== Private Methods ====================

  /**
   * Build action string from permission flags
   */
  private buildActionString(
    canRead: boolean,
    canUpdate: boolean,
    canDelete: boolean,
  ): string {
    const actions: string[] = [];

    if (canRead) {
      actions.push('read');
    }
    if (canUpdate) {
      actions.push('update');
    }
    if (canDelete) {
      actions.push('delete');
    }

    return actions.length > 0 ? actions.join(',') : 'none';
  }
}
