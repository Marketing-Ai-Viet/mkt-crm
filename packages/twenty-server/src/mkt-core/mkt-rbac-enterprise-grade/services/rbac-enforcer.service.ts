/**
 * RbacEnforcerService - Permission check service with data filter support
 *
 * Integrates Casbin enforcer with user context and data access policies
 * to provide comprehensive permission checking and data filtering.
 *
 * REFACTORED để support 2 flow:
 * 1. Legacy flow (RBAC_USE_PERMISSION_CONTEXT=false): Dùng hard-coded switch logic
 * 2. New flow (RBAC_USE_PERMISSION_CONTEXT=true): Dùng PermissionContext + FilterExpressionResolver
 *
 * @see /docs/RBAC-REFACTOR-PLAN.md
 */

import { Injectable, Logger } from '@nestjs/common';

import { DATA_ACCESS_SCOPE } from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';
import { MKT_RBAC_CONFIG } from 'src/mkt-core/mkt-rbac-enterprise-grade/configs';
import { DEFAULT_OWNERSHIP_FIELD } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { MktDataAccessPolicyRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  TemplateFilterExpression,
  ResolvedFilterConditions,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/filter-expression.types';
import { RBACUserContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/rbac-context.types';

import { RbacContextService, UserContext } from './rbac-context.service';
import { FilterExpressionResolverService } from './filter-expression-resolver.service';

import { PermissionContextService } from './bases/permission-context.service';
import { DataAccessPolicyService } from './bases/data-access-policy.service';

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
    // NEW: Services cho PermissionContext flow
    private readonly permissionContextService: PermissionContextService,
    private readonly filterExpressionResolver: FilterExpressionResolverService,
    private readonly dataAccessPolicyService: DataAccessPolicyService,
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
   *
   * Hỗ trợ 2 flow:
   * 1. New flow (RBAC_USE_PERMISSION_CONTEXT=true): Dùng PermissionContext
   * 2. Legacy flow: Dùng hard-coded switch logic
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

    // NEW FLOW: Use PermissionContext + FilterExpressionResolver
    if (MKT_RBAC_CONFIG.USE_PERMISSION_CONTEXT) {
      try {
        const result = await this.buildDataFilterNew(
          workspaceId,
          userContext,
          resource,
        );

        if (MKT_RBAC_CONFIG.DEBUG_FILTER_RESOLUTION) {
          this.logger.debug(
            `[NEW FLOW] Filter result for ${resource}: ${JSON.stringify(result)}`,
          );
        }

        return result;
      } catch (error) {
        this.logger.warn(
          `New RBAC flow failed, ${MKT_RBAC_CONFIG.FALLBACK_ON_ERROR ? 'falling back to legacy' : 'returning null'}: ${error}`,
        );

        if (MKT_RBAC_CONFIG.FALLBACK_ON_ERROR) {
          return this.buildDataFilterLegacy(workspaceId, userContext, resource);
        }

        return null;
      }
    }

    // LEGACY FLOW: Use hard-coded switch logic
    return this.buildDataFilterLegacy(workspaceId, userContext, resource);
  }

  /**
   * NEW FLOW: Build data filter using PermissionContext + FilterExpressionResolver
   *
   * Flow:
   * 1. Check DataAccessPolicy (override layer) trước
   * 2. Nếu không có override → dùng PermissionContext (template layer)
   * 3. Resolve template variables thành actual values
   */
  private async buildDataFilterNew(
    workspaceId: string,
    userContext: UserContext,
    resource: string,
  ): Promise<FilterCondition | null> {
    // ============================================
    // STEP 1: Check DataAccessPolicy (Override Layer)
    // ============================================
    const overridePolicies =
      await this.dataAccessPolicyService.getPoliciesForMember(
        workspaceId,
        userContext.workspaceMemberId,
        resource,
        userContext.departmentId ?? undefined,
        userContext.organizationLevelId ?? undefined,
      );

    // If override exists with higher priority, use it directly
    if (overridePolicies.length > 0) {
      // Sort by priority (highest first) - policies đã resolved, sẵn sàng apply
      const sortedPolicies = [...overridePolicies].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
      );
      const highestPriorityPolicy = sortedPolicies[0];

      this.logger.debug(
        `Using DataAccessPolicy override: ${highestPriorityPolicy.name}`,
      );

      // DataAccessPolicy.filterConditions đã là resolved values
      return this.convertPolicyToFilterCondition(highestPriorityPolicy);
    }

    // ============================================
    // STEP 2: Get PermissionContext (Template Layer)
    // ============================================
    const contextKey =
      this.permissionContextService.getContextKeyForDataAccessScope(
        userContext.dataAccessScope,
      );

    const permissionContext =
      await this.permissionContextService.getByContextKey(
        workspaceId,
        contextKey,
      );

    if (!permissionContext) {
      this.logger.warn(`Permission context not found: ${contextKey}`);

      // Fallback to OWN_RECORDS filter
      return this.buildOwnRecordsFilter(userContext);
    }

    // ============================================
    // STEP 3: Resolve Template Variables
    // ============================================
    // Cast UserContext to RBACUserContext (structurally identical)
    const rbacUserContext = userContext as RBACUserContext;

    const resolutionResult =
      this.filterExpressionResolver.resolveFilterExpression(
        permissionContext.filterExpression as TemplateFilterExpression,
        rbacUserContext,
      );

    if (MKT_RBAC_CONFIG.DEBUG_FILTER_RESOLUTION) {
      this.logger.debug(
        `Filter resolution for ${contextKey}: ${JSON.stringify(resolutionResult)}`,
      );
    }

    if (!resolutionResult.success) {
      this.logger.warn(
        `Filter resolution incomplete. Unresolved: ${resolutionResult.unresolvedVariables.join(', ')}`,
      );
    }

    // null resolvedFilter means ALL_RECORDS (no filter)
    if (resolutionResult.resolvedFilter === null) {
      return null;
    }

    // ============================================
    // STEP 4: Convert to FilterCondition format
    // ============================================
    return this.convertResolvedFilterToCondition(
      resolutionResult.resolvedFilter,
    );
  }

  /**
   * LEGACY FLOW: Build data filter using hard-coded switch logic
   */
  private async buildDataFilterLegacy(
    workspaceId: string,
    userContext: UserContext,
    resource: string,
  ): Promise<FilterCondition | null> {
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

      case DATA_ACCESS_SCOPE.OWN_AND_CHILD_DEPARTMENTS: {
        // Records created by user or subordinates in child departments
        const memberIds = [
          userContext.workspaceMemberId,
          ...userContext.subordinateMemberIds,
        ];

        conditions.push({
          field: DEFAULT_OWNERSHIP_FIELD,
          operator: 'IN',
          value: memberIds,
          description: 'Own records and subordinates records',
        });

        // Or records assigned to user or subordinates
        conditions.push({
          field: 'accountOwnerId',
          operator: 'IN',
          value: memberIds,
          description: 'Assigned to user or subordinates',
        });
        break;
      }

      case DATA_ACCESS_SCOPE.OWN_DEPARTMENT_AND_TEAM: {
        // Records created by user or team members in same department
        const teamIds = [
          userContext.workspaceMemberId,
          ...userContext.teamMemberIds,
        ];

        conditions.push({
          field: DEFAULT_OWNERSHIP_FIELD,
          operator: 'IN',
          value: teamIds,
          description: 'Own records and team members records',
        });

        // Or records assigned to user or team members
        conditions.push({
          field: 'accountOwnerId',
          operator: 'IN',
          value: teamIds,
          description: 'Assigned to user or team members',
        });
        break;
      }

      case DATA_ACCESS_SCOPE.OWN_RECORDS:
      default:
        // Own records only
        conditions.push({
          field: DEFAULT_OWNERSHIP_FIELD,
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
            field: DEFAULT_OWNERSHIP_FIELD,
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
   * Convert DataAccessPolicy to FilterCondition
   * (DataAccessPolicy chứa resolved values, không cần resolve template)
   */
  private convertPolicyToFilterCondition(
    policy: MktDataAccessPolicyWorkspaceEntity,
  ): FilterCondition | null {
    const conditions: FilterConditionItem[] = [];
    const filterConditions = policy.filterConditions as Record<string, unknown>;

    if (!filterConditions || Object.keys(filterConditions).length === 0) {
      return null; // Empty filter = no restriction
    }

    // Handle ownership filter
    const ownership = filterConditions.ownership as
      | Record<string, unknown>
      | undefined;

    if (ownership?.enabled) {
      conditions.push({
        field: (ownership.field as string) ?? DEFAULT_OWNERSHIP_FIELD,
        operator: '=',
        value: '${user.workspaceMemberId}', // Will be resolved later
        description: 'Ownership filter',
      });
    }

    // Handle status filter
    const status = filterConditions.status as
      | Record<string, unknown>
      | undefined;

    if (status) {
      if (status.allowedValues && Array.isArray(status.allowedValues)) {
        conditions.push({
          field: 'status',
          operator: 'IN',
          value: status.allowedValues,
          description: 'Allowed status values',
        });
      }

      if (status.deniedValues && Array.isArray(status.deniedValues)) {
        conditions.push({
          field: 'status',
          operator: 'NOT_IN',
          value: status.deniedValues,
          description: 'Denied status values',
        });
      }
    }

    // Handle explicit conditions array
    if (
      filterConditions.conditions &&
      Array.isArray(filterConditions.conditions)
    ) {
      for (const cond of filterConditions.conditions as Array<
        Record<string, unknown>
      >) {
        conditions.push({
          field: cond.field as string,
          operator: cond.operator as FilterOperator,
          value: cond.value,
          description: cond.description as string | undefined,
        });
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    return {
      type: 'AND',
      conditions,
    };
  }

  /**
   * Convert resolved filter (from FilterExpressionResolver) to FilterCondition format
   */
  private convertResolvedFilterToCondition(
    resolvedFilter: ResolvedFilterConditions,
  ): FilterCondition {
    const conditions: FilterConditionItem[] = [];

    // Handle $or operator
    if (resolvedFilter.$or && Array.isArray(resolvedFilter.$or)) {
      for (const orCondition of resolvedFilter.$or) {
        // Chỉ xử lý objects, bỏ qua primitives
        if (
          orCondition &&
          typeof orCondition === 'object' &&
          !Array.isArray(orCondition)
        ) {
          const subConditions = this.flattenFilterObject(
            orCondition as Record<string, unknown>,
          );

          conditions.push(...subConditions);
        }
      }

      return {
        type: 'OR',
        conditions,
      };
    }

    // Handle $and operator
    if (resolvedFilter.$and && Array.isArray(resolvedFilter.$and)) {
      for (const andCondition of resolvedFilter.$and) {
        // Chỉ xử lý objects, bỏ qua primitives
        if (
          andCondition &&
          typeof andCondition === 'object' &&
          !Array.isArray(andCondition)
        ) {
          const subConditions = this.flattenFilterObject(
            andCondition as Record<string, unknown>,
          );

          conditions.push(...subConditions);
        }
      }

      return {
        type: 'AND',
        conditions,
      };
    }

    // Handle flat conditions
    const flatConditions = this.flattenFilterObject(resolvedFilter);

    return {
      type: 'AND',
      conditions: flatConditions,
    };
  }

  /**
   * Flatten filter object to array of FilterConditionItems
   */
  private flattenFilterObject(
    obj: Record<string, unknown>,
  ): FilterConditionItem[] {
    const conditions: FilterConditionItem[] = [];

    for (const [field, value] of Object.entries(obj)) {
      // Skip special operators at root level
      if (field.startsWith('$')) {
        continue;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Handle operator objects like { $in: [...] }
        const operatorObj = value as Record<string, unknown>;

        for (const [op, opValue] of Object.entries(operatorObj)) {
          conditions.push({
            field,
            operator: this.mapOperator(op),
            value: opValue,
          });
        }
      } else {
        // Direct value = equality
        conditions.push({
          field,
          operator: '=',
          value,
        });
      }
    }

    return conditions;
  }

  /**
   * Map filter expression operator to FilterOperator
   */
  private mapOperator(op: string): FilterOperator {
    const operatorMap: Record<string, FilterOperator> = {
      $eq: '=',
      $ne: '!=',
      $gt: '>',
      $gte: '>=',
      $lt: '<',
      $lte: '<=',
      $in: 'IN',
      $nin: 'NOT_IN',
      $like: 'LIKE',
      $isNull: 'IS_NULL',
      $exists: 'IS_NOT_NULL',
    };

    return operatorMap[op] ?? '=';
  }

  /**
   * Fallback filter for OWN_RECORDS
   * Dùng khi không tìm thấy PermissionContext hoặc resolve failed
   */
  private buildOwnRecordsFilter(userContext: UserContext): FilterCondition {
    return {
      type: 'OR',
      conditions: [
        {
          field: DEFAULT_OWNERSHIP_FIELD,
          operator: '=',
          value: userContext.workspaceMemberId,
          description: 'Own records',
        },
        {
          field: 'accountOwnerId',
          operator: '=',
          value: userContext.workspaceMemberId,
          description: 'Assigned to user',
        },
      ],
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
