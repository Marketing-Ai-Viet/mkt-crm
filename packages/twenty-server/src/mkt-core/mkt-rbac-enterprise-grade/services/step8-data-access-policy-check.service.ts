/**
 * Step 8: Data Access Policy Check Service
 * Validates user permissions against configured data access policies
 * Part of the 15-step Enterprise RBAC validation process
 * Uses workspace entities only, no core module dependencies
 */

import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  EnhancedUserContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  VALIDATION_STEPS,
  STEP_PERFORMANCE_CONFIG,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  VALIDATION_STEP_DESCRIPTIONS,
  VALIDATION_STEP_NAMES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';

/**
 * Data access policy evaluation result
 */
type DataAccessPolicyEvaluation = {
  hasPermission: boolean;
  source:
    | 'SPECIFIC_MEMBER'
    | 'DEPARTMENT_POLICY'
    | 'ORGANIZATION_LEVEL'
    | 'HIERARCHY_RANGE'
    | 'GLOBAL_POLICY'
    | 'SYSTEM_DEFAULT';
  level: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';
  restrictions: string[];
  confidence: number;
  filterConditions: Record<string, unknown>;
  metadata: {
    appliedPolicyIds: string[];
    matchedPolicyCount: number;
    highestPriority: number;
    evaluationMode: 'STRICT' | 'BALANCED' | 'PERMISSIVE';
    filtersPassed: boolean;
    dynamicConditionsMet: boolean;
  };
};

/**
 * Data access policy entity from workspace
 */
