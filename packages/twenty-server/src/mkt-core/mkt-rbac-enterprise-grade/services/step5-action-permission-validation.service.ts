/**
 * Step 5: Action Permission Validation Service
 * Validates specific action permissions based on workspace data and templates
 * Part of the 15-step Enterprise RBAC validation process
 * Uses workspace entities only, no core module dependencies
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  ActionPermissionContext,
  EnhancedPermissionContext,
  EnhancedUserContext,
  OrganizationalHierarchyContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  PermissionAction,
  VALIDATION_STEPS,
  STEP_PERFORMANCE_CONFIG,
  RESOURCE_TYPES,
  INCOMPATIBLE_COMBINATIONS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  VALIDATION_STEP_DESCRIPTIONS,
  VALIDATION_STEP_NAMES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import {
  MktPermissionTemplateWorkspaceEntity,
  MktUserPermissionTemplateWorkspaceEntity,
  MktUserPermissionOverrideWorkspaceEntity,
  MktPermissionActionWorkspaceEntity,
} from 'src/mkt-core/mkt-permission-template/entities';
import {
  RBAC_CACHE_KEYS,
  RBAC_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

import { HierarchyLevelService } from './hierarchy-level.service';
import { RbacCacheManagerService } from './rbac-cache-manager.service';

// Minimum priority threshold for granting elevated permissions
const MIN_ELEVATED_PERMISSION_PRIORITY = 500; // TEMPLATE:SYSTEM_DEFAULT minimum priority

/**
 * Action permission evaluation result
 */
