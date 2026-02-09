/**
 * HierarchicalAccessEvaluatorService
 *
 * Evaluates data access based on organization hierarchy.
 * Implements the Sales Order Hierarchy Access Policy rules:
 * - Staff (level 8-11): Only see records they created
 * - Manager (level 7): See records of direct subordinates
 * - Upper Management (level 1-6): See records in entire reporting chain
 * - Peer managers: Cannot see each other's team records
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  ACCESS_SCOPE,
  AccessScope,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/core/policy.constants';
import { HIERARCHICAL_ACCESS_MESSAGES } from 'src/mkt-core/mkt-rbac-enterprise-grade/message';
import {
  HierarchicalAccessConfig,
  HierarchicalAccessContext,
  HierarchicalAccessResult,
  HierarchicalAccessRule,
  PeerRestriction,
  TargetRecordInfo,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/hierarchical-access.types';
import { HierarchyLevel } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/hierarchy.types';
import {
  RbacContextService,
  UserContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-context.service';
import {
  MktDepartmentHierarchyRepository,
  MktDepartmentRepository,
} from 'src/mkt-core/mkt-department/repositories';

@Injectable()
export class HierarchicalAccessEvaluatorService {
  private readonly logger = new Logger(HierarchicalAccessEvaluatorService.name);

  constructor(
    private readonly rbacContextService: RbacContextService,
    private readonly departmentHierarchyRepository: MktDepartmentHierarchyRepository,
    private readonly departmentRepository: MktDepartmentRepository,
  ) {}

  // ============================================
  // MAIN EVALUATION METHOD
  // ============================================

  /**
   * Evaluate hierarchical access for a target record
   *
   * @param config - Hierarchical access configuration from policy
   * @param context - User context with hierarchy info
   * @param target - Target record information
   * @returns Access decision result
   */
  evaluateAccess(
    config: HierarchicalAccessConfig,
    context: HierarchicalAccessContext,
    target: TargetRecordInfo,
  ): HierarchicalAccessResult {
    // Check if hierarchical access is enabled
    if (!config.enabled) {
      return {
        allowed: true,
        reason: 'Hierarchical access is disabled',
      };
    }

    // Validate context
    if (!this.validateContext(context)) {
      return {
        allowed: false,
        reason: HIERARCHICAL_ACCESS_MESSAGES.ERROR_MISSING_CONTEXT,
      };
    }

    // Find applicable rule based on user's hierarchy level
    const applicableRule = this.findApplicableRule(
      config.rules,
      context.currentHierarchyLevel,
    );

    if (!applicableRule) {
      this.logger.warn(
        `No applicable rule found for hierarchy level ${context.currentHierarchyLevel}`,
      );

      return {
        allowed: false,
        reason: HIERARCHICAL_ACCESS_MESSAGES.DENIED_NO_APPLICABLE_RULE,
      };
    }

    // Evaluate based on access scope
    const scopeResult = this.evaluateAccessScope(
      applicableRule,
      context,
      target,
      config.ownershipField,
    );

    // If access denied by scope, return immediately
    if (!scopeResult.allowed) {
      return scopeResult;
    }

    // Check peer restriction if enabled
    if (
      config.peerRestriction?.enabled &&
      config.peerRestriction.blockPeerAccess
    ) {
      const peerResult = this.checkPeerRestriction(
        config.peerRestriction,
        context,
        target,
      );

      if (!peerResult.allowed) {
        return {
          ...peerResult,
          appliedRule: applicableRule.name,
          peerRestrictionApplied: true,
        };
      }
    }

    return {
      ...scopeResult,
      appliedRule: applicableRule.name,
    };
  }

  /**
   * Evaluate access for multiple records (batch operation)
   */
  evaluateAccessBatch(
    config: HierarchicalAccessConfig,
    context: HierarchicalAccessContext,
    targets: TargetRecordInfo[],
  ): Map<string, HierarchicalAccessResult> {
    const results = new Map<string, HierarchicalAccessResult>();

    for (const target of targets) {
      const result = this.evaluateAccess(config, context, target);

      results.set(target.recordId, result);
    }

    return results;
  }

  /**
   * Filter records based on hierarchical access
   * Returns only records the user can access
   */
  filterAccessibleRecords<T extends { id: string; createdById?: string }>(
    config: HierarchicalAccessConfig,
    context: HierarchicalAccessContext,
    records: T[],
    ownershipField: keyof T = 'createdById' as keyof T,
  ): T[] {
    return records.filter((record) => {
      const target: TargetRecordInfo = {
        recordId: record.id,
        createdById: String(record[ownershipField] ?? ''),
      };

      const result = this.evaluateAccess(config, context, target);

      return result.allowed;
    });
  }

  // ============================================
  // CONTEXT BUILDING
  // ============================================

  /**
   * Build hierarchical access context from user context
   */
  async buildAccessContext(
    userContext: UserContext,
    workspaceId?: string,
  ): Promise<HierarchicalAccessContext> {
    // Resolve currentManagerId from department entity (RBAC-007)
    let currentManagerId: string | null = null;

    if (userContext.departmentId && workspaceId) {
      const department = await this.departmentRepository.findByIdInWorkspace(
        userContext.departmentId,
        workspaceId,
      );

      currentManagerId = department?.managerId ?? null;
    }

    return {
      currentUserId: userContext.workspaceMemberId,
      currentHierarchyLevel: userContext.hierarchyLevel,
      currentDepartmentId: userContext.departmentId,
      currentDepartmentCode: userContext.departmentCode,
      currentManagerId,
      directSubordinateIds: userContext.subordinateMemberIds,
      reportingChainIds: [
        ...userContext.subordinateMemberIds,
        ...userContext.teamMemberIds,
      ],
      peerManagerIds: [], // resolved via buildAccessContextWithPeers
      teamMemberIds: userContext.teamMemberIds,
    };
  }

  /**
   * Build context with peer manager resolution
   */
  async buildAccessContextWithPeers(
    userContext: UserContext,
    workspaceId: string,
  ): Promise<HierarchicalAccessContext> {
    const baseContext = await this.buildAccessContext(userContext, workspaceId);

    // Resolve peer managers (same level, same parent department)
    const peerManagerIds = await this.resolvePeerManagers(
      workspaceId,
      userContext,
    );

    return {
      ...baseContext,
      peerManagerIds,
    };
  }

  // ============================================
  // PRIVATE: RULE FINDING
  // ============================================

  /**
   * Find applicable rule based on hierarchy level
   */
  private findApplicableRule(
    rules: HierarchicalAccessRule[],
    hierarchyLevel: HierarchyLevel,
  ): HierarchicalAccessRule | undefined {
    return rules.find(
      (rule) =>
        hierarchyLevel >= rule.minHierarchyLevel &&
        hierarchyLevel <= rule.maxHierarchyLevel,
    );
  }

  // ============================================
  // PRIVATE: ACCESS SCOPE EVALUATION
  // ============================================

  /**
   * Evaluate access based on scope
   */
  private evaluateAccessScope(
    rule: HierarchicalAccessRule,
    context: HierarchicalAccessContext,
    target: TargetRecordInfo,
    ownershipField: string,
  ): HierarchicalAccessResult {
    const ownerId = this.getOwnerIdFromTarget(target, ownershipField);

    switch (rule.accessScope) {
      case ACCESS_SCOPE.SELF:
        return this.evaluateSelfAccess(context, ownerId);

      case ACCESS_SCOPE.DIRECT_SUBORDINATES:
        return this.evaluateSubordinateAccess(context, ownerId);

      case ACCESS_SCOPE.REPORTING_CHAIN:
        return this.evaluateReportingChainAccess(context, ownerId);

      case ACCESS_SCOPE.DEPARTMENT:
        return this.evaluateDepartmentAccess(context, target);

      case ACCESS_SCOPE.ALL:
        return {
          allowed: true,
          grantedScope: ACCESS_SCOPE.ALL,
          reason: HIERARCHICAL_ACCESS_MESSAGES.ALLOWED_FULL_ACCESS,
        };

      default:
        return {
          allowed: false,
          reason: `Unknown access scope: ${rule.accessScope}`,
        };
    }
  }

  /**
   * Evaluate SELF access scope
   * User can only access records they created
   */
  private evaluateSelfAccess(
    context: HierarchicalAccessContext,
    ownerId: string,
  ): HierarchicalAccessResult {
    const isOwner = context.currentUserId === ownerId;

    return {
      allowed: isOwner,
      grantedScope: ACCESS_SCOPE.SELF,
      reason: isOwner
        ? HIERARCHICAL_ACCESS_MESSAGES.ALLOWED_SELF
        : HIERARCHICAL_ACCESS_MESSAGES.DENIED_NOT_OWNER,
      details: {
        currentUserId: context.currentUserId,
        ownerId,
        isOwner,
      },
    };
  }

  /**
   * Evaluate DIRECT_SUBORDINATES access scope
   * User can access own records and records of direct subordinates
   */
  private evaluateSubordinateAccess(
    context: HierarchicalAccessContext,
    ownerId: string,
  ): HierarchicalAccessResult {
    // Check self first
    if (context.currentUserId === ownerId) {
      return {
        allowed: true,
        grantedScope: ACCESS_SCOPE.SELF,
        reason: HIERARCHICAL_ACCESS_MESSAGES.ALLOWED_SELF,
      };
    }

    // Check if owner is a direct subordinate
    const isSubordinate = context.directSubordinateIds.includes(ownerId);

    return {
      allowed: isSubordinate,
      grantedScope: ACCESS_SCOPE.DIRECT_SUBORDINATES,
      reason: isSubordinate
        ? HIERARCHICAL_ACCESS_MESSAGES.ALLOWED_SUBORDINATE
        : HIERARCHICAL_ACCESS_MESSAGES.DENIED_NOT_SUBORDINATE,
      details: {
        subordinateCount: context.directSubordinateIds.length,
        isSubordinate,
      },
    };
  }

  /**
   * Evaluate REPORTING_CHAIN access scope
   * User can access records of anyone in their reporting chain
   */
  private evaluateReportingChainAccess(
    context: HierarchicalAccessContext,
    ownerId: string,
  ): HierarchicalAccessResult {
    // Check self first
    if (context.currentUserId === ownerId) {
      return {
        allowed: true,
        grantedScope: ACCESS_SCOPE.SELF,
        reason: HIERARCHICAL_ACCESS_MESSAGES.ALLOWED_SELF,
      };
    }

    // Check if owner is in reporting chain
    const isInChain = context.reportingChainIds.includes(ownerId);

    return {
      allowed: isInChain,
      grantedScope: ACCESS_SCOPE.REPORTING_CHAIN,
      reason: isInChain
        ? HIERARCHICAL_ACCESS_MESSAGES.ALLOWED_REPORTING_CHAIN
        : HIERARCHICAL_ACCESS_MESSAGES.DENIED_NOT_SUBORDINATE,
      details: {
        reportingChainCount: context.reportingChainIds.length,
        isInChain,
      },
    };
  }

  /**
   * Evaluate DEPARTMENT access scope
   */
  private evaluateDepartmentAccess(
    context: HierarchicalAccessContext,
    target: TargetRecordInfo,
  ): HierarchicalAccessResult {
    if (!context.currentDepartmentId || !target.ownerDepartmentId) {
      return {
        allowed: false,
        reason: HIERARCHICAL_ACCESS_MESSAGES.DENIED_DEPARTMENT_MISMATCH,
      };
    }

    const isSameDepartment =
      context.currentDepartmentId === target.ownerDepartmentId;

    return {
      allowed: isSameDepartment,
      grantedScope: ACCESS_SCOPE.DEPARTMENT,
      reason: isSameDepartment
        ? 'Truy cập được phép: Cùng phòng ban'
        : HIERARCHICAL_ACCESS_MESSAGES.DENIED_DEPARTMENT_MISMATCH,
    };
  }

  // ============================================
  // PRIVATE: PEER RESTRICTION
  // ============================================

  /**
   * Check peer restriction
   * Managers at the same level cannot see each other's team records
   */
  private checkPeerRestriction(
    restriction: PeerRestriction,
    context: HierarchicalAccessContext,
    target: TargetRecordInfo,
  ): HierarchicalAccessResult {
    // If owner is self, always allow
    if (target.createdById === context.currentUserId) {
      return { allowed: true, reason: 'Self access' };
    }

    // Check if owner's manager is a peer of current user
    if (target.ownerManagerId && context.peerManagerIds.length > 0) {
      const isPeerTeamRecord = context.peerManagerIds.includes(
        target.ownerManagerId,
      );

      if (isPeerTeamRecord) {
        return {
          allowed: false,
          reason: HIERARCHICAL_ACCESS_MESSAGES.DENIED_PEER_RESTRICTION,
          details: {
            ownerManagerId: target.ownerManagerId,
            peerRestriction: restriction.peerDefinition,
          },
        };
      }
    }

    // Check if owner is a peer manager themselves
    if (context.peerManagerIds.includes(target.createdById)) {
      return {
        allowed: false,
        reason: HIERARCHICAL_ACCESS_MESSAGES.DENIED_PEER_RESTRICTION,
        details: {
          ownerIsPeer: true,
        },
      };
    }

    return { allowed: true, reason: 'Not a peer restriction case' };
  }

  // ============================================
  // PRIVATE: HELPERS
  // ============================================

  /**
   * Validate context has required fields
   */
  private validateContext(context: HierarchicalAccessContext): boolean {
    return Boolean(
      context.currentUserId && context.currentHierarchyLevel !== undefined,
    );
  }

  /**
   * Get owner ID from target based on ownership field
   */
  private getOwnerIdFromTarget(
    target: TargetRecordInfo,
    ownershipField: string,
  ): string {
    switch (ownershipField) {
      case 'createdById':
        return target.createdById;
      case 'accountOwnerId':
        return target.accountOwnerId ?? target.createdById;
      default:
        return target.createdById;
    }
  }

  /**
   * Resolve peer managers (same hierarchy level, same parent department)
   *
   * Algorithm:
   * 1. Get user's departmentId from context
   * 2. Find parent department via hierarchy
   * 3. Find all sibling departments (children of the same parent)
   * 4. Get managerId from each sibling department
   * 5. Filter out current user and null values
   */
  private async resolvePeerManagers(
    workspaceId: string,
    userContext: UserContext,
  ): Promise<string[]> {
    if (!userContext.departmentId) {
      this.logger.debug(
        HIERARCHICAL_ACCESS_MESSAGES.PEER_NO_DEPARTMENT(
          userContext.workspaceMemberId,
        ),
      );

      return [];
    }

    // Step 1: Find parent hierarchy for user's department
    const parentHierarchy =
      await this.departmentHierarchyRepository.findParentHierarchy(
        userContext.departmentId,
      );

    if (!parentHierarchy?.parentDepartmentId) {
      this.logger.debug(
        HIERARCHICAL_ACCESS_MESSAGES.PEER_NO_PARENT(userContext.departmentId),
      );

      return [];
    }

    // Step 2: Find all sibling departments (children of the same parent)
    const siblingHierarchies =
      await this.departmentHierarchyRepository.findChildHierarchies(
        parentHierarchy.parentDepartmentId,
      );

    // Step 3: Collect sibling department IDs, excluding current user's department
    const siblingDepartmentIds = siblingHierarchies
      .map((h) => h.childDepartmentId)
      .filter(
        (childId): childId is string =>
          childId != null && childId !== userContext.departmentId,
      );

    if (siblingDepartmentIds.length === 0) {
      return [];
    }

    // Step 4: Get managerId from each sibling department
    const peerManagerIds: string[] = [];

    for (const deptId of siblingDepartmentIds) {
      const department = await this.departmentRepository.findByIdInWorkspace(
        deptId,
        workspaceId,
      );

      if (
        department?.managerId &&
        department.managerId !== userContext.workspaceMemberId
      ) {
        peerManagerIds.push(department.managerId);
      }
    }

    this.logger.debug(
      HIERARCHICAL_ACCESS_MESSAGES.PEER_RESOLVED(
        userContext.workspaceMemberId,
        peerManagerIds.length,
      ),
    );

    return peerManagerIds;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if user is at staff level (8-11)
   */
  isStaffLevel(hierarchyLevel: HierarchyLevel): boolean {
    return hierarchyLevel >= 8 && hierarchyLevel <= 11;
  }

  /**
   * Check if user is at manager level (7)
   */
  isManagerLevel(hierarchyLevel: HierarchyLevel): boolean {
    return hierarchyLevel === 7;
  }

  /**
   * Check if user is at upper management level (1-6)
   */
  isUpperManagementLevel(hierarchyLevel: HierarchyLevel): boolean {
    return hierarchyLevel >= 1 && hierarchyLevel <= 6;
  }

  /**
   * Get access scope for a hierarchy level based on default rules
   */
  getDefaultAccessScope(hierarchyLevel: HierarchyLevel): AccessScope {
    if (hierarchyLevel >= 8) return ACCESS_SCOPE.SELF;
    if (hierarchyLevel === 7) return ACCESS_SCOPE.DIRECT_SUBORDINATES;
    if (hierarchyLevel >= 4) return ACCESS_SCOPE.REPORTING_CHAIN;

    return ACCESS_SCOPE.ALL;
  }
}
