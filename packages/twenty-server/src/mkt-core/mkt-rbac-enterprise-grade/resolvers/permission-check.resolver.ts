import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { RbacEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-enforcer.service';
import { RbacCacheService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache.service';
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
 * Uses template-based RBAC (CasbinEnforcerService removed).
 *
 * Queries:
 * - rbacCheckPermission: Check single permission
 * - rbacCheckPermissionBatch: Check multiple permissions
 * - rbacUserPermissions: Get user's effective permissions
 * - rbacUserRoles: Get user's assigned template keys (roles)
 * - rbacUserPermissionSummary: Get comprehensive user permission summary
 */
@Resolver()
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class PermissionCheckResolver {
  private readonly logger = new Logger(PermissionCheckResolver.name);

  constructor(
    private readonly rbacEnforcerService: RbacEnforcerService,
    private readonly rbacCacheService: RbacCacheService,
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

    const targetUserId = input.userId ?? workspaceMemberId;

    const result = await this.rbacEnforcerService.checkPermission(
      targetUserId,
      workspace.id,
      input.resourceType,
      input.action,
    );

    const executionTimeMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    return {
      granted: result.allowed,
      source: 'TEMPLATE',
      reason: result.reason,
      executionTimeMs,
      fromCache: result.cached,
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
    }));

    const batchResults = await this.rbacEnforcerService.checkPermissions(
      workspaceMemberId,
      workspace.id,
      checks,
    );

    const results: PermissionResultOutput[] = batchResults.map((r, index) => ({
      granted: r.allowed,
      source: 'TEMPLATE',
      reason: r.reason,
      metadata: { key: `${checks[index].resource}:${checks[index].action}` },
    }));

    const totalTimeMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    return { results, totalTimeMs };
  }

  /**
   * Get user's assigned template keys (replaces Casbin roles)
   */
  @Query(() => [String], {
    name: 'rbacUserRoles',
    description: 'Get all permission template keys assigned to the user',
  })
  async getUserRoles(
    @Args('workspaceMemberId', { type: () => String, nullable: true })
    targetWorkspaceMemberId: string | undefined,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<string[]> {
    const targetId = targetWorkspaceMemberId ?? workspaceMemberId;

    const summary = await this.rbacEnforcerService.getUserPermissionSummary(
      targetId,
      workspace.id,
    );

    return summary?.roles ?? [];
  }

  /**
   * Get user's effective permissions as string arrays
   */
  @Query(() => [[String]], {
    name: 'rbacUserPermissions',
    description: 'Get all effective permissions for the user',
  })
  async getUserPermissions(
    @Args('workspaceMemberId', { type: () => String, nullable: true })
    targetWorkspaceMemberId: string | undefined,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<string[][]> {
    const targetId = targetWorkspaceMemberId ?? workspaceMemberId;

    const summary = await this.rbacEnforcerService.getUserPermissionSummary(
      targetId,
      workspace.id,
    );

    if (!summary) {
      return [];
    }

    // Convert resources to [[resource, action, 'allow'], ...] format
    const permissions: string[][] = [];

    for (const resource of summary.resources) {
      for (const action of resource.allowedActions) {
        permissions.push([resource.resourceKey, action, 'allow']);
      }
      for (const action of resource.deniedActions) {
        permissions.push([resource.resourceKey, action, 'deny']);
      }
    }

    return permissions;
  }

  /**
   * Get comprehensive user permission summary
   */
  @Query(() => UserPermissionSummaryOutput, {
    name: 'rbacUserPermissionSummary',
    description: 'Get comprehensive permission summary for a user',
  })
  async getUserPermissionSummary(
    @Args('workspaceMemberId', { type: () => String, nullable: true })
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
        workspace.id,
        targetId,
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
   * Check if user has specific role (template key)
   */
  @Query(() => Boolean, {
    name: 'rbacHasRole',
    description: 'Check if user has a specific permission template key',
  })
  async hasRole(
    @Args('roleName') roleName: string,
    @Args('workspaceMemberId', { type: () => String, nullable: true })
    targetWorkspaceMemberId: string | undefined,
    @AuthWorkspace() workspace: Workspace,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<boolean> {
    const targetId = targetWorkspaceMemberId ?? workspaceMemberId;

    const summary = await this.rbacEnforcerService.getUserPermissionSummary(
      targetId,
      workspace.id,
    );

    return summary?.roles.includes(roleName) ?? false;
  }

  /**
   * Invalidate RBAC context cache for current workspace
   */
  @Mutation(() => Boolean, {
    name: 'rbacReloadPolicies',
    description: 'Invalidate RBAC context cache for current workspace',
  })
  async reloadPolicies(
    @AuthWorkspace() workspace: Workspace,
  ): Promise<boolean> {
    await this.rbacCacheService.invalidateWorkspace(workspace.id);

    this.logger.log(`RBAC cache invalidated for workspace: ${workspace.id}`);

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
    await this.rbacCacheService.invalidateWorkspace(workspace.id);

    this.logger.log(`Cache invalidated for workspace: ${workspace.id}`);

    return true;
  }

  // ==================== Private Methods ====================

  private buildActionString(
    canRead: boolean,
    canUpdate: boolean,
    canDelete: boolean,
  ): string {
    const actions: string[] = [];

    if (canRead) actions.push('read');
    if (canUpdate) actions.push('update');
    if (canDelete) actions.push('delete');

    return actions.length > 0 ? actions.join(',') : 'none';
  }
}
