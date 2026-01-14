/**
 * RbacEnforcerService - Permission check service with data filter support
 *
 * Integrates Casbin enforcer with user context and data access policies
 * to provide comprehensive permission checking and data filtering.
 */

import { Injectable, Logger } from '@nestjs/common';

import { DATA_ACCESS_SCOPE } from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { MktDataAccessPolicyRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

import { RbacContextService, UserContext } from './rbac-context.service';

// ============================================
// TYPES
// ============================================

/**
 * Filter operator for data filtering
 */
export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'IN'
  | 'NOT_IN'
  | 'LIKE'
  | 'IS_NULL'
  | 'IS_NOT_NULL'
  | 'ALL';

/**
 * Single filter condition
 */
export type FilterConditionItem = {
  field: string;
  operator: FilterOperator;
  value: unknown;
  description?: string;
};

/**
 * Filter condition (AND/OR)
 */
export type FilterCondition = {
  type: 'AND' | 'OR';
  conditions: FilterConditionItem[];
};

/**
 * Applied policy info
 */
export type AppliedPolicy = {
  policyId: string;
  policyName: string;
  policyType: string;
  effect: 'allow' | 'deny';
};

/**
 * Permission check result
 */
export type CheckPermissionResult = {
  allowed: boolean;
  reason: string;
  latencyMs: number;
  cached: boolean;
  appliedPolicies: AppliedPolicy[];
  dataFilter: FilterCondition | null;
};

/**
 * Resource permission summary
 */
export type ResourcePermission = {
  resourceKey: string;
  resourceName: string;
  allowedActions: string[];
  deniedActions: string[];
  hasDataFilter: boolean;
};

/**
 * Active policy info
 */
export type ActivePolicy = {
  policyId: string;
  policyName: string;
  objectName: string;
  policyType: string;
};

/**
 * User permission summary
 */
export type PermissionSummary = {
  userId: string;
  workspaceMemberId: string;
  departmentId: string | null;
  departmentName: string | null;
  hierarchyLevel: number;
  levelCode: string;
  roles: string[];
  permissionCount: number;
  resources: ResourcePermission[];
  activePolicies: ActivePolicy[];
};

// ============================================
// SERVICE
// ============================================

@Injectable()
export class RbacEnforcerService {
  private readonly logger = new Logger(RbacEnforcerService.name);

  constructor(
    private readonly casbinEnforcerService: CasbinEnforcerService,
    private readonly rbacContextService: RbacContextService,
    private readonly dataAccessPolicyRepository: MktDataAccessPolicyRepository,
  ) {}

  /**
   * Check permission for user on resource/action
   */
  async checkPermission(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<CheckPermissionResult> {
    const startTime = DateTimeUtils.now();
    const appliedPolicies: AppliedPolicy[] = [];

    try {
      // Get user context
      const userContext = await this.rbacContextService.resolveContext(
        userId,
        workspaceId,
      );

      if (!userContext) {
        return {
          allowed: false,
          reason: 'User context not found',
          latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
          cached: false,
          appliedPolicies: [],
          dataFilter: null,
        };
      }

      // Check permission via Casbin
      const casbinResult = await this.casbinEnforcerService.checkPermission({
        userId,
        workspaceId,
        resource,
        action,
        attributes: this.buildAttributes(userContext),
      });

      // Get data filter if allowed
      let dataFilter: FilterCondition | null = null;

      if (casbinResult.allowed) {
        dataFilter = await this.buildDataFilter(
          workspaceId,
          userContext,
          resource,
        );

        // Track applied policies
        const policies = await this.getAppliedPolicies(
          workspaceId,
          userContext,
          resource,
        );

        for (const policy of policies) {
          appliedPolicies.push({
            policyId: policy.id,
            policyName: policy.name,
            policyType: policy.policyType,
            effect: 'allow',
          });
        }
      }

      return {
        allowed: casbinResult.allowed,
        reason: casbinResult.reason ?? '',
        latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
        cached: casbinResult.cached ?? false,
        appliedPolicies,
        dataFilter,
      };
    } catch (error) {
      this.logger.error(`Permission check failed: ${error}`);

      return {
        allowed: false,
        reason: `Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
        cached: false,
        appliedPolicies: [],
        dataFilter: null,
      };
    }
  }

  /**
   * Batch permission check
   */
  async checkPermissions(
    userId: string,
    workspaceId: string,
    checks: Array<{ resource: string; action: string }>,
  ): Promise<CheckPermissionResult[]> {
    const results: CheckPermissionResult[] = [];

    // Run checks in parallel
    const promises = checks.map((check) =>
      this.checkPermission(userId, workspaceId, check.resource, check.action),
    );

    const settledResults = await Promise.allSettled(promises);

    for (const result of settledResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          allowed: false,
          reason: `Check failed: ${result.reason}`,
          latencyMs: 0,
          cached: false,
          appliedPolicies: [],
          dataFilter: null,
        });
      }
    }

    return results;
  }

  /**
   * Get user permission summary
   */
  async getUserPermissionSummary(
    userId: string,
    workspaceId: string,
  ): Promise<PermissionSummary | null> {
    const userContext = await this.rbacContextService.resolveContext(
      userId,
      workspaceId,
    );

    if (!userContext) {
      return null;
    }

    // Get roles
    const roles = await this.casbinEnforcerService.getUserRoles(
      userId,
      workspaceId,
    );

    // Get permissions
    const permissions = await this.casbinEnforcerService.getUserPermissions(
      userId,
      workspaceId,
    );

    // Group by resource
    const resourceMap = new Map<
      string,
      { allowed: string[]; denied: string[] }
    >();

    for (const perm of permissions) {
      // Permission format: [subject, object, action, effect?, condition?]
      const resource = perm[1];
      const action = perm[2];
      const effect = perm[3] === 'deny' ? 'deny' : 'allow';

      if (!resourceMap.has(resource)) {
        resourceMap.set(resource, { allowed: [], denied: [] });
      }

      const resourceData = resourceMap.get(resource);

      if (resourceData) {
        if (effect === 'allow') {
          resourceData.allowed.push(action);
        } else {
          resourceData.denied.push(action);
        }
      }
    }

    // Build resource permissions
    const resources: ResourcePermission[] = [];

    for (const [resourceKey, data] of resourceMap.entries()) {
      const hasFilter = await this.hasDataFilter(userContext);

      resources.push({
        resourceKey,
        resourceName: resourceKey, // Could be enhanced with a lookup
        allowedActions: [...new Set(data.allowed)],
        deniedActions: [...new Set(data.denied)],
        hasDataFilter: hasFilter,
      });
    }

    // Get active policies
    const activePolicies = await this.getActivePoliciesForUser(
      workspaceId,
      userContext,
    );

    return {
      userId,
      workspaceMemberId: userContext.workspaceMemberId,
      departmentId: userContext.departmentId,
      departmentName: userContext.departmentName,
      hierarchyLevel: userContext.hierarchyLevel,
      levelCode: userContext.levelCode,
      roles,
      permissionCount: permissions.length,
      resources,
      activePolicies: activePolicies.map((p) => ({
        policyId: p.id,
        policyName: p.name,
        objectName: p.objectName,
        policyType: p.policyType,
      })),
    };
  }

  /**
   * Get data filter for resource
   */
  async getDataFilter(
    userId: string,
    workspaceId: string,
    resource: string,
  ): Promise<FilterCondition | null> {
    const userContext = await this.rbacContextService.resolveContext(
      userId,
      workspaceId,
    );

    if (!userContext) {
      return null;
    }

    return this.buildDataFilter(workspaceId, userContext, resource);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Build attributes for Casbin from user context
   */
  private buildAttributes(userContext: UserContext): Record<string, unknown> {
    return {
      hierarchyLevel: userContext.hierarchyLevel,
      departmentId: userContext.departmentId,
      departmentType: userContext.departmentType,
      organizationLevelId: userContext.organizationLevelId,
      isManager: userContext.isManager,
      isSubManager: userContext.isSubManager,
      hasFullAccess: userContext.hasFullAccess,
      canManageTeam: userContext.canManageTeam,
      canViewSubordinates: userContext.canViewSubordinates,
      dataAccessScope: userContext.dataAccessScope,
      currentTime: DateTimeUtils.toISO(DateTimeUtils.now()),
    };
  }

  /**
   * Build data filter based on user context and policies
   */
  private async buildDataFilter(
    workspaceId: string,
    userContext: UserContext,
    resource: string,
  ): Promise<FilterCondition | null> {
    // Users with full access (level 1-3) have no filter
    if (userContext.hasFullAccess) {
      return null;
    }

    // Get applicable policies
    const policies = await this.getAppliedPolicies(
      workspaceId,
      userContext,
      resource,
    );

    // Build filter from policies and user context
    const conditions: FilterConditionItem[] = [];

    // Add scope-based conditions
    switch (userContext.dataAccessScope) {
      case DATA_ACCESS_SCOPE.ALL_DEPARTMENTS:
        // No filter needed
        return null;

      case DATA_ACCESS_SCOPE.OWN_AND_CHILD_DEPARTMENTS:
        if (userContext.departmentId) {
          const deptIds = [
            userContext.departmentId,
            ...userContext.departmentDescendantIds,
          ];

          conditions.push({
            field: 'departmentId',
            operator: 'IN',
            value: deptIds,
            description: 'Own department and descendants',
          });
        }
        break;

      case DATA_ACCESS_SCOPE.OWN_DEPARTMENT_AND_TEAM:
        // Team members in same department
        if (userContext.departmentId) {
          conditions.push({
            field: 'departmentId',
            operator: '=',
            value: userContext.departmentId,
            description: 'Own department',
          });
        }

        // Or created by team members
        if (userContext.teamMemberIds.length > 0) {
          conditions.push({
            field: 'createdByWorkspaceMemberId',
            operator: 'IN',
            value: userContext.teamMemberIds,
            description: 'Created by team members',
          });
        }
        break;

      case DATA_ACCESS_SCOPE.OWN_RECORDS:
      default:
        // Own records only
        conditions.push({
          field: 'createdByWorkspaceMemberId',
          operator: '=',
          value: userContext.workspaceMemberId,
          description: 'Own records',
        });

        // Or assigned to user
        conditions.push({
          field: 'accountOwnerId',
          operator: '=',
          value: userContext.workspaceMemberId,
          description: 'Assigned to user',
        });

        // Or supporting members' records
        if (userContext.supportingMemberIds.length > 0) {
          conditions.push({
            field: 'createdByWorkspaceMemberId',
            operator: 'IN',
            value: userContext.supportingMemberIds,
            description: 'Supporting members records',
          });
        }
        break;
    }

    // Add policy-specific conditions
    for (const policy of policies) {
      if (policy.filterConditions) {
        const policyConditions = this.parseFilterConditions(
          policy.filterConditions as Record<string, unknown>,
          userContext,
        );

        conditions.push(...policyConditions);
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    return {
      type: 'OR',
      conditions,
    };
  }

  /**
   * Parse filter conditions from policy JSON
   */
  private parseFilterConditions(
    filterConditions: string | Record<string, unknown>,
    userContext: UserContext,
  ): FilterConditionItem[] {
    const conditions: FilterConditionItem[] = [];

    try {
      const parsed =
        typeof filterConditions === 'string'
          ? JSON.parse(filterConditions)
          : filterConditions;

      if (parsed.conditions && Array.isArray(parsed.conditions)) {
        for (const cond of parsed.conditions) {
          const value = this.resolvePlaceholder(cond.value, userContext);

          conditions.push({
            field: cond.field,
            operator: cond.operator,
            value,
            description: cond.description,
          });
        }
      }
    } catch {
      this.logger.warn('Failed to parse filter conditions');
    }

    return conditions;
  }

  /**
   * Resolve placeholder values in filter conditions
   */
  private resolvePlaceholder(
    value: unknown,
    userContext: UserContext,
  ): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    // Map placeholders to user context values
    const placeholderMap: Record<string, unknown> = {
      '${user.id}': userContext.userId,
      '${user.workspaceMemberId}': userContext.workspaceMemberId,
      '${user.departmentId}': userContext.departmentId,
      '${user.teamMemberIds}': userContext.teamMemberIds,
      '${user.subordinateMemberIds}': userContext.subordinateMemberIds,
      '${user.supportingMemberIds}': userContext.supportingMemberIds,
      '${user.hierarchyLevel}': userContext.hierarchyLevel,
      '${user.departmentAncestorIds}': userContext.departmentAncestorIds,
      '${user.departmentDescendantIds}': userContext.departmentDescendantIds,
    };

    return placeholderMap[value] ?? value;
  }

  /**
   * Get applied policies for resource
   */
  private async getAppliedPolicies(
    workspaceId: string,
    userContext: UserContext,
    resource: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    return this.dataAccessPolicyRepository.findForMemberAndObject(
      workspaceId,
      userContext.workspaceMemberId,
      resource,
      userContext.departmentId ?? undefined,
      userContext.organizationLevelId ?? undefined,
    );
  }

  /**
   * Check if user has data filter for resource
   */
  private async hasDataFilter(userContext: UserContext): Promise<boolean> {
    // Users with full access have no filter
    if (userContext.hasFullAccess) {
      return false;
    }

    // Level 4-11 have filters based on scope
    return userContext.dataAccessScope !== DATA_ACCESS_SCOPE.ALL_DEPARTMENTS;
  }

  /**
   * Get all active policies for user
   */
  private async getActivePoliciesForUser(
    workspaceId: string,
    userContext: UserContext,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const policies: MktDataAccessPolicyWorkspaceEntity[] = [];

    // Get department-specific policies
    if (userContext.departmentId) {
      const deptPolicies =
        await this.dataAccessPolicyRepository.findByDepartmentId(
          workspaceId,
          userContext.departmentId,
        );

      policies.push(...deptPolicies);
    }

    // Get organization level policies
    if (userContext.organizationLevelId) {
      const levelPolicies =
        await this.dataAccessPolicyRepository.findByOrganizationLevelId(
          workspaceId,
          userContext.organizationLevelId,
        );

      policies.push(...levelPolicies);
    }

    // Get member-specific policies
    const memberPolicies =
      await this.dataAccessPolicyRepository.findBySpecificMemberId(
        workspaceId,
        userContext.workspaceMemberId,
      );

    policies.push(...memberPolicies);

    // Deduplicate by ID
    const seen = new Set<string>();
    const uniquePolicies: MktDataAccessPolicyWorkspaceEntity[] = [];

    for (const policy of policies) {
      if (!seen.has(policy.id)) {
        seen.add(policy.id);
        uniquePolicies.push(policy);
      }
    }

    return uniquePolicies;
  }
}
