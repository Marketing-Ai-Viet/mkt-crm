/**
 * Step 6: Resource Permission Check Service
 * Validates specific resource permissions and access policies based on workspace data
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
 * Resource permission evaluation result
 */
type ResourcePermissionEvaluation = {
  hasPermission: boolean;
  source:
    | 'RESOURCE_POLICY'
    | 'TEMPLATE_RESOURCE'
    | 'DATA_ACCESS_POLICY'
    | 'SYSTEM_DEFAULT';
  level: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';
  restrictions: string[];
  confidence: number;
  metadata: {
    appliedPolicies: string[];
    resourceId?: string;
    resourceType?: string;
    resourceCategory?: string;
    confidentialityLevel?: string;
    hierarchyAccess?: boolean;
  };
};

/**
 * Resource classification result
 */
type ResourceClassification = {
  resourceType: string;
  resourceCategory: string;
  confidentialityLevel: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  isSystemResource: boolean;
  isSensitiveData: boolean;
  requiresSpecialAccess: boolean;
  minimumHierarchyLevel?: number;
  allowedDepartments?: string[];
  accessConditions?: Record<string, unknown>;
};

/**
 * Resource entity from workspace
 */
type ResourceEntity = {
  id: string;
  resourceKey: string;
  resourceName: string;
  resourceCategory: string;
  isSystemResource: boolean;
  isActive: boolean;
  displayOrder: number;
  icon?: string;
  colorCode?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Data access policy entity from workspace
 */
type DataAccessPolicyEntity = {
  id: string;
  name: string;
  description?: string;
  minHierarchyLevel?: number;
  maxHierarchyLevel?: number;
  objectName: string;
  filterConditions: Record<string, unknown>;
  priority?: number;
  isActive?: boolean;
  departmentId?: string;
  organizationLevelId?: string;
  permissionTemplateId?: string;
  specificMemberId?: string;
};

/**
 * Template resource permission entity from workspace
 */
type TemplateResourcePermissionEntity = {
  id: string;
  allowedActions: Record<string, unknown>;
  deniedActions?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  restrictions?: Record<string, unknown>;
  isActive: boolean;
  templateId?: string;
  resourceId?: string;
  contextId?: string;
};

/**
 * Step 6: Resource Permission Check Service
 * Validates that the user has permission to access the requested resource
 */
@Injectable()
export class Step6ResourcePermissionCheckService
  implements PermissionValidationStep
{
  readonly stepNumber = VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK];

  // Step configuration
  readonly isRequired = true;
  readonly canSkip = true; // Can skip for public resources
  readonly isAsync = true;
  readonly priority =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK]
      .priority;

  // Dependencies
  readonly dependsOn = [
    VALIDATION_STEPS.PRE_VALIDATION,
    VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
    VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
    VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK,
    VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION,
  ];
  readonly conflicts = undefined;

  private readonly logger = new Logger(
    Step6ResourcePermissionCheckService.name,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Get Permission Resource Repository for workspace
   */
  private async getPermissionResourceRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<ResourceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<ResourceEntity>(
      workspaceId,
      'mktPermissionResource',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get Data Access Policy Repository for workspace
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
   * Get Template Resource Permission Repository for workspace
   */
  private async getTemplateResourcePermissionRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<TemplateResourcePermissionEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<TemplateResourcePermissionEntity>(
      workspaceId,
      'mktTemplateResourcePermission',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Validate Step 6: Resource Permission Check
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step 6: ${this.stepName} - Starting resource permission check`,
      );

      // Validate prerequisites
      if (!context.userContext) {
        return {
          result: CheckResult.FAIL,
          reason: 'User context is required for resource permission check',
          continue: false,
          executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        };
      }

      if (!context.resourceContext) {
        return {
          result: CheckResult.FAIL,
          reason: 'Resource context is required for resource permission check',
          continue: false,
          executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        };
      }

      const workspaceId = context.userContext.workspaceId;

      // Step 1: Classify the resource
      const resourceClassification = await this.classifyResource(
        context.resourceContext.resourceType || '',
        context.resourceContext.recordId || '',
        workspaceId,
      );

      // Step 2: Check resource-specific permissions through policy-based evaluation
      const resourcePermissionEvaluation =
        await this.evaluateResourcePermissions(
          context.userContext,
          resourceClassification,
          context.action || '',
          workspaceId,
        );

      // Update context with resource permission information
      // Note: ResourceContext doesn't have permissions array, so we'll store in metadata instead
      // const permissionResult = {
      //   permission: resourcePermissionEvaluation.hasPermission
      //     ? 'ALLOW'
      //     : 'DENY',
      //   source: resourcePermissionEvaluation.source,
      //   level: resourcePermissionEvaluation.level,
      //   restrictions: resourcePermissionEvaluation.restrictions,
      // };

      // Update confidentiality level if not set
      if (!context.resourceContext.confidentialityLevel) {
        context.resourceContext.confidentialityLevel =
          resourceClassification.confidentialityLevel;
      }

      this.logger.debug(`Step 6: ${this.stepName} completed successfully`);

      const result = resourcePermissionEvaluation.hasPermission
        ? CheckResult.PASS
        : CheckResult.FAIL;

      return {
        result,
        reason: resourcePermissionEvaluation.hasPermission
          ? 'Resource permission check passed'
          : `Resource access denied: ${resourcePermissionEvaluation.restrictions.join(', ')}`,
        continue: resourcePermissionEvaluation.hasPermission,
        executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        metadata: {
          resourceType: resourceClassification.resourceType,
          resourceCategory: resourceClassification.resourceCategory,
          confidentialityLevel: resourceClassification.confidentialityLevel,
          source: resourcePermissionEvaluation.source,
          confidence: resourcePermissionEvaluation.confidence,
          appliedPolicies:
            resourcePermissionEvaluation.metadata.appliedPolicies.join(','),
          permissionGranted: resourcePermissionEvaluation.hasPermission,
          permissionSource: resourcePermissionEvaluation.source,
        },
      };
    } catch (error) {
      this.logger.error(`Step 6: ${this.stepName} failed: ${error.message}`);

      // For resource permission failures, we should not continue
      return {
        result: CheckResult.FAIL,
        reason: `Resource permission check failed: ${error.message}`,
        continue: false,
        executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        metadata: {
          error: error.message,
          fallbackMode: false,
        },
      };
    }
  }

  /**
   * Classify the resource based on its type and metadata
   */
  private async classifyResource(
    resourceType: string,
    _recordId: string,
    workspaceId: string,
  ): Promise<ResourceClassification> {
    try {
      const resourceRepository =
        await this.getPermissionResourceRepository(workspaceId);

      // Try to find the resource in the permission resources
      const resource = await resourceRepository.findOne({
        where: { resourceKey: resourceType, isActive: true },
      });

      if (resource) {
        return {
          resourceType: resource.resourceKey,
          resourceCategory: resource.resourceCategory || 'GENERAL',
          confidentialityLevel: this.determineConfidentialityLevel(resource),
          isSystemResource: resource.isSystemResource,
          isSensitiveData: this.isSensitiveResource(resource.resourceCategory),
          requiresSpecialAccess:
            resource.isSystemResource ||
            this.isSensitiveResource(resource.resourceCategory),
          minimumHierarchyLevel: this.getMinimumHierarchyLevel(
            resource.resourceCategory,
          ),
        };
      }

      // Fallback classification based on resource type
      return this.getFallbackResourceClassification(resourceType);
    } catch (error) {
      this.logger.error(`Error classifying resource: ${error.message}`);

      return this.getFallbackResourceClassification(resourceType);
    }
  }

  /**
   * Evaluate resource permissions through multiple sources
   */
  private async evaluateResourcePermissions(
    userContext: EnhancedUserContext,
    resourceClassification: ResourceClassification,
    action: string,
    workspaceId: string,
  ): Promise<ResourcePermissionEvaluation> {
    // Priority order: Data Access Policy -> Template Resource Permission -> System Default

    // 1. Check data access policies first (highest priority)
    const policyEvaluation = await this.checkDataAccessPolicies(
      userContext,
      resourceClassification,
      action,
      workspaceId,
    );

    if (policyEvaluation.hasPermission) {
      return policyEvaluation;
    }

    // 2. Check template resource permissions
    const templateEvaluation = await this.checkTemplateResourcePermissions(
      userContext,
      resourceClassification,
      action,
      workspaceId,
    );

    if (templateEvaluation.hasPermission) {
      return templateEvaluation;
    }

    // 3. Fall back to hierarchy-based system default
    return this.checkSystemDefaultPermissions(
      userContext,
      resourceClassification,
      action,
    );
  }

  /**
   * Check data access policies for resource permissions
   */
  private async checkDataAccessPolicies(
    userContext: EnhancedUserContext,
    resourceClassification: ResourceClassification,
    _action: string,
    workspaceId: string,
  ): Promise<ResourcePermissionEvaluation> {
    try {
      const policyRepository =
        await this.getDataAccessPolicyRepository(workspaceId);

      // Find applicable data access policies
      const policies = await policyRepository.find({
        where: [
          {
            objectName: resourceClassification.resourceType,
            isActive: true,
            specificMemberId: userContext.workspaceMemberId,
          },
          {
            objectName: resourceClassification.resourceType,
            isActive: true,
            departmentId: userContext.departmentId || undefined,
          },
          {
            objectName: resourceClassification.resourceType,
            isActive: true,
            organizationLevelId: userContext.organizationLevelId || undefined,
          },
          {
            objectName: resourceClassification.resourceType,
            isActive: true,
            specificMemberId: undefined,
            departmentId: undefined,
            organizationLevelId: undefined,
          },
        ],
        order: { priority: 'DESC' },
      });

      const appliedPolicies: string[] = [];

      // Check each policy for matches
      for (const policy of policies) {
        // Check hierarchy level requirements
        if (
          policy.minHierarchyLevel &&
          userContext.hierarchyLevel > policy.minHierarchyLevel
        ) {
          continue;
        }
        if (
          policy.maxHierarchyLevel &&
          userContext.hierarchyLevel < policy.maxHierarchyLevel
        ) {
          continue;
        }

        appliedPolicies.push(policy.id);

        // If we find a matching policy, grant access
        return {
          hasPermission: true,
          source: 'DATA_ACCESS_POLICY',
          level: this.determineLevelFromPolicy(policy),
          restrictions: this.extractRestrictionsFromPolicy(policy),
          confidence: 90,
          metadata: {
            appliedPolicies,
            resourceType: resourceClassification.resourceType,
            resourceCategory: resourceClassification.resourceCategory,
            hierarchyAccess: true,
          },
        };
      }

      // No applicable policies found
      return {
        hasPermission: false,
        source: 'DATA_ACCESS_POLICY',
        level: 'READ',
        restrictions: ['No applicable data access policy found'],
        confidence: 0,
        metadata: {
          appliedPolicies,
          resourceType: resourceClassification.resourceType,
          resourceCategory: resourceClassification.resourceCategory,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error checking data access policies: ${error.message}`,
      );

      return {
        hasPermission: false,
        source: 'DATA_ACCESS_POLICY',
        level: 'READ',
        restrictions: [`Policy check failed: ${error.message}`],
        confidence: 0,
        metadata: {
          appliedPolicies: [],
          resourceType: resourceClassification.resourceType,
          resourceCategory: resourceClassification.resourceCategory,
        },
      };
    }
  }

  /**
   * Check template resource permissions
   */
  private async checkTemplateResourcePermissions(
    userContext: EnhancedUserContext,
    resourceClassification: ResourceClassification,
    action: string,
    workspaceId: string,
  ): Promise<ResourcePermissionEvaluation> {
    try {
      const templateResourceRepository =
        await this.getTemplateResourcePermissionRepository(workspaceId);

      // Find template resource permissions through user's templates
      const templatePermissions = await templateResourceRepository.find({
        where: { isActive: true },
        // Note: We would need to join with user templates here, but for simplicity using basic query
      });

      for (const permission of templatePermissions) {
        const allowedActions = permission.allowedActions as Record<
          string,
          unknown
        >;
        const deniedActions = permission.deniedActions as Record<
          string,
          unknown
        >;

        // Check if action is explicitly denied
        if (deniedActions && this.isActionInList(action, deniedActions)) {
          continue;
        }

        // Check if action is explicitly allowed
        if (allowedActions && this.isActionInList(action, allowedActions)) {
          return {
            hasPermission: true,
            source: 'TEMPLATE_RESOURCE',
            level: this.determineLevelFromTemplatePermission(permission),
            restrictions:
              this.extractRestrictionsFromTemplatePermission(permission),
            confidence: 80,
            metadata: {
              appliedPolicies: [permission.id],
              resourceType: resourceClassification.resourceType,
              resourceCategory: resourceClassification.resourceCategory,
              resourceId: permission.resourceId,
            },
          };
        }
      }

      return {
        hasPermission: false,
        source: 'TEMPLATE_RESOURCE',
        level: 'READ',
        restrictions: ['No matching template resource permission found'],
        confidence: 0,
        metadata: {
          appliedPolicies: [],
          resourceType: resourceClassification.resourceType,
          resourceCategory: resourceClassification.resourceCategory,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error checking template resource permissions: ${error.message}`,
      );

      return {
        hasPermission: false,
        source: 'TEMPLATE_RESOURCE',
        level: 'READ',
        restrictions: [`Template permission check failed: ${error.message}`],
        confidence: 0,
        metadata: {
          appliedPolicies: [],
          resourceType: resourceClassification.resourceType,
          resourceCategory: resourceClassification.resourceCategory,
        },
      };
    }
  }

  /**
   * Check system default permissions based on hierarchy
   */
  private checkSystemDefaultPermissions(
    userContext: EnhancedUserContext,
    resourceClassification: ResourceClassification,
    _action: string,
  ): ResourcePermissionEvaluation {
    const hierarchyLevel = userContext.hierarchyLevel;
    const isSystemResource = resourceClassification.isSystemResource;
    const isSensitive = resourceClassification.isSensitiveData;

    // System resources require high hierarchy level
    if (isSystemResource && hierarchyLevel > 3) {
      return {
        hasPermission: false,
        source: 'SYSTEM_DEFAULT',
        level: 'READ',
        restrictions: [
          'System resource access requires higher hierarchy level',
        ],
        confidence: 95,
        metadata: {
          appliedPolicies: [],
          resourceType: resourceClassification.resourceType,
          resourceCategory: resourceClassification.resourceCategory,
          hierarchyAccess: false,
        },
      };
    }

    // Sensitive data requires specific hierarchy levels
    if (isSensitive && hierarchyLevel > 5) {
      return {
        hasPermission: false,
        source: 'SYSTEM_DEFAULT',
        level: 'READ',
        restrictions: ['Sensitive data access requires higher hierarchy level'],
        confidence: 90,
        metadata: {
          appliedPolicies: [],
          resourceType: resourceClassification.resourceType,
          resourceCategory: resourceClassification.resourceCategory,
          hierarchyAccess: false,
        },
      };
    }

    // Public resources are generally accessible
    if (resourceClassification.confidentialityLevel === 'PUBLIC') {
      return {
        hasPermission: true,
        source: 'SYSTEM_DEFAULT',
        level: 'READ',
        restrictions: [],
        confidence: 70,
        metadata: {
          appliedPolicies: [],
          resourceType: resourceClassification.resourceType,
          resourceCategory: resourceClassification.resourceCategory,
          confidentialityLevel: 'PUBLIC',
        },
      };
    }

    // Default allow for internal resources with basic hierarchy check
    const hasPermission = hierarchyLevel <= 8; // Allow up to level 8 (regular employees)

    return {
      hasPermission,
      source: 'SYSTEM_DEFAULT',
      level: 'READ',
      restrictions: hasPermission
        ? []
        : ['Insufficient hierarchy level for resource access'],
      confidence: 60,
      metadata: {
        appliedPolicies: [],
        resourceType: resourceClassification.resourceType,
        resourceCategory: resourceClassification.resourceCategory,
        hierarchyAccess: hasPermission,
      },
    };
  }

  /**
   * Determine confidentiality level from resource
   */
  private determineConfidentialityLevel(
    resource: ResourceEntity,
  ): 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' {
    if (resource.isSystemResource) {
      return 'RESTRICTED';
    }

    const category = resource.resourceCategory?.toLowerCase() || '';

    if (
      category.includes('financial') ||
      category.includes('payment') ||
      category.includes('salary')
    ) {
      return 'CONFIDENTIAL';
    }

    if (category.includes('internal') || category.includes('employee')) {
      return 'INTERNAL';
    }

    return 'PUBLIC';
  }

  /**
   * Check if resource is sensitive based on category
   */
  private isSensitiveResource(category: string): boolean {
    const sensitiveCategories = [
      'financial',
      'personal',
      'confidential',
      'system',
      'admin',
    ];
    const lowerCategory = category?.toLowerCase() || '';

    return sensitiveCategories.some((sensitive) =>
      lowerCategory.includes(sensitive),
    );
  }

  /**
   * Get minimum hierarchy level required for resource category
   */
  private getMinimumHierarchyLevel(category: string): number | undefined {
    const categoryLevels: Record<string, number> = {
      financial: 3,
      admin: 2,
      system: 2,
      management: 4,
      employee: 6,
      general: 8,
    };

    const lowerCategory = category?.toLowerCase() || '';

    return categoryLevels[lowerCategory] || undefined;
  }

  /**
   * Get fallback resource classification
   */
  private getFallbackResourceClassification(
    resourceType: string,
  ): ResourceClassification {
    return {
      resourceType,
      resourceCategory: 'GENERAL',
      confidentialityLevel: 'INTERNAL',
      isSystemResource: resourceType.toLowerCase().includes('system'),
      isSensitiveData: false,
      requiresSpecialAccess: false,
    };
  }

  /**
   * Determine permission level from policy
   */
  private determineLevelFromPolicy(
    policy: DataAccessPolicyEntity,
  ): 'READ' | 'WRITE' | 'DELETE' | 'ADMIN' {
    // Simple logic based on hierarchy level
    const conditions = policy.filterConditions as Record<string, unknown>;

    if (conditions.allowWrite) {
      return 'WRITE';
    }
    if (conditions.allowDelete) {
      return 'DELETE';
    }
    if (conditions.allowAdmin) {
      return 'ADMIN';
    }

    return 'READ';
  }

  /**
   * Extract restrictions from policy
   */
  private extractRestrictionsFromPolicy(
    policy: DataAccessPolicyEntity,
  ): string[] {
    const restrictions: string[] = [];
    const conditions = policy.filterConditions as Record<string, unknown>;

    if (conditions.timeRestriction) {
      restrictions.push('Time-based access restriction');
    }
    if (conditions.locationRestriction) {
      restrictions.push('Location-based access restriction');
    }
    if (conditions.departmentOnly) {
      restrictions.push('Department-only access');
    }

    return restrictions;
  }

  /**
   * Check if action is in the action list
   */
  private isActionInList(
    action: string,
    actionList: Record<string, unknown>,
  ): boolean {
    if (Array.isArray(actionList)) {
      return actionList.includes(action);
    }
    if (typeof actionList === 'object' && actionList !== null) {
      return (
        Object.keys(actionList).includes(action) ||
        Object.values(actionList).includes(action)
      );
    }

    return false;
  }

  /**
   * Determine level from template permission
   */
  private determineLevelFromTemplatePermission(
    permission: TemplateResourcePermissionEntity,
  ): 'READ' | 'WRITE' | 'DELETE' | 'ADMIN' {
    const allowedActions = permission.allowedActions as Record<string, unknown>;

    if (
      this.isActionInList('delete', allowedActions) ||
      this.isActionInList('DELETE', allowedActions)
    ) {
      return 'DELETE';
    }
    if (
      this.isActionInList('write', allowedActions) ||
      this.isActionInList('WRITE', allowedActions)
    ) {
      return 'WRITE';
    }
    if (
      this.isActionInList('admin', allowedActions) ||
      this.isActionInList('ADMIN', allowedActions)
    ) {
      return 'ADMIN';
    }

    return 'READ';
  }

  /**
   * Extract restrictions from template permission
   */
  private extractRestrictionsFromTemplatePermission(
    permission: TemplateResourcePermissionEntity,
  ): string[] {
    const restrictions: string[] = [];

    if (permission.restrictions) {
      const restrictionObj = permission.restrictions as Record<string, unknown>;

      Object.keys(restrictionObj).forEach((key) => {
        restrictions.push(`${key}: ${restrictionObj[key]}`);
      });
    }

    return restrictions;
  }

  /**
   * Determine if this step should execute based on context
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // Skip for public resources
    if (context.resourceContext?.confidentialityLevel === 'PUBLIC') {
      this.logger.debug('Step 6 skipped: Public resource access');

      return false;
    }

    // Skip if resource context is not available
    if (!context.resourceContext?.resourceType) {
      this.logger.debug('Step 6 skipped: No resource context available');

      return false;
    }

    return true;
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK]
      .estimatedExecutionTime;
  }
}
