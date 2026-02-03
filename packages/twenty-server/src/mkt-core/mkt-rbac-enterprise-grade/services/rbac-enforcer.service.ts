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

import uniqBy from 'lodash.uniqby';

import { DATA_ACCESS_SCOPE } from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';
import { MKT_RBAC_CONFIG } from 'src/mkt-core/mkt-rbac-enterprise-grade/configs';
import { DEFAULT_OWNERSHIP_FIELD } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonParse } from 'src/mkt-core/utils/json.util';
import { CasbinEnforcerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/services/casbin-enforcer.service';
import { MktDataAccessPolicyRepository } from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  TemplateFilterExpression,
  ResolvedFilterConditions,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/filter-expression.types';
import { RBACUserContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/rbac-context.types';
import {
  RbacFilterOperator,
  RbacFilterConditionItem,
  RbacFilterCondition,
  RbacAppliedPolicy,
  RbacCheckPermissionResult,
  RbacResourcePermission,
  RbacActivePolicy,
  RbacPermissionSummary,
  RbacResourcePermissionData,
  RbacPermissionEntry,
  RBAC_FILTER_OPERATOR_MAP,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

import { RbacContextService, UserContext } from './rbac-context.service';
import { FilterExpressionResolverService } from './filter-expression-resolver.service';

import { PermissionContextService } from './bases/permission-context.service';
import { DataAccessPolicyService } from './bases/data-access-policy.service';

// Re-export types for external consumers (with aliases for backward compatibility)
export type FilterCondition = RbacFilterCondition;
export type CheckPermissionResult = RbacCheckPermissionResult;
export type ResourcePermission = RbacResourcePermission;
export type ActivePolicy = RbacActivePolicy;
export type PermissionSummary = RbacPermissionSummary;
export type FilterOperator = RbacFilterOperator;
export type FilterConditionItem = RbacFilterConditionItem;
export type AppliedPolicy = RbacAppliedPolicy;

@Injectable()
export class RbacEnforcerService {
  private readonly logger = new Logger(RbacEnforcerService.name);

  // ============================================
  // STATIC CONSTANTS
  // ============================================

  /**
   * Permission entry indices
   * Format: [subject, object, action, effect?, condition?]
   */
  private static readonly PERM_INDEX = {
    RESOURCE: 1,
    ACTION: 2,
    EFFECT: 3,
  } as const;

  // ============================================
  // STATIC HELPER METHODS
  // ============================================

  /**
   * Tạo kết quả check permission thất bại
   */
  private static createFailedResult(
    reason: string,
    startTime: ReturnType<typeof DateTimeUtils.now>,
  ): CheckPermissionResult {
    return {
      allowed: false,
      reason,
      latencyMs: DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now()),
      cached: false,
      appliedPolicies: [],
      dataFilter: null,
    };
  }

  /**
   * Tính latency từ startTime đến hiện tại
   */
  private static calculateLatency(
    startTime: ReturnType<typeof DateTimeUtils.now>,
  ): number {
    return DateTimeUtils.diffInMillis(startTime, DateTimeUtils.now());
  }

  /**
   * Parse permission entry để extract resource, action, effect
   */
  private static parsePermissionEntry(perm: RbacPermissionEntry): {
    resource: string;
    action: string;
    effect: 'allow' | 'deny';
  } {
    return {
      resource: perm[RbacEnforcerService.PERM_INDEX.RESOURCE],
      action: perm[RbacEnforcerService.PERM_INDEX.ACTION],
      effect:
        perm[RbacEnforcerService.PERM_INDEX.EFFECT] === 'deny'
          ? 'deny'
          : 'allow',
    };
  }

  /**
   * Lấy hoặc khởi tạo resource data trong map
   */
  private static getOrInitResourceData(
    resourceMap: Map<string, RbacResourcePermissionData>,
    resource: string,
  ): RbacResourcePermissionData {
    const existing = resourceMap.get(resource);

    if (existing) {
      return existing;
    }

    const newData: RbacResourcePermissionData = { allowed: [], denied: [] };

    resourceMap.set(resource, newData);

    return newData;
  }

  /**
   * Thêm action vào resource data theo effect
   */
  private static addActionToResourceData(
    resourceData: RbacResourcePermissionData,
    action: string,
    effect: 'allow' | 'deny',
  ): void {
    const targetList =
      effect === 'allow' ? resourceData.allowed : resourceData.denied;

    targetList.push(action);
  }

  /**
   * Group permissions by resource và phân loại allow/deny
   */
  private static groupPermissionsByResource(
    permissions: RbacPermissionEntry[],
  ): Map<string, RbacResourcePermissionData> {
    const resourceMap = new Map<string, RbacResourcePermissionData>();

    for (const perm of permissions) {
      const { resource, action, effect } =
        RbacEnforcerService.parsePermissionEntry(perm);
      const resourceData = RbacEnforcerService.getOrInitResourceData(
        resourceMap,
        resource,
      );

      RbacEnforcerService.addActionToResourceData(resourceData, action, effect);
    }

    return resourceMap;
  }

  /**
   * Map filter expression operator sang FilterOperator
   */
  private static mapOperator(op: string): RbacFilterOperator {
    return RBAC_FILTER_OPERATOR_MAP[op] ?? '=';
  }

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
   * Kiểm tra quyền truy cập của user đối với resource và action cụ thể
   */
  async checkPermission(
    userId: string,
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<CheckPermissionResult> {
    const startTime = DateTimeUtils.now();

    try {
      // Lấy user context
      const userContext = await this.rbacContextService.resolveContext(
        userId,
        workspaceId,
      );

      // Trả về kết quả thất bại nếu không tìm thấy user context
      if (!userContext) {
        return RbacEnforcerService.createFailedResult(
          'User context not found',
          startTime,
        );
      }

      // Kiểm tra quyền qua Casbin
      const casbinResult = await this.casbinEnforcerService.checkPermission({
        userId,
        workspaceId,
        resource,
        action,
        attributes: this.buildAttributes(userContext),
      });

      // Nếu không được phép, trả về kết quả ngay
      if (!casbinResult.allowed) {
        return {
          allowed: false,
          reason: casbinResult.reason ?? '',
          latencyMs: RbacEnforcerService.calculateLatency(startTime),
          cached: casbinResult.cached ?? false,
          appliedPolicies: [],
          dataFilter: null,
        };
      }

      // Lấy data filter và applied policies cho request được phép
      const [dataFilter, appliedPolicies] = await Promise.all([
        this.buildDataFilter(workspaceId, userContext, resource),
        this.getAppliedPoliciesInfo(workspaceId, userContext, resource),
      ]);

      return {
        allowed: true,
        reason: casbinResult.reason ?? '',
        latencyMs: RbacEnforcerService.calculateLatency(startTime),
        cached: casbinResult.cached ?? false,
        appliedPolicies,
        dataFilter,
      };
    } catch (error) {
      this.logger.error(`Permission check failed: ${error}`);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return RbacEnforcerService.createFailedResult(
        `Permission check failed: ${errorMessage}`,
        startTime,
      );
    }
  }

  /**
   * Lấy thông tin applied policies dưới dạng AppliedPolicy[]
   */
  private async getAppliedPoliciesInfo(
    workspaceId: string,
    userContext: UserContext,
    resource: string,
  ): Promise<AppliedPolicy[]> {
    const policies = await this.getAppliedPolicies(
      workspaceId,
      userContext,
      resource,
    );

    return policies.map((policy) => ({
      policyId: policy.id,
      policyName: policy.name,
      policyType: policy.policyType,
      effect: 'allow' as const,
    }));
  }

  /**
   * Batch permission check - Kiểm tra nhiều quyền cùng lúc
   * Chạy song song để tối ưu hiệu năng
   */
  async checkPermissions(
    userId: string,
    workspaceId: string,
    checks: Array<{ resource: string; action: string }>,
  ): Promise<CheckPermissionResult[]> {
    // Chạy tất cả checks song song
    const promises = checks.map((check) =>
      this.checkPermission(userId, workspaceId, check.resource, check.action),
    );

    const settledResults = await Promise.allSettled(promises);

    // Map kết quả, xử lý cả fulfilled và rejected
    return settledResults.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : this.createRejectedCheckResult(result.reason),
    );
  }

  /**
   * Tạo kết quả check permission cho rejected promise
   */
  private createRejectedCheckResult(reason: unknown): CheckPermissionResult {
    return {
      allowed: false,
      reason: `Check failed: ${reason}`,
      latencyMs: 0,
      cached: false,
      appliedPolicies: [],
      dataFilter: null,
    };
  }

  /**
   * Get user permission summary
   * Lấy tổng hợp quyền của user trong workspace
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

    // Lấy roles và permissions song song
    const [roles, permissions, activePolicies] = await Promise.all([
      this.casbinEnforcerService.getUserRoles(userId, workspaceId),
      this.casbinEnforcerService.getUserPermissions(userId, workspaceId),
      this.getActivePoliciesForUser(workspaceId, userContext),
    ]);

    // Group permissions by resource
    const resourceMap =
      RbacEnforcerService.groupPermissionsByResource(permissions);

    // Build resource permissions với hasFilter check
    const hasFilter = await this.hasDataFilter(userContext);
    const resources = this.buildResourcePermissions(resourceMap, hasFilter);

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
      activePolicies: this.mapPoliciesToActivePolicy(activePolicies),
    };
  }

  /**
   * Build resource permissions từ grouped data
   */
  private buildResourcePermissions(
    resourceMap: Map<string, RbacResourcePermissionData>,
    hasFilter: boolean,
  ): ResourcePermission[] {
    const resources: ResourcePermission[] = [];

    for (const [resourceKey, data] of resourceMap.entries()) {
      resources.push({
        resourceKey,
        resourceName: resourceKey,
        allowedActions: [...new Set(data.allowed)],
        deniedActions: [...new Set(data.denied)],
        hasDataFilter: hasFilter,
      });
    }

    return resources;
  }

  /**
   * Map policies sang ActivePolicy format
   */
  private mapPoliciesToActivePolicy(
    policies: MktDataAccessPolicyWorkspaceEntity[],
  ): ActivePolicy[] {
    return policies.map((p) => ({
      policyId: p.id,
      policyName: p.name,
      objectName: p.objectName,
      policyType: p.policyType,
    }));
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
    const filterConditions = policy.filterConditions as Record<string, unknown>;

    // Early return nếu không có filter conditions
    if (!filterConditions || Object.keys(filterConditions).length === 0) {
      return null;
    }

    const conditions: FilterConditionItem[] = [
      ...this.extractOwnershipConditions(filterConditions),
      ...this.extractStatusConditions(filterConditions),
      ...this.extractExplicitConditions(filterConditions),
    ];

    return conditions.length > 0 ? { type: 'AND', conditions } : null;
  }

  /**
   * Extract ownership filter conditions từ policy
   */
  private extractOwnershipConditions(
    filterConditions: Record<string, unknown>,
  ): FilterConditionItem[] {
    const ownership = filterConditions.ownership as
      | Record<string, unknown>
      | undefined;

    if (!ownership?.enabled) {
      return [];
    }

    return [
      {
        field: (ownership.field as string) ?? DEFAULT_OWNERSHIP_FIELD,
        operator: '=',
        value: '${user.workspaceMemberId}',
        description: 'Ownership filter',
      },
    ];
  }

  /**
   * Extract status filter conditions từ policy
   */
  private extractStatusConditions(
    filterConditions: Record<string, unknown>,
  ): FilterConditionItem[] {
    const status = filterConditions.status as
      | Record<string, unknown>
      | undefined;

    if (!status) {
      return [];
    }

    const conditions: FilterConditionItem[] = [];

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

    return conditions;
  }

  /**
   * Extract explicit conditions array từ policy
   */
  private extractExplicitConditions(
    filterConditions: Record<string, unknown>,
  ): FilterConditionItem[] {
    const conditions = filterConditions.conditions;

    if (!conditions || !Array.isArray(conditions)) {
      return [];
    }

    return (conditions as Array<Record<string, unknown>>).map((cond) => ({
      field: cond.field as string,
      operator: cond.operator as FilterOperator,
      value: cond.value,
      description: cond.description as string | undefined,
    }));
  }

  /**
   * Convert resolved filter (from FilterExpressionResolver) to FilterCondition format
   */
  private convertResolvedFilterToCondition(
    resolvedFilter: ResolvedFilterConditions,
  ): FilterCondition {
    // Handle $or operator
    if (resolvedFilter.$or && Array.isArray(resolvedFilter.$or)) {
      return {
        type: 'OR',
        conditions: this.extractConditionsFromArray(resolvedFilter.$or),
      };
    }

    // Handle $and operator
    if (resolvedFilter.$and && Array.isArray(resolvedFilter.$and)) {
      return {
        type: 'AND',
        conditions: this.extractConditionsFromArray(resolvedFilter.$and),
      };
    }

    // Handle flat conditions
    return {
      type: 'AND',
      conditions: this.flattenFilterObject(resolvedFilter),
    };
  }

  /**
   * Extract conditions từ array (cho $or hoặc $and)
   * Chỉ xử lý objects, bỏ qua primitives
   */
  private extractConditionsFromArray(
    conditionArray: unknown[],
  ): FilterConditionItem[] {
    const conditions: FilterConditionItem[] = [];

    for (const condition of conditionArray) {
      if (!this.isValidFilterObject(condition)) {
        continue;
      }

      const subConditions = this.flattenFilterObject(
        condition as Record<string, unknown>,
      );

      conditions.push(...subConditions);
    }

    return conditions;
  }

  /**
   * Kiểm tra xem value có phải là filter object hợp lệ không
   */
  private isValidFilterObject(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Flatten filter object to array of FilterConditionItems
   * Chuyển đổi nested filter object thành flat array
   */
  private flattenFilterObject(
    obj: Record<string, unknown>,
  ): FilterConditionItem[] {
    const conditions: FilterConditionItem[] = [];

    for (const [field, value] of Object.entries(obj)) {
      // Skip special operators tại root level ($or, $and, etc.)
      if (field.startsWith('$')) {
        continue;
      }

      // Xử lý operator objects như { $in: [...] }
      if (this.isValidFilterObject(value)) {
        const operatorConditions = this.extractOperatorConditions(
          field,
          value as Record<string, unknown>,
        );

        conditions.push(...operatorConditions);
      } else {
        // Direct value = equality check
        conditions.push({ field, operator: '=', value });
      }
    }

    return conditions;
  }

  /**
   * Extract conditions từ operator object
   * VD: { field: { $in: [1,2,3], $ne: 0 } }
   */
  private extractOperatorConditions(
    field: string,
    operatorObj: Record<string, unknown>,
  ): FilterConditionItem[] {
    return Object.entries(operatorObj).map(([op, opValue]) => ({
      field,
      operator: RbacEnforcerService.mapOperator(op),
      value: opValue,
    }));
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
   * Hỗ trợ cả string (JSON) và object input
   */
  private parseFilterConditions(
    filterConditions: string | Record<string, unknown>,
    userContext: UserContext,
  ): FilterConditionItem[] {
    // Parse JSON string nếu cần
    const parsed = this.parseFilterConditionsInput(filterConditions);

    if (!parsed) {
      return [];
    }

    // Early return nếu không có conditions array
    if (!parsed.conditions || !Array.isArray(parsed.conditions)) {
      return [];
    }

    // Map conditions với placeholder resolution
    return parsed.conditions.map((cond) => ({
      field: cond.field,
      operator: cond.operator,
      value: this.resolvePlaceholder(cond.value, userContext),
      description: cond.description,
    }));
  }

  /**
   * Parse filter conditions input - xử lý cả string và object
   */
  private parseFilterConditionsInput(
    input: string | Record<string, unknown>,
  ): Record<string, unknown> | null {
    // Nếu đã là object, trả về ngay
    if (typeof input !== 'string') {
      return input;
    }

    // Parse JSON string với safe utility
    const parseResult = safeJsonParse<Record<string, unknown>>(input);

    if (!parseResult.success) {
      this.logger.warn('Failed to parse filter conditions');

      return null;
    }

    return parseResult.data ?? null;
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
   * Lấy tất cả policies áp dụng cho user (department, org level, member-specific)
   */
  private async getActivePoliciesForUser(
    workspaceId: string,
    userContext: UserContext,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    // Fetch policies từ nhiều nguồn song song
    const policyPromises = this.buildPolicyFetchPromises(
      workspaceId,
      userContext,
    );

    const policyResults = await Promise.all(policyPromises);

    // Gộp tất cả policies và loại bỏ duplicates bằng lodash
    const allPolicies = policyResults.flat();

    return uniqBy(allPolicies, 'id');
  }

  /**
   * Build array of policy fetch promises based on user context
   */
  private buildPolicyFetchPromises(
    workspaceId: string,
    userContext: UserContext,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]>[] {
    const promises: Promise<MktDataAccessPolicyWorkspaceEntity[]>[] = [];

    // Department-specific policies
    if (userContext.departmentId) {
      promises.push(
        this.dataAccessPolicyRepository.findByDepartmentId(
          workspaceId,
          userContext.departmentId,
        ),
      );
    }

    // Organization level policies
    if (userContext.organizationLevelId) {
      promises.push(
        this.dataAccessPolicyRepository.findByOrganizationLevelId(
          workspaceId,
          userContext.organizationLevelId,
        ),
      );
    }

    // Member-specific policies (luôn fetch)
    promises.push(
      this.dataAccessPolicyRepository.findBySpecificMemberId(
        workspaceId,
        userContext.workspaceMemberId,
      ),
    );

    return promises;
  }
}