type ActionPermissionEvaluation = {
  hasPermission: boolean;
  source: 'TEMPLATE_BASED' | 'USER_OVERRIDE' | 'HIERARCHY' | 'SYSTEM_DEFAULT';
  level: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';
  restrictions: string[];
  confidence: number;
  metadata: {
    appliedTemplates: string[];
    userOverrides: string[];
    hierarchyLevel?: number;
    isSystemAction?: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
};

/**
 * Action classification result
 */
type ActionClassification = {
  actionCategory:
    | 'BASIC_CRUD'
    | 'ADVANCED'
    | 'APPROVAL'
    | 'SYSTEM'
    | 'BULK_OPERATIONS'
    | 'TEAM_MANAGEMENT'
    | 'FINANCIAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresApproval: boolean;
  isSystemAction: boolean;
  isBulkOperation: boolean;
  isFinancialAction: boolean;
  isSensitiveAction: boolean;
  minimumHierarchyLevel?: number;
  requiredPermissions: string[];
};

/**
 * Step 5: Action Permission Validation Service
 * Validates that the user has permission to perform the requested action
 */
@Injectable()
export class Step5ActionPermissionValidationService
  implements PermissionValidationStep
{
  readonly stepNumber = VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION];

  // Step configuration
  readonly isRequired = true;
  readonly canSkip = true; // Can skip for read-only public resources
  readonly isAsync = true;
  readonly priority =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION]
      .priority;

  // Dependencies
  readonly dependsOn = [
    VALIDATION_STEPS.PRE_VALIDATION,
    VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
    VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
  ];
  readonly conflicts = undefined;

  private readonly logger = new Logger(
    Step5ActionPermissionValidationService.name,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly hierarchyLevelService: HierarchyLevelService,
    @Optional() private readonly cacheManager?: RbacCacheManagerService,
  ) {
    this.logger.log('Step 5: Action Permission Validation Service initialized');
  }

  /**
   * Get Permission Template Repository for workspace
   */
  private async getPermissionTemplateRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktPermissionTemplateWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionTemplateWorkspaceEntity>(
      workspaceId,
      'mktPermissionTemplate',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get User Permission Template Repository for workspace
   */
  private async getUserPermissionTemplateRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktUserPermissionTemplateWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktUserPermissionTemplateWorkspaceEntity>(
      workspaceId,
      'mktUserPermissionTemplate',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get User Permission Override Repository for workspace
   */
  private async getUserPermissionOverrideRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktUserPermissionOverrideWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktUserPermissionOverrideWorkspaceEntity>(
      workspaceId,
      'mktUserPermissionOverride',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get Permission Action Repository for workspace
   */
  private async getPermissionActionRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktPermissionActionWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionActionWorkspaceEntity>(
      workspaceId,
      'mktPermissionAction',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get Permission Action by actionKey with caching
   * Cache TTL: 24 hours (very stable data)
   */
  private async getPermissionActionByKey(
    workspaceId: string,
    actionKey: string,
  ): Promise<MktPermissionActionWorkspaceEntity | null> {
    try {
      const cacheKey = `${RBAC_CACHE_KEYS.CONFIG_ACTIONS}:${workspaceId}:${actionKey}`;

      // Try cache first
      let actionConfig: MktPermissionActionWorkspaceEntity | null = null;

      if (this.cacheManager) {
        actionConfig =
          await this.cacheManager.get<MktPermissionActionWorkspaceEntity>(
            cacheKey,
          );

        if (actionConfig) {
          this.logger.debug(
            `Cache HIT: Permission action ${actionKey} (Redis)`,
          );

          return actionConfig;
        }
      }

      // Load from DB if cache miss
      this.logger.debug(
        `Cache MISS: Loading permission action from DB for ${actionKey}`,
      );

      const actionRepository =
        await this.getPermissionActionRepository(workspaceId);

      actionConfig = await actionRepository.findOne({
        where: { actionKey, isActive: true },
      });

      // Cache for 24 hours (using centralized TTL constant)
      if (this.cacheManager && actionConfig) {
        await this.cacheManager.set(
          cacheKey,
          actionConfig,
          RBAC_CACHE_TTL.CONFIG_ACTIONS,
        );
        this.logger.debug(
          `Cache SET: Permission action ${actionKey} with 24h TTL`,
        );
      }

      return actionConfig;
    } catch (error) {
      this.logger.error(
        `Error getting permission action ${actionKey}: ${error.message}`,
      );

      return null;
    }
  }

  /**
   * Get all active Permission Actions with caching
   * Cache TTL: 24 hours (very stable data)
   */
  private async getAllPermissionActions(
    workspaceId: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    try {
      const cacheKey = `${RBAC_CACHE_KEYS.CONFIG_ACTIONS}:${workspaceId}:all`;

      // Try cache first
      let actions: MktPermissionActionWorkspaceEntity[] | null = null;

      if (this.cacheManager) {
        actions =
          await this.cacheManager.get<MktPermissionActionWorkspaceEntity[]>(
            cacheKey,
          );

        if (actions) {
          this.logger.debug(
            `Cache HIT: All permission actions (${actions.length} items) (Redis)`,
          );

          return actions;
        }
      }

      // Load from DB if cache miss
      this.logger.debug(`Cache MISS: Loading all permission actions from DB`);

      const actionRepository =
        await this.getPermissionActionRepository(workspaceId);

      actions = await actionRepository.find({
        where: { isActive: true },
        order: { position: 'ASC' },
      });

      // Cache for 24 hours (using centralized TTL constant)
      if (this.cacheManager && actions) {
        await this.cacheManager.set(
          cacheKey,
          actions,
          RBAC_CACHE_TTL.CONFIG_ACTIONS,
        );
        this.logger.debug(
          `Cache SET: All permission actions (${actions.length} items) with 24h TTL`,
        );
      }

      return actions;
    } catch (error) {
      this.logger.error(
        `Error getting all permission actions: ${error.message}`,
      );

      return [];
    }
  }

  /**
   * Validate action permissions for the given context
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step 5: ${this.stepName} - Validating action permission: ${context.action} on ${context.resourceContext.objectName}`,
      );

      // Validate prerequisites
      if (!context.userContext) {
        return {
          result: CheckResult.FAIL,
          reason: 'User context is required for action permission validation',
          continue: false,
          executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        };
      }

      if (!context.resourceContext) {
        return {
          result: CheckResult.FAIL,
          reason:
            'Resource context is required for action permission validation',
          continue: false,
          executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        };
      }

      // Step 5.1: Classify the action
      const actionClassification = await this.classifyAction(
        context.userContext.workspaceId,
        context,
      );

      // Step 5.2: Check resource-action compatibility
      const compatibilityCheck = this.checkResourceActionCompatibility(
        context.resourceContext.resourceType,
        context.action,
      );

      if (!compatibilityCheck.isCompatible) {
        return this.createFailResult(
          `Action ${context.action} is not allowed on resource type ${context.resourceContext.resourceType}: ${compatibilityCheck.reason}`,
          DateTime.now().diff(stepStartTime).as('milliseconds'),
        );
      }

      // Step 5.3: Evaluate action permissions using workspace data
      const permissionEvaluation = await this.evaluateActionPermissions(
        context,
        actionClassification,
      );

      if (!permissionEvaluation.hasPermission) {
        return this.createFailResult(
          `Insufficient permissions for action ${context.action}. Required: ${actionClassification.requiredPermissions.join(', ')}`,
          DateTime.now().diff(stepStartTime).as('milliseconds'),
        );
      }

      // Step 5.4: Create action permission context for next steps
      const actionPermissionContext: ActionPermissionContext = {
        actionType: context.action,
        actionCategory: actionClassification.actionCategory,
        riskLevel: actionClassification.riskLevel,
        requiresApproval: actionClassification.requiresApproval,
        isSystemAction: actionClassification.isSystemAction,
        isBulkOperation: actionClassification.isBulkOperation,
        isFinancialAction: actionClassification.isFinancialAction,
        isSensitiveAction: actionClassification.isSensitiveAction,
        constraints: {
          requiredLevel: actionClassification.minimumHierarchyLevel,
        },
      };
      const executionTime = DateTime.now()
        .diff(stepStartTime)
        .as('milliseconds');

      this.logger.debug(
        `Step 5: Action permission validation passed for ${context.action} in ${executionTime}ms`,
      );

      return {
        result: CheckResult.PASS,
        reason: `Action ${context.action} is permitted with ${permissionEvaluation.source} permission`,
        continue: true,
        executionTime,
        stepData: {
          actionClassification,
          permissionEvaluation,
          appliedTemplates: permissionEvaluation.metadata.appliedTemplates,
          riskLevel: actionClassification.riskLevel,
          confidence: permissionEvaluation.confidence,
        },
        modifyContext: {
          actionContext: actionPermissionContext,
        },
      };
    } catch (error) {
      const executionTime = DateTime.now()
        .diff(stepStartTime)
        .as('milliseconds');

      this.logger.error(
        `Step 5: ${this.stepName} failed: ${error.message}`,
        error.stack,
      );

      return {
        result: CheckResult.ERROR,
        reason: `Action permission validation error: ${error.message}`,
        continue: false,
        executionTime,
        errors: [error.message],
      };
    }
  }

  /**
   * Check if this step should execute based on context
   * Implements conditional skip logic as per enterprise-rbac-guard-guide.md
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // Check if read access to public resources
    if (this.isReadAccessToPublicResource(context)) {
      this.logger.debug('Step 5 skipped: Read access to public resource');

      return false;
    }

    // Check if system maintenance operations
    if (this.isSystemMaintenanceOperation(context)) {
      this.logger.debug('Step 5 skipped: System maintenance operation');

      return false;
    }

    return !context.skipSteps?.includes(this.stepNumber);
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return STEP_PERFORMANCE_CONFIG[
      VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION
    ].estimatedExecutionTime;
  }

  /**
   * Classify the action to determine its properties and requirements
   * Now uses dynamic hierarchy levels from database instead of hardcoded values
   */
  private async classifyAction(
    workspaceId: string,
    context: EnhancedPermissionContext,
  ): Promise<ActionClassification> {
    const action = context.action;
    const resourceType = context.resourceContext.resourceType;

    // Try cache first - action classifications are static
    const cacheKey = `${RBAC_CACHE_KEYS.ACTION_VALIDATION}:classification:${action}:${resourceType}`;

    if (this.cacheManager) {
      const cachedClassification =
        await this.cacheManager.get<ActionClassification>(cacheKey);

      if (cachedClassification) {
        this.logger.debug(
          `Cache HIT: Action classification for ${action}:${resourceType} (Redis)`,
        );

        return cachedClassification;
      }
    }

    this.logger.debug(
      `Cache MISS: Computing action classification for ${action}:${resourceType}`,
    );

    const isFinancialResource =
      context.resourceContext.resourceType === RESOURCE_TYPES.FINANCIAL;
    const isSystemResource =
      context.resourceContext.resourceType === RESOURCE_TYPES.SYSTEM_CONFIG;

    // Compute classification
    let classification: ActionClassification;

    // Basic CRUD actions
    switch (action) {
      case PermissionAction.READ:
        classification = {
          actionCategory: 'BASIC_CRUD',
          riskLevel: isFinancialResource ? 'MEDIUM' : 'LOW',
          requiresApproval: false,
          isSystemAction: isSystemResource,
          isBulkOperation: false,
          isFinancialAction: isFinancialResource,
          isSensitiveAction:
            isFinancialResource || context.resourceContext.isSensitive || false,
          minimumHierarchyLevel: isFinancialResource
            ? await this.hierarchyLevelService.getMinimumHierarchyLevel(
                workspaceId,
                'MEDIUM',
                'BASIC_CRUD',
              )
            : undefined,
          requiredPermissions: ['read'],
        };
        break;

      case PermissionAction.CREATE:
      case PermissionAction.UPDATE:
        classification = {
          actionCategory: 'BASIC_CRUD',
          riskLevel: isFinancialResource ? 'HIGH' : 'MEDIUM',
          requiresApproval: isFinancialResource,
          isSystemAction: isSystemResource,
          isBulkOperation: false,
          isFinancialAction: isFinancialResource,
          isSensitiveAction: isFinancialResource,
          minimumHierarchyLevel: isFinancialResource
            ? await this.hierarchyLevelService.getMinimumHierarchyLevel(
                workspaceId,
                'HIGH',
                'BASIC_CRUD',
              )
            : undefined,
          requiredPermissions: ['write', 'update'],
        };
        break;

      case PermissionAction.DELETE:
        classification = {
          actionCategory: 'BASIC_CRUD',
          riskLevel: isFinancialResource ? 'CRITICAL' : 'HIGH',
          requiresApproval: true,
          isSystemAction: isSystemResource,
          isBulkOperation: false,
          isFinancialAction: isFinancialResource,
          isSensitiveAction: true,
          minimumHierarchyLevel: isFinancialResource
            ? await this.hierarchyLevelService.getMinimumHierarchyLevel(
                workspaceId,
                'CRITICAL',
                'BASIC_CRUD',
              )
            : await this.hierarchyLevelService.getMinimumHierarchyLevel(
                workspaceId,
                'MEDIUM',
                'BASIC_CRUD',
              ),
          requiredPermissions: ['delete'],
        };
        break;

      // Financial actions
      case PermissionAction.ACCESS_SALARY_DATA:
      case PermissionAction.APPROVE_TRANSACTIONS:
      case PermissionAction.VIEW_FINANCIAL_REPORTS:
      case PermissionAction.BUDGET_MANAGEMENT:
        classification = {
          actionCategory: 'FINANCIAL',
          riskLevel: 'CRITICAL',
          requiresApproval: true,
          isSystemAction: false,
          isBulkOperation: false,
          isFinancialAction: true,
          isSensitiveAction: true,
          minimumHierarchyLevel:
            action === PermissionAction.BUDGET_MANAGEMENT
              ? await this.hierarchyLevelService.getMinimumHierarchyLevel(
                  workspaceId,
                  'CRITICAL',
                  'FINANCIAL',
                )
              : await this.hierarchyLevelService.getMinimumHierarchyLevel(
                  workspaceId,
                  'HIGH',
                  'FINANCIAL',
                ),
          requiredPermissions: ['financial_access'],
        };
        break;

      // System actions
      case PermissionAction.CONFIGURE:
      case PermissionAction.MONITOR:
      case PermissionAction.AUDIT:
        classification = {
          actionCategory: 'SYSTEM',
          riskLevel: 'CRITICAL',
          requiresApproval: true,
          isSystemAction: true,
          isBulkOperation: false,
          isFinancialAction: false,
          isSensitiveAction: true,
          minimumHierarchyLevel:
            await this.hierarchyLevelService.getMinimumHierarchyLevel(
              workspaceId,
              'CRITICAL',
              'SYSTEM',
            ),
          requiredPermissions: ['system_admin'],
        };
        break;

      // Bulk operations
      case PermissionAction.BULK_CREATE:
      case PermissionAction.BULK_UPDATE:
      case PermissionAction.BULK_DELETE:
      case PermissionAction.BULK_EXPORT:
        classification = {
          actionCategory: 'BULK_OPERATIONS',
          riskLevel: 'HIGH',
          requiresApproval: true,
          isSystemAction: false,
          isBulkOperation: true,
          isFinancialAction: isFinancialResource,
          isSensitiveAction: true,
          minimumHierarchyLevel:
            await this.hierarchyLevelService.getMinimumHierarchyLevel(
              workspaceId,
              'MEDIUM',
              'BULK_OPERATIONS',
            ),
          requiredPermissions: ['bulk_operations'],
        };
        break;

      // Default classification
      default:
        classification = {
          actionCategory: 'ADVANCED',
          riskLevel: 'MEDIUM',
          requiresApproval: true,
          isSystemAction: false,
          isBulkOperation: false,
          isFinancialAction: isFinancialResource,
          isSensitiveAction: false,
          minimumHierarchyLevel:
            await this.hierarchyLevelService.getMinimumHierarchyLevel(
              workspaceId,
              'MEDIUM',
              'ADVANCED',
            ),
          requiredPermissions: ['general_access'],
        };
        break;
    }

    // Cache the classification result (using centralized TTL constant - static data)
    if (this.cacheManager && classification) {
      await this.cacheManager.set(
        cacheKey,
        classification,
        RBAC_CACHE_TTL.ACTION_CHECK,
      );
      this.logger.debug(
        `Cache SET: Action classification for ${action}:${resourceType} with ACTION_CHECK TTL`,
      );
    }

    return classification;
  }

  /**
   * Check if resource type and action are compatible
   */
  private checkResourceActionCompatibility(
    resourceType: keyof typeof RESOURCE_TYPES,
    action: PermissionAction,
  ): { isCompatible: boolean; reason?: string } {
    const incompatible = INCOMPATIBLE_COMBINATIONS.find(
      (combo) =>
        combo.resourceType === resourceType &&
        combo.forbiddenActions.includes(action),
    );

    if (incompatible) {
      return {
        isCompatible: false,
        reason: incompatible.reason,
      };
    }

    return { isCompatible: true };
  }

  /**
   * Evaluate action permissions using workspace permission templates and user overrides
   */
  private async evaluateActionPermissions(
    context: EnhancedPermissionContext,
    actionClassification: ActionClassification,
  ): Promise<ActionPermissionEvaluation> {
    const { userContext, hierarchyContext } = context;

    const workspaceId = userContext.workspaceId;
    const userId = userContext.id;

    try {
      // Check user-specific permission overrides first
      const userOverridePermission = await this.checkUserPermissionOverrides(
        workspaceId,
        userId || '',
        actionClassification,
      );

      if (userOverridePermission.hasPermission) {
        return userOverridePermission;
      }

      // Check permission templates based on user context
      const templatePermission = await this.checkPermissionTemplates(
        workspaceId,
        userContext,
        actionClassification,
      );

      if (templatePermission.hasPermission) {
        return templatePermission;
      }

      // Check hierarchy-based permissions as fallback
      const hierarchyPermission = this.checkHierarchyBasedPermissions(
        userContext,
        actionClassification,
        hierarchyContext,
      );

      if (hierarchyPermission.hasPermission) {
        return hierarchyPermission;
      }

      // No permissions found - return system default
      return {
        hasPermission: false,
        source: 'SYSTEM_DEFAULT',
        level: 'READ',
        restrictions: ['No matching permissions found'],
        confidence: 0,
        metadata: {
          appliedTemplates: [],
          userOverrides: [],
          hierarchyLevel: userContext.hierarchyLevel,
          riskLevel: actionClassification.riskLevel,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error evaluating action permissions: ${error.message}`,
        error.stack,
      );

      return {
        hasPermission: false,
        source: 'SYSTEM_DEFAULT',
        level: 'READ',
        restrictions: [`Permission evaluation error: ${error.message}`],
        confidence: 0,
        metadata: {
          appliedTemplates: [],
          userOverrides: [],
          riskLevel: actionClassification.riskLevel,
        },
      };
    }
  }

  /**
   * Check user-specific permission overrides
   */
  private async checkUserPermissionOverrides(
    workspaceId: string,
    userId: string,
    actionClassification: ActionClassification,
  ): Promise<ActionPermissionEvaluation> {
    if (!userId) {
      return {
        hasPermission: false,
        source: 'USER_OVERRIDE',
        level: 'READ',
        restrictions: ['No user ID provided'],
        confidence: 0,
        metadata: {
          appliedTemplates: [],
          userOverrides: [],
          riskLevel: actionClassification.riskLevel,
        },
      };
    }

    try {
      const userOverrideRepository =
        await this.getUserPermissionOverrideRepository(workspaceId);

      // Find active user overrides for this user
      const userOverrides = await userOverrideRepository.find({
        where: {
          workspaceMember: { userId },
          isActive: true,
        },
      });

      // For simplicity, if user has any active overrides, grant permission
      if (userOverrides.length > 0) {
        return {
          hasPermission: true,
          source: 'USER_OVERRIDE',
          level: 'ADMIN', // Overrides typically grant elevated permissions
          restrictions: [],
          confidence: 95,
          metadata: {
            appliedTemplates: [],
            userOverrides: userOverrides.map((o) => o.id),
            riskLevel: actionClassification.riskLevel,
          },
        };
      }

      return {
        hasPermission: false,
        source: 'USER_OVERRIDE',
        level: 'READ',
        restrictions: ['No active user overrides found'],
        confidence: 0,
        metadata: {
          appliedTemplates: [],
          userOverrides: [],
          riskLevel: actionClassification.riskLevel,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error checking user permission overrides: ${error.message}`,
        error.stack,
      );

      return {
        hasPermission: false,
        source: 'USER_OVERRIDE',
        level: 'READ',
        restrictions: [`User override check error: ${error.message}`],
        confidence: 0,
        metadata: {
          appliedTemplates: [],
          userOverrides: [],
          riskLevel: actionClassification.riskLevel,
        },
      };
    }
  }

  /**
   * Check permission templates for user permissions
   */
  private async checkPermissionTemplates(
    workspaceId: string,
    userContext: EnhancedUserContext,
    actionClassification: ActionClassification,
  ): Promise<ActionPermissionEvaluation> {
    try {
      const userTemplateRepository =
        await this.getUserPermissionTemplateRepository(workspaceId);

      this.logger.debug(
        `Checking templates for user: ${userContext.id}, workspaceMemberId: ${userContext.workspaceMemberId || 'N/A'}`,
      );

      // Get user's assigned templates
      // Use workspaceMemberId if available, otherwise query via userId
      const whereClause = userContext.workspaceMemberId
        ? { workspaceMemberId: userContext.workspaceMemberId, isActive: true }
        : { workspaceMember: { userId: userContext.id }, isActive: true };

      const userTemplateAssignments = await userTemplateRepository.find({
        where: whereClause,
        relations: ['template'],
      });

      this.logger.debug(
        `Found ${userTemplateAssignments.length} template assignments for user`,
      );

      if (userTemplateAssignments.length === 0) {
        this.logger.warn(
          `No templates found for user - whereClause: ${JSON.stringify(whereClause)}`,
        );
      }

      const appliedTemplates: string[] = [];

      // Check each assigned template for matching permissions
      for (const assignment of userTemplateAssignments) {
        if (assignment.template && assignment.template.isActive) {
          const template = assignment.template;

          appliedTemplates.push(template.id);

          this.logger.debug(
            `Checking template: ${template.templateName || template.id} - priority: ${template.priority}, isSystem: ${template.isSystemTemplate}`,
          );

          // For system templates or high priority templates, grant permission
          // High priority = >= 500 (TEMPLATE:SYSTEM_DEFAULT baseline)
          if (
            template.isSystemTemplate ||
            template.priority >= MIN_ELEVATED_PERMISSION_PRIORITY
          ) {
            this.logger.debug(
              `Template ${template.templateName || template.id} grants permission - returning PASS`,
            );

            return {
              hasPermission: true,
              source: 'TEMPLATE_BASED',
              level: template.isSystemTemplate ? 'ADMIN' : 'WRITE',
              restrictions: [],
              confidence: 85,
              metadata: {
                appliedTemplates: [template.id],
                userOverrides: [],
                hierarchyLevel: userContext.hierarchyLevel,
                riskLevel: actionClassification.riskLevel,
              },
            };
          }
        }
      }

      // No matching high-priority templates found
      // Do NOT grant basic permission - defer to hierarchy check
      return {
        hasPermission: false,
        source: 'TEMPLATE_BASED',
        level: 'READ',
        restrictions:
          appliedTemplates.length === 0
            ? ['No permission templates assigned']
            : [
                'User templates do not meet minimum priority requirements for this action',
              ],
        confidence: 0,
        metadata: {
          appliedTemplates,
          userOverrides: [],
          hierarchyLevel: userContext.hierarchyLevel,
          riskLevel: actionClassification.riskLevel,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error checking permission templates: ${error.message}`,
        error.stack,
      );

      return {
        hasPermission: false,
        source: 'TEMPLATE_BASED',
        level: 'READ',
        restrictions: [`Template check error: ${error.message}`],
        confidence: 0,
        metadata: {
          appliedTemplates: [],
          userOverrides: [],
          riskLevel: actionClassification.riskLevel,
        },
      };
    }
  }

  /**
   * Check hierarchy-based permissions as fallback
   */
  private checkHierarchyBasedPermissions(
    userContext: EnhancedUserContext,
    actionClassification: ActionClassification,
    hierarchyContext?: OrganizationalHierarchyContext,
  ): ActionPermissionEvaluation {
    // If no hierarchy level is set, deny access
    if (!hierarchyContext || hierarchyContext.userLevel === undefined) {
      return {
        hasPermission: false,
        source: 'HIERARCHY',
        level: 'READ',
        restrictions: ['User hierarchy level not defined'],
        confidence: 0,
        metadata: {
          appliedTemplates: [],
          userOverrides: [],
          hierarchyLevel: userContext.hierarchyLevel,
          riskLevel: actionClassification.riskLevel,
        },
      };
    }

    // If action doesn't require minimum hierarchy level, allow
    if (!actionClassification.minimumHierarchyLevel) {
      return {
        hasPermission: true,
        source: 'HIERARCHY',
        level: 'READ',
        restrictions: [],
        confidence: 70,
        metadata: {
          appliedTemplates: [],
          userOverrides: [],
          hierarchyLevel: userContext.hierarchyLevel,
          riskLevel: actionClassification.riskLevel,
        },
      };
    }

    // Check if user hierarchy level is sufficient (lower number = higher level)
    const hasPermission =
      userContext.hierarchyLevel <= actionClassification.minimumHierarchyLevel;

    return {
      hasPermission,
      source: 'HIERARCHY',
      level: hasPermission ? 'WRITE' : 'READ',
      restrictions: hasPermission
        ? []
        : [
            `Requires hierarchy level ${actionClassification.minimumHierarchyLevel} or higher`,
          ],
      confidence: hasPermission ? 75 : 0,
      metadata: {
        appliedTemplates: [],
        userOverrides: [],
        hierarchyLevel: userContext.hierarchyLevel,
        riskLevel: actionClassification.riskLevel,
      },
    };
  }

  /**
   * Helper methods for skip logic
   */
  private isReadAccessToPublicResource(
    context: EnhancedPermissionContext,
  ): boolean {
    return (
      context.action === PermissionAction.READ &&
      context.resourceContext?.confidentialityLevel === 'PUBLIC'
    );
  }

  private isSystemMaintenanceOperation(
    context: EnhancedPermissionContext,
  ): boolean {
    const action = context.action;

    return Boolean(
      action?.includes('SYSTEM_') ||
        action?.includes('MAINTENANCE_') ||
        action?.includes('MONITOR'),
    );
  }

  /**
   * Create a failure result
   */
  private createFailResult(
    reason: string,
    executionTime: number,
    stepData?: Record<string, unknown>,
  ): StepValidationResult {
    return {
      result: CheckResult.FAIL,
      reason,
      continue: false,
      executionTime,
      stepData,
      errors: [reason],
    };
  }
}