type DataAccessPolicyEntity = {
  id: string;
  name: string;
  description?: string;
  objectName: string;
  filterConditions: Record<string, unknown>;
  priority?: number;
  isActive?: boolean;
  position?: number;
  minHierarchyLevel?: number;
  maxHierarchyLevel?: number;
  departmentId?: string;
  organizationLevelId?: string;
  permissionTemplateId?: string;
  specificMemberId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

/**
 * Permission context entity from workspace
 */
type PermissionContextEntity = {
  id: string;
  name: string;
  description: string;
  contextType: string;
  filterExpression: Record<string, unknown>;
  contextKey: string;
  priority: number;
  isActive: boolean;
  isSystemDefault: boolean;
  validationRules: Record<string, unknown>;
  position?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

/**
 * Policy match result with scoring
 */
type PolicyMatchResult = {
  policy: DataAccessPolicyEntity;
  matchScore: number;
  matchType: DataAccessPolicyEvaluation['source'];
  applicabilityReason: string;
  conditions: Record<string, unknown>;
};

@Injectable()
export class Step8DataAccessPolicyCheckService
  implements PermissionValidationStep
{
  private readonly logger = new Logger(Step8DataAccessPolicyCheckService.name);
  readonly stepNumber = VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK];
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 80;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Get data access policy repository
   */
  private async getDataAccessPolicyRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<DataAccessPolicyEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<DataAccessPolicyEntity>(
      workspaceId,
      'mktDataAccessPolicy',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get permission context repository
   */
  private async getPermissionContextRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<PermissionContextEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<PermissionContextEntity>(
      workspaceId,
      'mktPermissionContext',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Validate Step 8: Data Access Policy Check
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step 8: ${this.stepName} - Starting data access policy check`,
      );

      // Validate prerequisites
      if (!context.userContext) {
        return {
          result: CheckResult.FAIL,
          continue: false,
          reason: 'Missing user context for data access policy check',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: {
            error: 'USER_CONTEXT_MISSING',
            stepNumber: this.stepNumber,
          },
        };
      }

      if (!context.resourceContext?.resourceType) {
        return {
          result: CheckResult.FAIL,
          continue: false,
          reason: 'Missing resource type for data access policy check',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: {
            error: 'RESOURCE_TYPE_MISSING',
            stepNumber: this.stepNumber,
          },
        };
      }

      const workspaceId = context.userContext.workspaceId || '';

      // Get complete policy evaluation
      const policyEvaluation = await this.evaluateDataAccessPolicies(
        context.userContext,
        context,
        context.resourceContext.resourceType,
        context.resourceContext.objectName || '',
        context.action || '',
        workspaceId,
      );

      // Update context with policy information
      this.updateContextWithPolicyResults(context, policyEvaluation);

      this.logger.debug(`Step 8: ${this.stepName} completed successfully`);

      const result = policyEvaluation.hasPermission
        ? CheckResult.PASS
        : CheckResult.FAIL;

      return {
        result,
        continue: policyEvaluation.hasPermission,
        reason: policyEvaluation.hasPermission
          ? `Data access policy check passed - ${policyEvaluation.source}`
          : `Data access policy check failed - ${policyEvaluation.source}`,
        executionTime: DateTime.now().diff(stepStartTime).toMillis(),
        metadata: {
          source: policyEvaluation.source,
          confidence: policyEvaluation.confidence,
          appliedPolicyCount: policyEvaluation.metadata.matchedPolicyCount,
          evaluationMode: policyEvaluation.metadata.evaluationMode,
        },
      };
    } catch (error) {
      this.logger.error(
        `Step 8: ${this.stepName} failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        result: CheckResult.FAIL,
        continue: false,
        reason: `Data access policy check failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: DateTime.now().diff(stepStartTime).toMillis(),
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stepNumber: this.stepNumber,
        },
      };
    }
  }

  /**
   * Evaluate data access policies for the given context
   */
  private async evaluateDataAccessPolicies(
    userContext: EnhancedUserContext,
    context: EnhancedPermissionContext,
    resourceType: string,
    objectName: string,
    action: string,
    workspaceId: string,
  ): Promise<DataAccessPolicyEvaluation> {
    try {
      // Find applicable policies
      const applicablePolicies = await this.findApplicablePolicies(
        userContext,
        resourceType,
        objectName,
        workspaceId,
      );

      if (applicablePolicies.length === 0) {
        return this.getSystemDefaultPolicyEvaluation(userContext);
      }

      // Process policies by priority
      return await this.processDataAccessPolicies(
        userContext,
        context,
        applicablePolicies,
        action,
        workspaceId,
      );
    } catch (error) {
      this.logger.error(
        `Error evaluating data access policies: ${error instanceof Error ? error.message : String(error)}`,
      );

      return this.getSystemDefaultPolicyEvaluation(userContext);
    }
  }

  /**
   * Find applicable data access policies
   */
  private async findApplicablePolicies(
    userContext: EnhancedUserContext,
    resourceType: string,
    objectName: string,
    workspaceId: string,
  ): Promise<PolicyMatchResult[]> {
    try {
      const dataAccessPolicyRepository =
        await this.getDataAccessPolicyRepository(workspaceId);

      // Get all active policies for the object
      const allPolicies = await dataAccessPolicyRepository.find({
        where: {
          objectName,
          isActive: true,
        },
      });

      const matchResults: PolicyMatchResult[] = [];

      // Evaluate each policy for applicability
      for (const policy of allPolicies) {
        const matchResult = await this.evaluatePolicyMatch(
          policy,
          userContext,
          resourceType,
        );

        if (matchResult.matchScore > 0) {
          matchResults.push(matchResult);
        }
      }

      // Sort by match score (highest first) and then by priority
      matchResults.sort((a, b) => {
        if (a.matchScore !== b.matchScore) {
          return b.matchScore - a.matchScore;
        }

        return (b.policy.priority || 0) - (a.policy.priority || 0);
      });

      this.logger.debug(
        `Found ${matchResults.length} applicable data access policies`,
      );

      return matchResults;
    } catch (error) {
      this.logger.error(
        `Error finding applicable policies: ${error instanceof Error ? error.message : String(error)}`,
      );

      return [];
    }
  }

  /**
   * Evaluate if a policy matches the user context
   */
  private async evaluatePolicyMatch(
    policy: DataAccessPolicyEntity,
    userContext: EnhancedUserContext,
    resourceType: string,
  ): Promise<PolicyMatchResult> {
    let matchScore = 0;
    let matchType: DataAccessPolicyEvaluation['source'] = 'GLOBAL_POLICY';
    let applicabilityReason = '';

    // Check specific member targeting (highest priority)
    if (
      policy.specificMemberId &&
      policy.specificMemberId === userContext.userId
    ) {
      matchScore = 100;
      matchType = 'SPECIFIC_MEMBER';
      applicabilityReason = 'Direct user targeting';
    }
    // Check department targeting
    else if (
      policy.departmentId &&
      userContext.departmentId === policy.departmentId
    ) {
      matchScore = 85;
      matchType = 'DEPARTMENT_POLICY';
      applicabilityReason = 'Department membership';
    }
    // Check organization level targeting
    else if (
      policy.organizationLevelId &&
      userContext.organizationLevelId === policy.organizationLevelId
    ) {
      matchScore = 75;
      matchType = 'ORGANIZATION_LEVEL';
      applicabilityReason = 'Organization level assignment';
    }
    // Check hierarchy range targeting
    else if (
      (policy.minHierarchyLevel !== null ||
        policy.maxHierarchyLevel !== null) &&
      userContext.hierarchyLevel !== null
    ) {
      const userLevel = userContext.hierarchyLevel;
      const minLevel = policy.minHierarchyLevel ?? 0;
      const maxLevel = policy.maxHierarchyLevel ?? 999;

      if (userLevel >= minLevel && userLevel <= maxLevel) {
        matchScore = 65;
        matchType = 'HIERARCHY_RANGE';
        applicabilityReason = `Hierarchy level ${userLevel} within range [${minLevel}-${maxLevel}]`;
      }
    }
    // Global policies (apply to everyone)
    else if (
      !policy.specificMemberId &&
      !policy.departmentId &&
      !policy.organizationLevelId &&
      policy.minHierarchyLevel === null &&
      policy.maxHierarchyLevel === null
    ) {
      matchScore = 15;
      matchType = 'GLOBAL_POLICY';
      applicabilityReason = 'Global policy application';
    }

    return {
      policy,
      matchScore,
      matchType,
      applicabilityReason,
      conditions: policy.filterConditions || {},
    };
  }

  /**
   * Process data access policies to determine final permission
   */
  private async processDataAccessPolicies(
    userContext: EnhancedUserContext,
    context: EnhancedPermissionContext,
    applicablePolicies: PolicyMatchResult[],
    action: string,
    workspaceId: string,
  ): Promise<DataAccessPolicyEvaluation> {
    let finalDecision = false;
    let highestPriority = 0;
    let restrictionsList: string[] = [];
    let combinedFilterConditions: Record<string, unknown> = {};
    const appliedPolicyIds: string[] = [];
    let finalSource: DataAccessPolicyEvaluation['source'] = 'SYSTEM_DEFAULT';
    let confidence = 0;
    let filtersPassed = true;
    let dynamicConditionsMet = true;

    // Process policies in order of match score and priority
    for (const policyMatch of applicablePolicies) {
      const policy = policyMatch.policy;

      // Evaluate filter conditions
      const filterEvaluation = await this.evaluateFilterConditions(
        policy.filterConditions,
        userContext,
        context,
        action,
      );

      if (filterEvaluation.conditionsMet) {
        finalDecision = true;
        finalSource = policyMatch.matchType;
        confidence = Math.max(confidence, policyMatch.matchScore);
        appliedPolicyIds.push(policy.id);

        // Combine filter conditions
        combinedFilterConditions = {
          ...combinedFilterConditions,
          ...policy.filterConditions,
        };

        // Track restrictions
        if (filterEvaluation.restrictions.length > 0) {
          restrictionsList = [
            ...restrictionsList,
            ...filterEvaluation.restrictions,
          ];
        }

        if (filterEvaluation.hasFailedConditions) {
          filtersPassed = false;
        }

        if (filterEvaluation.hasDynamicConditions) {
          dynamicConditionsMet = filterEvaluation.dynamicConditionsMet;
        }
      }

      if ((policy.priority || 0) > highestPriority) {
        highestPriority = policy.priority || 0;
      }

      // For strict evaluation mode, stop at first matching high-priority policy
      if (
        finalDecision &&
        this.isStrictEvaluationMode(userContext) &&
        policyMatch.matchScore >= 80
      ) {
        break;
      }
    }

    const evaluationMode = this.determineEvaluationMode(
      highestPriority,
      userContext,
    );

    return {
      hasPermission: finalDecision && filtersPassed && dynamicConditionsMet,
      source: finalSource,
      level: this.determineAccessLevel(action, finalDecision),
      restrictions: restrictionsList,
      confidence: confidence / 100, // Convert to 0-1 scale
      filterConditions: combinedFilterConditions,
      metadata: {
        appliedPolicyIds,
        matchedPolicyCount: applicablePolicies.length,
        highestPriority,
        evaluationMode,
        filtersPassed,
        dynamicConditionsMet,
      },
    };
  }

  /**
   * Evaluate filter conditions for a policy
   */
  private async evaluateFilterConditions(
    filterConditions: Record<string, unknown>,
    userContext: EnhancedUserContext,
    context: EnhancedPermissionContext,
    action: string,
  ): Promise<{
    conditionsMet: boolean;
    restrictions: string[];
    hasFailedConditions: boolean;
    hasDynamicConditions: boolean;
    dynamicConditionsMet: boolean;
  }> {
    const restrictions: string[] = [];
    const conditionsMet = true;
    let hasFailedConditions = false;
    let hasDynamicConditions = false;
    let dynamicConditionsMet = true;

    // Evaluate status conditions
    if (
      filterConditions.status &&
      typeof filterConditions.status === 'object'
    ) {
      const statusFilter = filterConditions.status as Record<string, unknown>;

      if (
        statusFilter.allowedValues &&
        Array.isArray(statusFilter.allowedValues)
      ) {
        restrictions.push(
          `Status must be one of: ${statusFilter.allowedValues.join(', ')}`,
        );
      }

      if (
        statusFilter.deniedValues &&
        Array.isArray(statusFilter.deniedValues)
      ) {
        restrictions.push(
          `Status cannot be: ${statusFilter.deniedValues.join(', ')}`,
        );
      }
    }

    // Evaluate ownership conditions
    if (
      filterConditions.ownership &&
      typeof filterConditions.ownership === 'object'
    ) {
      const ownershipFilter = filterConditions.ownership as Record<
        string,
        unknown
      >;

      if (ownershipFilter.enabled === true) {
        hasDynamicConditions = true;
        const canAccess =
          userContext.roles?.includes('OWNER') ||
          userContext.roles?.includes('ADMIN') ||
          userContext.hierarchyLevel === 1;

        if (!canAccess && ownershipFilter.allowShared !== true) {
          dynamicConditionsMet = false;
          hasFailedConditions = true;
        }

        restrictions.push('Access limited to record owners or shared records');
      }
    }

    // Evaluate time range conditions
    if (
      filterConditions.timeRange &&
      typeof filterConditions.timeRange === 'object'
    ) {
      const timeFilter = filterConditions.timeRange as Record<string, unknown>;

      if (typeof timeFilter.daysBack === 'number') {
        const cutoffDate = DateTime.now().minus({ days: timeFilter.daysBack });

        restrictions.push(
          `Access limited to records from last ${timeFilter.daysBack} days`,
        );
        hasDynamicConditions = true;
      }
    }

    // Evaluate support level conditions
    if (
      filterConditions.supportLevel &&
      typeof filterConditions.supportLevel === 'object'
    ) {
      const supportFilter = filterConditions.supportLevel as Record<
        string,
        unknown
      >;

      if (supportFilter.enabled === true && supportFilter.maxLevel) {
        restrictions.push(
          `Support access limited to ${supportFilter.maxLevel} level`,
        );

        // Check if user has appropriate support level (simplified check)
        const userSupportLevel = userContext.roles?.find((role) =>
          role.includes('SUPPORT'),
        );

        if (!userSupportLevel) {
          hasFailedConditions = true;
        }
      }
    }

    return {
      conditionsMet: conditionsMet && !hasFailedConditions,
      restrictions,
      hasFailedConditions,
      hasDynamicConditions,
      dynamicConditionsMet,
    };
  }

  /**
   * Get system default policy evaluation when no policies apply
   */
  private getSystemDefaultPolicyEvaluation(
    userContext: EnhancedUserContext,
  ): DataAccessPolicyEvaluation {
    const hierarchyLevel = userContext.hierarchyLevel ?? 0;
    const userRoles = userContext.roles || [];

    // System admins and level 1 users get default access
    const hasSystemAccess =
      userRoles.includes('SYSTEM_ADMIN') ||
      userRoles.includes('ADMIN') ||
      hierarchyLevel === 1;

    return {
      hasPermission: hasSystemAccess,
      source: 'SYSTEM_DEFAULT',
      level: hasSystemAccess ? 'ADMIN' : 'READ',
      restrictions: hasSystemAccess
        ? []
        : ['No applicable data access policies found'],
      confidence: hasSystemAccess ? 0.5 : 0.1,
      filterConditions: {},
      metadata: {
        appliedPolicyIds: [],
        matchedPolicyCount: 0,
        highestPriority: 0,
        evaluationMode: 'STRICT',
        filtersPassed: true,
        dynamicConditionsMet: true,
      },
    };
  }

  /**
   * Update context with policy evaluation results
   */
  private updateContextWithPolicyResults(
    context: EnhancedPermissionContext,
    evaluation: DataAccessPolicyEvaluation,
  ): void {
    if (!context.policyContext) {
      context.policyContext = {
        applicablePolicies: [],
        filterConditions: {},
        priority: 0,
        isDynamic: false,
        evaluationMode: 'BALANCED',
      };
    }

    context.policyContext.applicablePolicies =
      evaluation.metadata.appliedPolicyIds;
    try {
      // Convert filterConditions to the expected type
      const convertedConditions: Record<
        string,
        string | number | boolean | Date
      > = {};

      for (const [key, value] of Object.entries(evaluation.filterConditions)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value instanceof Date
        ) {
          convertedConditions[key] = value;
        } else if (value !== null && value !== undefined) {
          convertedConditions[key] = String(value);
        }
      }
      context.policyContext.filterConditions = convertedConditions;
    } catch {
      context.policyContext.filterConditions = {};
    }
    context.policyContext.priority = evaluation.metadata.highestPriority;
    context.policyContext.isDynamic = evaluation.metadata.dynamicConditionsMet;
    context.policyContext.evaluationMode = evaluation.metadata.evaluationMode;
  }

  /**
   * Determine access level based on action and permission result
   */
  private determineAccessLevel(
    action: string,
    hasPermission: boolean,
  ): DataAccessPolicyEvaluation['level'] {
    if (!hasPermission) {
      return 'READ';
    }

    switch (action?.toLowerCase()) {
      case 'delete':
      case 'destroy':
        return 'DELETE';
      case 'update':
      case 'edit':
      case 'modify':
        return 'WRITE';
      case 'admin':
      case 'manage':
        return 'ADMIN';
      default:
        return 'READ';
    }
  }

  /**
   * Determine evaluation mode based on priority and user context
   */
  private determineEvaluationMode(
    priority: number,
    userContext: EnhancedUserContext,
  ): DataAccessPolicyEvaluation['metadata']['evaluationMode'] {
    const userRoles = userContext.roles || [];
    const isSensitiveRole = userRoles.some((role) =>
      ['SYSTEM_ADMIN', 'SECURITY_ADMIN', 'COMPLIANCE_OFFICER'].includes(role),
    );

    if (priority >= 80 || isSensitiveRole) {
      return 'STRICT';
    } else if (priority >= 50) {
      return 'BALANCED';
    } else {
      return 'PERMISSIVE';
    }
  }

  /**
   * Check if evaluation should use strict mode
   */
  private isStrictEvaluationMode(userContext: EnhancedUserContext): boolean {
    const sensitiveRoles = [
      'SYSTEM_ADMIN',
      'SECURITY_ADMIN',
      'COMPLIANCE_OFFICER',
    ];

    return (
      userContext.roles?.some((role) => sensitiveRoles.includes(role)) || false
    );
  }

  /**
   * Determine if this step should execute based on context
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // Skip for admin users
    const userRoles = context.userContext?.roles || [];
    const isAdmin =
      userRoles.includes('SYSTEM_ADMIN') || userRoles.includes('ADMIN');

    if (isAdmin) {
      return false;
    }

    // Skip if no resource context
    if (!context.resourceContext?.resourceType) {
      return false;
    }

    // Execute for all other cases
    return true;
  }

  /**
   * Get step dependencies
   */
  getDependencies(): number[] {
    return [
      VALIDATION_STEPS.PRE_VALIDATION,
      VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
      VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
      VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK,
    ];
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return (
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK]
        ?.estimatedExecutionTime || 150
    );
  }

  /**
   * Check if step execution time exceeds threshold
   */
  isPerformanceOptimal(executionTime: number): boolean {
    const threshold =
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK]
        ?.maxExecutionTime || 4000;

    return executionTime <= threshold;
  }
}
