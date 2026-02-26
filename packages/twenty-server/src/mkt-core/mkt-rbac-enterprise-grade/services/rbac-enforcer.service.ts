/**
 * RbacEnforcerService - Permission check service with data filter support
 *
 * Uses template-based permission checks (replacing Casbin) + data access policies
 * to provide comprehensive permission checking and data filtering.
 *
 * Permission check flow:
 * 1. checkDataClassification() - bypass for PUBLIC/INTERNAL resources
 * 2. checkTemplatePermission() - template-based allow/deny via mktTemplateResourcePermission
 * 3. buildDataFilter() - row-level filter based on dataAccessScope
 *
 * Data filter flow:
 * 1. Legacy (RBAC_USE_PERMISSION_CONTEXT=false): hard-coded switch on dataAccessScope
 * 2. New (RBAC_USE_PERMISSION_CONTEXT=true): PermissionContext + FilterExpressionResolver
 *
 * @see /docs/rbac-refactor-plan.md
 */

import { Injectable, Logger } from '@nestjs/common';

import uniqBy from 'lodash.uniqby';

import { DATA_ACCESS_SCOPE } from 'src/mkt-core/seeder/constants/mkt-organization-level-data-seeds.constants';
import { MKT_RBAC_CONFIG } from 'src/mkt-core/mkt-rbac-enterprise-grade/configs';
import { DEFAULT_OWNERSHIP_FIELD } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/enterprise-rbac.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonParse } from 'src/mkt-core/utils/json.util';
import {
  MktDataAccessPolicyRepository,
  MktPermissionResourceRepository,
  MktTemplateResourcePermissionRepository,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/repositories';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import { DATA_CLASSIFICATION } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/permission-template/options.constants';
import { ClassificationCheckResult } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/data-classification.types';
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
  RBAC_FILTER_OPERATOR_MAP,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types';

import { RbacContextService, UserContext } from './rbac-context.service';
import { FilterExpressionResolverService } from './filter-expression-resolver.service';

import { PermissionContextService } from './bases/permission-context.service';
import { DataAccessPolicyService } from './bases/data-access-policy.service';

@Injectable()
export class RbacEnforcerService {
  private readonly logger = new Logger(RbacEnforcerService.name);

  // ============================================
  // STATIC HELPER METHODS
  // ============================================

  /**
   * Tạo kết quả check permission thất bại
   */
  private static createFailedResult(
    reason: string,
    startTime: ReturnType<typeof DateTimeUtils.now>,
  ): RbacCheckPermissionResult {
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
   * Map filter expression operator sang FilterOperator
   */
  private static mapOperator(op: string): RbacFilterOperator {
    return RBAC_FILTER_OPERATOR_MAP[op] ?? '=';
  }

  constructor(
    private readonly rbacContextService: RbacContextService,
    private readonly dataAccessPolicyRepository: MktDataAccessPolicyRepository,
    private readonly permissionResourceRepository: MktPermissionResourceRepository,
    private readonly templateResourcePermissionRepository: MktTemplateResourcePermissionRepository,
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
  ): Promise<RbacCheckPermissionResult> {
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

      // Kiểm tra Data Classification trước Casbin
      const classificationResult = await this.checkDataClassification(
        workspaceId,
        resource,
        action,
      );

      if (classificationResult.bypass) {
        const classificationFilter: RbacFilterCondition | null =
          classificationResult.dataFilter
            ? {
                type: classificationResult.dataFilter.type ?? 'AND',
                conditions: (classificationResult.dataFilter.conditions ??
                  []) as RbacFilterConditionItem[],
              }
            : null;

        return {
          allowed: classificationResult.allowed ?? false,
          reason: classificationResult.reason ?? '',
          latencyMs: RbacEnforcerService.calculateLatency(startTime),
          cached: false,
          appliedPolicies: [],
          dataFilter: classificationFilter,
        };
      }

      // Nếu TOP_SECRET yêu cầu minimum priority, kiểm tra trước khi vào Casbin
      if (classificationResult.minimumTemplatePriority) {
        const userHierarchyLevel = userContext.hierarchyLevel ?? 11;

        // hierarchyLevel thấp = priority cao (1=CEO, 2=VP)
        // minimumTemplatePriority 900 ~ hierarchyLevel <= 2
        if (userHierarchyLevel > 2) {
          return {
            allowed: false,
            reason: `Resource requires minimum template priority ${classificationResult.minimumTemplatePriority} (TOP_SECRET)`,
            latencyMs: RbacEnforcerService.calculateLatency(startTime),
            cached: false,
            appliedPolicies: [],
            dataFilter: null,
          };
        }
      }

      // Kiểm tra quyền qua template-based permission check (thay Casbin)
      const templateResult = await this.checkTemplatePermission(
        workspaceId,
        userContext,
        resource,
        action,
      );

      // Nếu không được phép, trả về kết quả ngay
      if (!templateResult.allowed) {
        return {
          allowed: false,
          reason: templateResult.reason,
          latencyMs: RbacEnforcerService.calculateLatency(startTime),
          cached: false,
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
        reason: templateResult.reason,
        latencyMs: RbacEnforcerService.calculateLatency(startTime),
        cached: false,
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
  ): Promise<RbacAppliedPolicy[]> {
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
  ): Promise<RbacCheckPermissionResult[]> {
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
  private createRejectedCheckResult(
    reason: unknown,
  ): RbacCheckPermissionResult {
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
  ): Promise<RbacPermissionSummary | null> {
    const userContext = await this.rbacContextService.resolveContext(
      userId,
      workspaceId,
    );

    if (!userContext) {
      return null;
    }

    // Lấy template permissions và active policies song song
    const [templateResourcePerms, activePolicies] = await Promise.all([
      this.getTemplateResourcePermissions(workspaceId, userContext),
      this.getActivePoliciesForUser(workspaceId, userContext),
    ]);

    // Build resource permissions từ template data
    const hasFilter = await this.hasDataFilter(userContext);
    const resources = this.buildResourcePermissionsFromTemplates(
      templateResourcePerms,
      hasFilter,
    );

    return {
      userId,
      workspaceMemberId: userContext.workspaceMemberId,
      departmentId: userContext.departmentId,
      departmentName: userContext.departmentName,
      hierarchyLevel: userContext.hierarchyLevel,
      levelCode: userContext.levelCode,
      roles: userContext.templateKeys,
      permissionCount: resources.reduce(
        (sum, r) => sum + r.allowedActions.length,
        0,
      ),
      resources,
      activePolicies: this.mapPoliciesToActivePolicy(activePolicies),
    };
  }

  /**
   * Map policies sang ActivePolicy format
   */
  private mapPoliciesToActivePolicy(
    policies: MktDataAccessPolicyWorkspaceEntity[],
  ): RbacActivePolicy[] {
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
  ): Promise<RbacFilterCondition | null> {
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
   * Kiểm tra Data Classification trước khi vào Casbin
   *
   * - PUBLIC + READ → bypass Casbin, cho phép ngay
   * - INTERNAL + READ → bypass Casbin, cho phép ngay
   * - CONFIDENTIAL → đi tiếp pipeline bình thường
   * - RESTRICTED → đi tiếp pipeline + bắt buộc audit log
   * - TOP_SECRET → đi tiếp pipeline + kiểm tra minimum priority
   */
  private async checkDataClassification(
    workspaceId: string,
    resource: string,
    action: string,
  ): Promise<ClassificationCheckResult> {
    try {
      const resourceEntity =
        await this.permissionResourceRepository.findByResourceKeyInWorkspace(
          workspaceId,
          resource,
        );

      if (!resourceEntity?.dataClassification) {
        return { bypass: false };
      }

      const classification = resourceEntity.dataClassification;

      // PUBLIC: cho phép READ cho tất cả user active
      if (classification === DATA_CLASSIFICATION.PUBLIC && action === 'READ') {
        return {
          bypass: true,
          allowed: true,
          reason:
            'Resource classified as PUBLIC - READ allowed for all active users',
          dataFilter: null,
        };
      }

      // INTERNAL: cho phép READ cho tất cả user active
      if (
        classification === DATA_CLASSIFICATION.INTERNAL &&
        action === 'READ'
      ) {
        return {
          bypass: true,
          allowed: true,
          reason:
            'Resource classified as INTERNAL - READ allowed for all active users',
          dataFilter: null,
        };
      }

      // RESTRICTED: thêm audit requirement
      if (classification === DATA_CLASSIFICATION.RESTRICTED) {
        return {
          bypass: false,
          requireAudit: true,
        };
      }

      // TOP_SECRET: kiểm tra minimum template priority
      if (classification === DATA_CLASSIFICATION.TOP_SECRET) {
        return {
          bypass: false,
          requireAudit: true,
          minimumTemplatePriority: 900,
        };
      }

      // CONFIDENTIAL hoặc khác: đi tiếp pipeline bình thường
      return { bypass: false };
    } catch (error) {
      this.logger.warn(
        `Data classification check failed for ${resource}: ${error}`,
      );

      return { bypass: false };
    }
  }

  /**
   * Check permission via template-based logic (replaces Casbin)
   *
   * Algorithm:
   * 1. CEO/full-access users (level 1-3): allow all non-TOP_SECRET actions
   * 2. Load templateResourcePermissions for user's assigned templates
   * 3. Find permission entry matching the requested resource
   * 4. Check allowedActions contains action AND deniedActions does not
   */
  private async checkTemplatePermission(
    workspaceId: string,
    userContext: UserContext,
    resource: string,
    action: string,
  ): Promise<{ allowed: boolean; reason: string }> {
    // Full-access users bypass template check
    if (userContext.hasFullAccess) {
      return {
        allowed: true,
        reason: 'Full access granted by hierarchy level',
      };
    }

    const templateIds = userContext.templates.map((t) => t.id);

    if (templateIds.length === 0) {
      return {
        allowed: false,
        reason: 'No permission templates assigned to user',
      };
    }

    const templatePerms =
      await this.templateResourcePermissionRepository.findActiveByTemplateIds(
        workspaceId,
        templateIds,
      );

    // Find the matching resource permission (resource key match)
    const matchingPerm = templatePerms.find(
      (trp) => trp.resource?.resourceKey === resource,
    );

    if (!matchingPerm) {
      return {
        allowed: false,
        reason: `No permission entry found for resource: ${resource}`,
      };
    }

    // Explicit deny takes priority
    if (
      matchingPerm.deniedActions &&
      matchingPerm.deniedActions.includes(action)
    ) {
      return {
        allowed: false,
        reason: `Action '${action}' is explicitly denied for resource '${resource}'`,
      };
    }

    // Check if action is in allowed list
    if (matchingPerm.allowedActions.includes(action)) {
      return {
        allowed: true,
        reason: `Action '${action}' allowed by template permission for resource '${resource}'`,
      };
    }

    return {
      allowed: false,
      reason: `Action '${action}' not in allowed actions for resource '${resource}'`,
    };
  }

  /**
   * Get all template resource permissions for user's assigned templates
   */
  private async getTemplateResourcePermissions(
    workspaceId: string,
    userContext: UserContext,
  ) {
    const templateIds = userContext.templates.map((t) => t.id);

    if (templateIds.length === 0) {
      return [];
    }

    return this.templateResourcePermissionRepository.findActiveByTemplateIds(
      workspaceId,
      templateIds,
    );
  }

  /**
   * Build resource permissions từ template resource permission data
   */
  private buildResourcePermissionsFromTemplates(
    templatePerms: Awaited<
      ReturnType<
        MktTemplateResourcePermissionRepository['findActiveByTemplateIds']
      >
    >,
    hasFilter: boolean,
  ): RbacResourcePermission[] {
    const resourceMap = new Map<string, RbacResourcePermissionData>();

    for (const trp of templatePerms) {
      const resourceKey = trp.resource?.resourceKey ?? trp.resourceId;
      const data = RbacEnforcerService.getOrInitResourceData(
        resourceMap,
        resourceKey,
      );

      for (const action of trp.allowedActions ?? []) {
        RbacEnforcerService.addActionToResourceData(data, action, 'allow');
      }

      for (const action of trp.deniedActions ?? []) {
        RbacEnforcerService.addActionToResourceData(data, action, 'deny');
      }
    }

    const resources: RbacResourcePermission[] = [];

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
  ): Promise<RbacFilterCondition | null> {
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
  ): Promise<RbacFilterCondition | null> {
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
  ): Promise<RbacFilterCondition | null> {
    // Get applicable policies
    const policies = await this.getAppliedPolicies(
      workspaceId,
      userContext,
      resource,
    );

    // Build filter from policies and user context
    const conditions: RbacFilterConditionItem[] = [];

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
  ): RbacFilterCondition | null {
    const filterConditions = policy.filterConditions as Record<string, unknown>;

    // Early return nếu không có filter conditions
    if (!filterConditions || Object.keys(filterConditions).length === 0) {
      return null;
    }

    const conditions: RbacFilterConditionItem[] = [
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
  ): RbacFilterConditionItem[] {
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
  ): RbacFilterConditionItem[] {
    const status = filterConditions.status as
      | Record<string, unknown>
      | undefined;

    if (!status) {
      return [];
    }

    const conditions: RbacFilterConditionItem[] = [];

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
  ): RbacFilterConditionItem[] {
    const conditions = filterConditions.conditions;

    if (!conditions || !Array.isArray(conditions)) {
      return [];
    }

    return (conditions as Array<Record<string, unknown>>).map((cond) => ({
      field: cond.field as string,
      operator: cond.operator as RbacFilterOperator,
      value: cond.value,
      description: cond.description as string | undefined,
    }));
  }

  /**
   * Convert resolved filter (from FilterExpressionResolver) to FilterCondition format
   */
  private convertResolvedFilterToCondition(
    resolvedFilter: ResolvedFilterConditions,
  ): RbacFilterCondition {
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
  ): RbacFilterConditionItem[] {
    const conditions: RbacFilterConditionItem[] = [];

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
  ): RbacFilterConditionItem[] {
    const conditions: RbacFilterConditionItem[] = [];

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
  ): RbacFilterConditionItem[] {
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
  private buildOwnRecordsFilter(userContext: UserContext): RbacFilterCondition {
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
  ): RbacFilterConditionItem[] {
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
