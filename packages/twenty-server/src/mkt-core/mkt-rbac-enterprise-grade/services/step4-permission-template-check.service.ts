/**
 * Permission Template Check Service (Step 4)
 * Resolves applicable permission templates based on user role and hierarchy
 * Based on existing service patterns and Twenty.com database architecture
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  PermissionTemplateInterface,
  TemplateCondition,
  TemplateRestriction,
  TemplateConflict,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  STEP_PERFORMANCE_CONFIG,
  VALIDATION_STEPS,
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
  MktPermissionPriorityConfigWorkspaceEntity,
} from 'src/mkt-core/mkt-permission-template/entities';
import { RbacCacheManagerService } from 'src/mkt-core/mkt-rbac-enterprise-grade/services/rbac-cache-manager.service';
import {
  RBAC_CACHE_KEYS,
  RBAC_CACHE_TTL,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

interface DepartmentInfo {
  parentDepartmentId?: string;
}

// Union types for template property access
type TemplateResourcePermissionProperty = {
  permissionType?: string;
  permission?: string;
  resourceType?: string;
  resource?: string;
};

type TemplateSystemActionProperty = {
  actionType?: string;
  action?: string;
};

type TemplateAccessLimitationProperty = {
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  limitationType?: string;
  limitationValue?: object | string | number;
};

/**
 * Permission Template Check Service - Step 4 in the 15-step validation process
 */
@Injectable()
export class Step4PermissionTemplateCheckService
  implements PermissionValidationStep
{
  private readonly logger = new Logger(
    Step4PermissionTemplateCheckService.name,
  );

  // Step identification
  readonly stepNumber = VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK];

  // Step configuration
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]
      .priority;

  // Dependencies
  readonly dependsOn = [
    VALIDATION_STEPS.PRE_VALIDATION,
    VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
    VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
  ];
  readonly conflicts = undefined;

  // Performance configuration - keeping for potential future use
  // private readonly timeout =
  //   STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]
  //     .maxExecutionTime;
  // private readonly cacheExpirationTime =
  //   STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]
  //     .cacheExpirationTime || 300000;
  // private readonly maxConcurrentChecks = 10;
  // private readonly retryAttempts =
  //   STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]
  //     .retryAttempts;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @Optional() private readonly cacheManager?: RbacCacheManagerService,
  ) {}

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
   * Get Permission Priority Config Repository for workspace
   */
  private async getPermissionPriorityConfigRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktPermissionPriorityConfigWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionPriorityConfigWorkspaceEntity>(
      workspaceId,
      'mktPermissionPriorityConfig',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get priority from config based on source type and subtype
   * Now uses RbacCacheManagerService for better performance
   */
  private async getPriorityFromConfig(
    workspaceId: string,
    sourceType: 'TEMPLATE' | 'OVERRIDE' | 'POLICY',
    sourceSubType: string,
    metadata?: {
      hierarchyLevel?: number;
      minHierarchyLevel?: number;
      departmentId?: string;
      isSystemTemplate?: boolean;
      isDefaultTemplate?: boolean;
      reason?: string;
      isAllowed?: boolean;
      filterRules?: object;
    },
  ): Promise<number> {
    try {
      const cacheKey = `${RBAC_CACHE_KEYS.CONFIG_PRIORITY}:${workspaceId}:${sourceType}:${sourceSubType}`;

      // Try cache first
      let config: MktPermissionPriorityConfigWorkspaceEntity | null = null;

      if (this.cacheManager) {
        config =
          await this.cacheManager.get<MktPermissionPriorityConfigWorkspaceEntity>(
            cacheKey,
          );

        if (config) {
          this.logger.debug(
            `Cache HIT: Priority config ${sourceType}:${sourceSubType} (Redis)`,
          );
        }
      }

      // Load from DB if cache miss
      if (!config) {
        this.logger.debug(
          `Cache MISS: Loading priority config from DB for ${sourceType}:${sourceSubType}`,
        );

        config = await this.loadPriorityConfigFromDB(
          workspaceId,
          sourceType,
          sourceSubType,
        );

        // Cache for 6 hours (using centralized TTL constant)
        if (this.cacheManager && config) {
          await this.cacheManager.set(
            cacheKey,
            config,
            RBAC_CACHE_TTL.CONFIG_PRIORITY,
          );
          this.logger.debug(
            `Cache SET: Priority config ${sourceType}:${sourceSubType} with 6h TTL`,
          );
        }
      }

      if (!config) {
        this.logger.warn(
          `No priority config found for ${sourceType}:${sourceSubType}, using default`,
        );

        // Default fallback priorities
        const defaultPriorities = {
          OVERRIDE: 5000,
          TEMPLATE: 800,
          POLICY: 80,
        };

        return defaultPriorities[sourceType] || 100;
      }

      // Check if conditions match
      if (config.conditions && metadata) {
        const conditionsMatch = this.checkConditionsMatch(
          config.conditions as Record<string, unknown>,
          metadata,
        );

        if (!conditionsMatch) {
          this.logger.debug(
            `Conditions don't match for config ${config.id}, using base priority`,
          );

          return config.basePriority;
        }
      }

      // Calculate priority using formula
      const calculatedPriority = this.evaluatePriorityFormula(
        config.priorityFormula || 'basePriority',
        {
          basePriority: config.basePriority,
          priorityBoost: config.priorityBoost || 0,
          hierarchyLevel: metadata?.hierarchyLevel,
          minHierarchyLevel: metadata?.minHierarchyLevel,
        },
      );

      // Apply min/max constraints
      const finalPriority = Math.max(
        config.minPriority || 0,
        Math.min(config.maxPriority || 999999, calculatedPriority),
      );

      this.logger.debug(
        `Priority calculated for ${sourceType}:${sourceSubType} = ${finalPriority}`,
      );

      return finalPriority;
    } catch (error) {
      this.logger.error(`Error getting priority from config: ${error.message}`);

      // Fallback to default priorities
      const defaultPriorities = {
        OVERRIDE: 5000,
        TEMPLATE: 800,
        POLICY: 80,
      };

      return defaultPriorities[sourceType] || 100;
    }
  }

  /**
   * Load priority config directly from database (fallback when cache is unavailable)
   */
  private async loadPriorityConfigFromDB(
    workspaceId: string,
    sourceType: 'TEMPLATE' | 'OVERRIDE' | 'POLICY',
    sourceSubType: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity | null> {
    const configRepository =
      await this.getPermissionPriorityConfigRepository(workspaceId);

    return await configRepository.findOne({
      where: {
        sourceType,
        sourceSubType,
        isActive: true,
      },
    });
  }

  /**
   * Check if conditions match metadata
   */
  private checkConditionsMatch(
    conditions: Record<string, unknown>,
    metadata: Record<string, unknown>,
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      const metadataValue = metadata[key];

      // Handle array values (e.g., reason: ['COMPLIANCE_REQUIREMENT', 'AUDIT_REQUIREMENT'])
      if (Array.isArray(value)) {
        if (!value.includes(metadataValue)) {
          return false;
        }
      }
      // Handle object values (e.g., hierarchyLevel: { $gte: 1, $lte: 10 })
      else if (typeof value === 'object' && value !== null) {
        const objValue = value as Record<string, unknown>;
        const numericMetadataValue =
          typeof metadataValue === 'number' ? metadataValue : 0;

        if (
          objValue.$gte !== undefined &&
          objValue.$gte !== null &&
          numericMetadataValue < (objValue.$gte as number)
        ) {
          return false;
        }

        if (
          objValue.$lte !== undefined &&
          objValue.$lte !== null &&
          numericMetadataValue > (objValue.$lte as number)
        ) {
          return false;
        }

        if (objValue.$exists !== undefined) {
          const exists = metadataValue !== undefined && metadataValue !== null;

          if (exists !== objValue.$exists) {
            return false;
          }
        }
      }
      // Handle simple equality
      else if (metadataValue !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate priority formula with provided variables
   */
  private evaluatePriorityFormula(
    formula: string,
    variables: {
      basePriority: number;
      priorityBoost: number;
      hierarchyLevel?: number;
      minHierarchyLevel?: number;
    },
  ): number {
    try {
      // Handle common formula patterns
      if (formula === 'basePriority') {
        return variables.basePriority;
      }

      if (
        formula === 'basePriority + (priorityBoost * (10 - hierarchyLevel))' &&
        variables.hierarchyLevel !== undefined
      ) {
        return (
          variables.basePriority +
          variables.priorityBoost * (10 - variables.hierarchyLevel)
        );
      }

      if (
        formula ===
          'basePriority + (priorityBoost * (10 - minHierarchyLevel))' &&
        variables.minHierarchyLevel !== undefined
      ) {
        return (
          variables.basePriority +
          variables.priorityBoost * (10 - variables.minHierarchyLevel)
        );
      }

      // Fallback to base priority if formula not recognized
      this.logger.warn(
        `Unknown formula: ${formula}, using basePriority as fallback`,
      );

      return variables.basePriority;
    } catch (error) {
      this.logger.error(`Error evaluating formula: ${error.message}`);

      return variables.basePriority;
    }
  }

  /**
   * Validate Step 4: Permission Template Check
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step 4: ${this.stepName} - Starting permission template check`,
      );

      // Validate prerequisites
      if (!context.userContext) {
        return {
          result: CheckResult.FAIL,
          reason: 'User context is required for permission template check',
          continue: false,
          executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        };
      }

      if (!context.resourceContext) {
        return {
          result: CheckResult.FAIL,
          reason: 'Resource context is required for permission template check',
          continue: false,
          executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        };
      }

      // Get workspace repositories for permission templates
      const workspaceId = context.userContext.workspaceId;
      const workspaceMemberId = context.userContext.workspaceMemberId;

      // Try cache first for user's template assignments
      const cacheKey = `${RBAC_CACHE_KEYS.TEMPLATE_PERMISSIONS}:user:${workspaceMemberId}`;

      if (this.cacheManager) {
        const cachedTemplateContext =
          await this.cacheManager.get<typeof context.templateContext>(cacheKey);

        if (cachedTemplateContext) {
          this.logger.debug(
            `Cache HIT: Template context for ${workspaceMemberId} (Redis)`,
          );

          // Update context with cached template information
          context.templateContext = {
            ...cachedTemplateContext,
            lastUpdated: DateTime.now().toJSDate(),
          };

          return {
            result: CheckResult.PASS,
            reason: 'Permission template check completed from cache',
            continue: true,
            executionTime: DateTime.now()
              .diff(stepStartTime)
              .as('milliseconds'),
            metadata: {
              templatesFound:
                cachedTemplateContext.applicableTemplates?.length || 0,
              conflicts: cachedTemplateContext.templateConflicts?.length || 0,
              applicabilityScore: cachedTemplateContext.applicabilityScore || 0,
              primaryTemplateType: this.getPrimaryTemplateType(
                cachedTemplateContext.applicableTemplates || [],
              ),
              source: 'CACHE',
            },
          };
        }
      }

      this.logger.debug(
        `Cache MISS: Loading templates from database for ${workspaceMemberId}`,
      );

      // Resolve applicable permission templates
      const permissionTemplateContext = await this.resolvePermissionTemplates(
        context,
        workspaceId,
      );

      // Apply template hierarchy and conflicts resolution
      const resolvedTemplates = await this.resolveTemplateConflicts(
        permissionTemplateContext.applicableTemplates || [],
        context,
      );

      // Update context with permission template information
      context.templateContext = {
        templateId: undefined,
        templateKey: undefined,
        templateName: undefined,
        templateType: 'SYSTEM',
        hierarchyLevel: undefined,
        isSystemTemplate: false,
        priority: undefined,
        version: undefined,
        applicableToLevels: undefined,
        inheritedFrom: undefined,
        overrides: undefined,
        conflicts: undefined,
        resolution: undefined,
        createdAt: undefined,
        createdBy: undefined,
        lastModifiedAt: undefined,
        lastModifiedBy: undefined,
        isActive: undefined,
        expiresAt: undefined,
        applicableTemplates: resolvedTemplates.finalTemplates,
        hierarchyBasedTemplates:
          permissionTemplateContext.hierarchyBasedTemplates,
        roleBasedTemplates: permissionTemplateContext.roleBasedTemplates,
        departmentBasedTemplates:
          permissionTemplateContext.departmentBasedTemplates,
        customTemplates: permissionTemplateContext.customTemplates,
        templateConflicts: resolvedTemplates.conflicts,
        resolutionStrategy: resolvedTemplates.resolutionStrategy,
        effectivePermissions: resolvedTemplates.effectivePermissions,
        inheritanceChain: permissionTemplateContext.inheritanceChain,
        applicabilityScore: this.calculateApplicabilityScore(
          resolvedTemplates.finalTemplates,
        ),
        lastUpdated: DateTime.now().toJSDate(),
      };

      // Cache the template context (10 minutes TTL)
      if (this.cacheManager) {
        await this.cacheManager.set(
          cacheKey,
          context.templateContext,
          RBAC_CACHE_TTL.SIMPLIFIED_RESULT,
        );
        this.logger.debug(
          `Cache SET: Template context for ${workspaceMemberId} with SIMPLIFIED_RESULT TTL`,
        );
      }

      this.logger.debug(`Step 4: ${this.stepName} completed successfully`);

      return {
        result: CheckResult.PASS,
        reason: 'Permission template check completed successfully',
        continue: true,
        executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        metadata: {
          templatesFound: resolvedTemplates.finalTemplates.length,
          conflicts: resolvedTemplates.conflicts.length,
          applicabilityScore: context.templateContext?.applicabilityScore || 0,
          primaryTemplateType: this.getPrimaryTemplateType(
            resolvedTemplates.finalTemplates,
          ),
          source: 'DATABASE',
        },
      };
    } catch (error) {
      this.logger.error(`Step 4: ${this.stepName} failed: ${error.message}`);

      // For template resolution failures, we can continue with limited permissions
      return {
        result: CheckResult.WARNING,
        reason: `Permission template resolution failed: ${error.message}`,
        continue: true,
        executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        metadata: {
          error: error.message,
          fallbackMode: true,
        },
      };
    }
  }

  /**
   * Resolve applicable permission templates based on user context
   */
  private async resolvePermissionTemplates(
    context: EnhancedPermissionContext,
    workspaceId: string,
  ): Promise<{
    applicableTemplates: PermissionTemplateInterface[];
    hierarchyBasedTemplates: PermissionTemplateInterface[];
    roleBasedTemplates: PermissionTemplateInterface[];
    departmentBasedTemplates: PermissionTemplateInterface[];
    customTemplates: PermissionTemplateInterface[];
    inheritanceChain: string[];
  }> {
    const userId = context.userContext.id;
    const userRoles = context.userContext.roles || [];
    const departmentId = context.userContext.departmentId;
    const hierarchyLevel = context.hierarchyContext?.userLevel;

    // Get role-based templates
    const roleBasedTemplates = await this.getRoleBasedTemplates(
      userRoles,
      workspaceId,
    );

    // Get hierarchy-based templates
    const hierarchyBasedTemplates = await this.getHierarchyBasedTemplates(
      hierarchyLevel,
      context.hierarchyContext?.departmentHierarchy || [],
      workspaceId,
    );

    // Get department-based templates
    const departmentBasedTemplates = await this.getDepartmentBasedTemplates(
      departmentId || '',
      workspaceId,
    );

    // Get custom user-specific templates
    const customTemplates = await this.getCustomTemplates(
      userId || '',
      workspaceId,
      context.userContext.workspaceMemberId,
    );

    // Build inheritance chain
    const inheritanceChain = await this.buildInheritanceChain(
      context.userContext,
      context.hierarchyContext,
      workspaceId,
    );

    // Combine all templates for applicableTemplates
    const applicableTemplates = [
      ...roleBasedTemplates,
      ...hierarchyBasedTemplates,
      ...departmentBasedTemplates,
      ...customTemplates,
    ];

    return {
      applicableTemplates,
      roleBasedTemplates,
      hierarchyBasedTemplates,
      departmentBasedTemplates,
      customTemplates,
      inheritanceChain,
    };
  }

  /**
   * Get role-based permission templates from database
   */
  private async getRoleBasedTemplates(
    userRoles: string[],
    workspaceId: string,
  ): Promise<PermissionTemplateInterface[]> {
    try {
      // Get permission template repository using the private method
      const templateRepository =
        await this.getPermissionTemplateRepository(workspaceId);

      // Query templates that match user roles or are system templates
      const dbTemplates = await templateRepository.find({
        where: [
          {
            isActive: true,
            isSystemTemplate: true,
          },
          // Add more specific role-based queries if needed
        ],
        relations: [
          'resourcePermissions',
          'systemActions',
          'accessLimitations',
        ],
      });

      // Convert database templates to our interface format
      const templates: PermissionTemplateInterface[] = [];

      for (const template of dbTemplates) {
        // Get priority from config for TEMPLATE type with ROLE_BASED subtype
        const priority = await this.getPriorityFromConfig(
          workspaceId,
          'TEMPLATE',
          'ROLE_BASED',
          {
            isSystemTemplate: template.isSystemTemplate,
            hierarchyLevel: template.hierarchyLevel,
          },
        );

        templates.push({
          id: template.id,
          name: template.templateName,
          templateType: 'ROLE_BASED',
          priority: priority,
          permissions: this.extractPermissionsFromTemplate(template),
          actions: this.extractActionsFromTemplate(template),
          resources: this.extractResourcesFromTemplate(template),
          conditions: this.extractConditionsFromTemplate(template),
          restrictions: this.extractRestrictionsFromTemplate(template),
          isActive: template.isActive,
          effectiveFrom: new Date(template.createdAt),
          effectiveTo: undefined,
          metadata: {
            templateKey: template.templateKey,
            hierarchyLevel: template.hierarchyLevel,
            version: template.version,
            source: 'database',
          },
        });
      }

      this.logger.debug(
        `Found ${templates.length} role-based templates for roles: ${userRoles.join(', ')}`,
      );

      return templates;
    } catch (error) {
      this.logger.error(
        `Error fetching role-based templates: ${error.message}`,
      );

      // Return fallback templates if database query fails
      return this.getFallbackRoleTemplates(userRoles, workspaceId);
    }
  }

  /**
   * Get hierarchy-based permission templates from database
   */
  private async getHierarchyBasedTemplates(
    hierarchyLevel: number | undefined,
    _departmentHierarchy: string[],
    workspaceId: string,
  ): Promise<PermissionTemplateInterface[]> {
    if (!hierarchyLevel) return [];

    try {
      // Get permission template repository using the private method
      const templateRepository =
        await this.getPermissionTemplateRepository(workspaceId);

      // Query templates that match hierarchy level
      const dbTemplates = await templateRepository.find({
        where: [
          {
            isActive: true,
            hierarchyLevel: hierarchyLevel,
          },
        ],
        relations: [
          'resourcePermissions',
          'systemActions',
          'accessLimitations',
        ],
      });

      // Convert database templates to our interface format
      const templates: PermissionTemplateInterface[] = [];

      for (const template of dbTemplates) {
        // Get priority from config for TEMPLATE type with HIERARCHY_BASED subtype
        const priority = await this.getPriorityFromConfig(
          workspaceId,
          'TEMPLATE',
          'HIERARCHY_BASED',
          {
            hierarchyLevel: template.hierarchyLevel,
          },
        );

        templates.push({
          id: template.id,
          name: template.templateName,
          templateType: 'HIERARCHY_BASED',
          priority: priority,
          permissions: this.extractPermissionsFromTemplate(template),
          actions: this.extractActionsFromTemplate(template),
          resources: this.extractResourcesFromTemplate(template),
          conditions: this.extractConditionsFromTemplate(template),
          restrictions: this.extractRestrictionsFromTemplate(template),
          isActive: template.isActive,
          effectiveFrom: new Date(template.createdAt),
          effectiveTo: undefined,
          metadata: {
            templateKey: template.templateKey,
            hierarchyLevel: template.hierarchyLevel,
            version: template.version,
            source: 'database',
          },
        });
      }

      this.logger.debug(
        `Found ${templates.length} hierarchy-based templates for level: ${hierarchyLevel}`,
      );

      return templates;
    } catch (error) {
      this.logger.error(
        `Error fetching hierarchy-based templates: ${error.message}`,
      );

      // Return fallback hierarchy templates
      return this.getFallbackHierarchyTemplates(hierarchyLevel, workspaceId);
    }
  }

  /**
   * Get department-based permission templates from database
   */
  private async getDepartmentBasedTemplates(
    departmentId: string,
    workspaceId: string,
  ): Promise<PermissionTemplateInterface[]> {
    if (!departmentId) return [];

    try {
      // Get permission template repository using the private method
      const templateRepository =
        await this.getPermissionTemplateRepository(workspaceId);

      // Get department hierarchy repository to understand department relationships
      const departmentRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          'mktDepartmentHierarchy',
          { shouldBypassPermissionChecks: true },
        );

      // Find department and its hierarchy
      const departmentInfo = await departmentRepository.findOne({
        where: { childDepartmentId: departmentId },
      });

      // Query templates for this department and parent departments
      // Note: departmentIds could be used for hierarchical template queries in the future
      const _departmentIds = [departmentId];

      if (departmentInfo?.parentDepartmentId) {
        _departmentIds.push(departmentInfo.parentDepartmentId);
      }

      // Find templates that have department-specific configurations
      // This could be through a department relationship or metadata
      const dbTemplates = await templateRepository.find({
        where: {
          isActive: true,
          // We would need a department relationship or metadata field
          // For now, get templates that could apply to departments
        },
        relations: [
          'resourcePermissions',
          'systemActions',
          'accessLimitations',
        ],
      });

      // Filter and convert templates that are relevant to this department
      const relevantTemplates = dbTemplates.filter((template) =>
        this.isTemplateRelevantToDepartment(
          template,
          departmentId,
          departmentInfo || { parentDepartmentId: undefined },
        ),
      );

      const templates: PermissionTemplateInterface[] = [];

      for (const template of relevantTemplates) {
        // Get priority from config for TEMPLATE type with DEPARTMENT_BASED subtype
        const priority = await this.getPriorityFromConfig(
          workspaceId,
          'TEMPLATE',
          'DEPARTMENT_BASED',
          {
            departmentId: departmentId,
          },
        );

        templates.push({
          id: template.id,
          name: template.templateName,
          templateType: 'DEPARTMENT_BASED',
          priority: priority,
          permissions: this.extractPermissionsFromTemplate(template),
          actions: this.extractActionsFromTemplate(template),
          resources: this.extractResourcesFromTemplate(template),
          conditions: [
            ...this.extractConditionsFromTemplate(template),
            {
              field: 'departmentId',
              operator: 'eq' as const,
              value: departmentId,
            },
          ],
          restrictions: this.extractRestrictionsFromTemplate(template),
          isActive: template.isActive,
          effectiveFrom: new Date(template.createdAt),
          effectiveTo: undefined,
          metadata: {
            templateKey: template.templateKey,
            departmentId,
            hierarchyLevel: template.hierarchyLevel,
            version: template.version,
            source: 'database',
          },
        });
      }

      this.logger.debug(
        `Found ${templates.length} department-based templates for department: ${departmentId}`,
      );

      return templates;
    } catch (error) {
      this.logger.error(
        `Error fetching department-based templates: ${error.message}`,
      );

      // Return fallback department templates
      return this.getFallbackDepartmentTemplates(departmentId, workspaceId);
    }
  }

  /**
   * Get custom user-specific permission templates from database
   */
  private async getCustomTemplates(
    userId: string,
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<PermissionTemplateInterface[]> {
    try {
      // Get user permission template repository using the private method
      const userTemplateRepository =
        await this.getUserPermissionTemplateRepository(workspaceId);

      // Get user permission override repository using the private method
      const userOverrideRepository =
        await this.getUserPermissionOverrideRepository(workspaceId);

      // Query user-specific template assignments
      const userTemplateAssignments = await userTemplateRepository.find({
        where: {
          workspaceMemberId: workspaceMemberId,
          isActive: true,
          // Check if not expired
        },
        relations: [
          'template',
          'template.resourcePermissions',
          'template.systemActions',
          'template.accessLimitations',
        ],
      });
      // Query user-specific permission overrides
      const userOverrides = await userOverrideRepository.find({
        where: {
          workspaceMemberId: workspaceMemberId,
          isActive: true,
        },
      });

      const templates: PermissionTemplateInterface[] = [];

      // Convert user template assignments to permission templates
      for (const assignment of userTemplateAssignments) {
        if (assignment.template && assignment.template.isActive) {
          // Get priority from config for TEMPLATE type
          const priority = await this.getPriorityFromConfig(
            workspaceId,
            'TEMPLATE',
            'ROLE_BASED', // User assignments are typically role-based templates
            {
              isSystemTemplate: assignment.template.isSystemTemplate,
              hierarchyLevel: assignment.template.hierarchyLevel,
            },
          );

          templates.push({
            id: `user-template-${assignment.id}`,
            name: `${assignment.template.templateName} (User Assignment)`,
            templateType: 'CUSTOM',
            priority: priority + 10, // User assignments get slight boost
            permissions: this.extractPermissionsFromTemplate(
              assignment.template,
            ),
            actions: this.extractActionsFromTemplate(assignment.template),
            resources: this.extractResourcesFromTemplate(assignment.template),
            conditions: this.extractConditionsFromTemplate(assignment.template),
            restrictions: this.extractRestrictionsFromTemplate(
              assignment.template,
            ),
            isActive: true,
            effectiveFrom: new Date(assignment.assignedAt),
            effectiveTo: assignment.expiresAt,
            metadata: {
              userId,
              assignmentId: assignment.id,
              assignmentReason: assignment.assignmentReason || '',
              templateKey: assignment.template.templateKey || '',
              source: 'user-assignment',
            },
          });
        }
      }

      // Convert user permission overrides to permission templates
      for (const override of userOverrides) {
        // Get priority from config for OVERRIDE type
        // Determine sourceSubType based on override reason
        const sourceSubType =
          override.reason === 'EMERGENCY_ACCESS'
            ? 'EMERGENCY'
            : override.reason === 'COMPLIANCE_REQUIREMENT'
              ? 'COMPLIANCE'
              : override.reason === 'AUDIT_REQUIREMENT'
                ? 'AUDIT'
                : 'TEMPORARY_GRANT'; // Default

        const priority = await this.getPriorityFromConfig(
          workspaceId,
          'OVERRIDE',
          sourceSubType,
          {
            reason: override.reason,
            isAllowed: override.isAllowed,
          },
        );

        templates.push({
          id: `user-override-${override.id}`,
          name: `Permission Override - ${override.id}`,
          templateType: 'CUSTOM',
          priority: priority,
          permissions: this.extractPermissionsFromOverride(override),
          actions: this.extractActionsFromOverride(override),
          resources: this.extractResourcesFromOverride(override),
          conditions: [],
          restrictions: [],
          isActive: true,
          effectiveFrom: new Date(override.createdAt),
          effectiveTo: override.expiresAt,
          metadata: {
            userId,
            overrideId: override.id,
            source: 'user-override',
          },
        });
      }

      this.logger.debug(
        `Found ${templates.length} custom templates for user: ${userId}`,
      );

      return templates;
    } catch (error) {
      this.logger.error(`Error fetching custom templates: ${error.message}`);

      return []; // No fallback for custom templates
    }
  }

  /**
   * Build inheritance chain for permission resolution
   */
  private async buildInheritanceChain(
    userContext: EnhancedPermissionContext['userContext'],
    hierarchyContext: EnhancedPermissionContext['hierarchyContext'],
    workspaceId: string,
  ): Promise<string[]> {
    const chain: string[] = [];

    // Add user-specific permissions
    chain.push(`user:${userContext.id}`);

    // Add role-based permissions
    if (userContext.roles) {
      userContext.roles.forEach((role) => chain.push(`role:${role}`));
    }

    // Add hierarchy-based permissions
    if (hierarchyContext?.userLevel) {
      chain.push(`hierarchy:${hierarchyContext.userLevel}`);
    }

    // Add department-based permissions
    if (userContext.departmentId) {
      chain.push(`department:${userContext.departmentId}`);
    }

    // Add workspace-wide permissions
    chain.push(`workspace:${workspaceId}`);

    return chain;
  }

  /**
   * Resolve conflicts between multiple permission templates
   */
  private async resolveTemplateConflicts(
    templates: PermissionTemplateInterface[],
    _context: EnhancedPermissionContext,
  ): Promise<{
    finalTemplates: PermissionTemplateInterface[];
    conflicts: TemplateConflict[];
    resolutionStrategy:
      | 'PRIORITY_BASED'
      | 'MOST_RESTRICTIVE'
      | 'MOST_PERMISSIVE'
      | 'CUSTOM';
    effectivePermissions: string[];
  }> {
    const conflicts: TemplateConflict[] = [];
    const sortedTemplates = [...templates].sort(
      (a, b) => b.priority - a.priority,
    );

    // Use priority-based resolution by default
    const resolutionStrategy = 'PRIORITY_BASED' as const;

    // Detect conflicts between templates
    for (let i = 0; i < sortedTemplates.length - 1; i++) {
      for (let j = i + 1; j < sortedTemplates.length; j++) {
        const templateA = sortedTemplates[i];
        const templateB = sortedTemplates[j];

        const conflict = this.detectTemplateConflict(templateA, templateB);

        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Merge permissions from all templates based on priority
    const effectivePermissions = this.mergeTemplatePermissions(
      sortedTemplates,
      resolutionStrategy,
    );

    return {
      finalTemplates: sortedTemplates,
      conflicts,
      resolutionStrategy,
      effectivePermissions,
    };
  }

  /**
   * Detect conflicts between two permission templates
   */
  private detectTemplateConflict(
    templateA: PermissionTemplateInterface,
    templateB: PermissionTemplateInterface,
  ): TemplateConflict | null {
    // Check for conflicting permissions on the same resource
    const commonResources = templateA.resources.filter((resource) =>
      templateB.resources.includes(resource),
    );

    if (commonResources.length > 0) {
      const conflictingActions = templateA.actions.filter(
        (action) =>
          templateB.actions.includes(action) &&
          templateA.permissions !== templateB.permissions,
      );

      if (conflictingActions.length > 0) {
        return {
          conflictType: 'PERMISSION',
          templateIds: [templateA.id, templateB.id],
          resolution: 'ALLOW',
          reason: `Priority-based resolution: template ${templateA.id} (priority ${templateA.priority}) takes precedence over template ${templateB.id} (priority ${templateB.priority})`,
        };
      }
    }

    return null;
  }

  /**
   * Merge permissions from multiple templates
   */
  private mergeTemplatePermissions(
    templates: PermissionTemplateInterface[],
    strategy:
      | 'PRIORITY_BASED'
      | 'MOST_RESTRICTIVE'
      | 'MOST_PERMISSIVE'
      | 'CUSTOM',
  ): string[] {
    if (templates.length === 0) return [];

    switch (strategy) {
      case 'PRIORITY_BASED':
        // Use permissions from highest priority template
        return templates[0]?.permissions || [];

      case 'MOST_PERMISSIVE':
        // Combine all permissions (union)
        return Array.from(new Set(templates.flatMap((t) => t.permissions)));

      case 'MOST_RESTRICTIVE':
        // Use intersection of all permissions
        return templates.reduce(
          (acc, template) =>
            acc.filter((p) => template.permissions.includes(p)),
          templates[0]?.permissions || [],
        );

      default:
        return templates[0]?.permissions || [];
    }
  }

  /**
   * Calculate applicability score for templates
   */
  private calculateApplicabilityScore(
    templates: PermissionTemplateInterface[],
  ): number {
    if (templates.length === 0) return 0;

    const totalScore = templates.reduce((sum, template) => {
      let score = template.priority;

      // Bonus points for active templates
      if (template.isActive) score += 10;

      // Bonus points for templates with specific conditions
      if (template.conditions.length > 0) score += 5;

      return sum + score;
    }, 0);

    return Math.min(100, totalScore / templates.length);
  }

  /**
   * Get primary template type from resolved templates
   */
  private getPrimaryTemplateType(
    templates: PermissionTemplateInterface[],
  ): string {
    if (templates.length === 0) return 'NONE';

    const typeCounts = templates.reduce(
      (counts, template) => {
        counts[template.templateType] =
          (counts[template.templateType] || 0) + 1;

        return counts;
      },
      {} as Record<string, number>,
    );

    return (
      Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'UNKNOWN'
    );
  }

  /**
   * Determine if this step should execute based on context
   * Implements conditional skip logic as per enterprise-rbac-guard-guide.md
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // According to the guide, Step 4 can skip for:
    // 1. Direct permission grants exist
    // 2. Public resource access
    // 3. System-level operations

    // Check if direct permission grants exist
    if (this.hasDirectPermissionGrants(context)) {
      this.logger.debug('Step 4 skipped: Direct permission grants exist');

      return false;
    }

    // Check if accessing public resources
    if (this.isPublicResourceAccess(context)) {
      this.logger.debug('Step 4 skipped: Public resource access');

      return false;
    }

    // Check if system-level operations
    if (this.isSystemLevelOperation(context)) {
      this.logger.debug('Step 4 skipped: System-level operation');

      return false;
    }

    // Check skip decision matrix based on resource type and action
    if (this.shouldSkipByDecisionMatrix(context)) {
      this.logger.debug('Step 4 skipped: Skip decision matrix rule applied');

      return false;
    }

    return true;
  }

  /**
   * Check if direct permission grants exist that bypass template resolution
   */
  private hasDirectPermissionGrants(
    context: EnhancedPermissionContext,
  ): boolean {
    // Check for explicit permissions in user context
    const userRoles = context.userContext?.roles || [];

    // Admin users have direct grants
    if (userRoles.includes('ADMIN') || userRoles.includes('SYSTEM_ADMIN')) {
      return true;
    }

    // Check for workspace-level direct permissions
    // Note: isWorkspaceOwner property may not exist, using role check instead
    return userRoles.includes('WORKSPACE_OWNER');
  }

  /**
   * Check if this is public resource access
   */
  private isPublicResourceAccess(context: EnhancedPermissionContext): boolean {
    const confidentialityLevel = context.resourceContext?.confidentialityLevel;

    // Public resources don't need template resolution
    return confidentialityLevel === 'PUBLIC';
  }

  /**
   * Check if this is a system-level operation
   */
  private isSystemLevelOperation(context: EnhancedPermissionContext): boolean {
    const action = context.action;
    const resourceType = context.resourceContext?.resourceType;

    // System configuration operations
    if (resourceType === 'SYSTEM_CONFIG') {
      return true;
    }

    // System maintenance actions
    return Boolean(
      action?.includes('SYSTEM_') || action?.includes('MAINTENANCE_'),
    );
  }

  /**
   * Apply skip decision matrix from enterprise-rbac-guard-guide.md
   */
  private shouldSkipByDecisionMatrix(
    context: EnhancedPermissionContext,
  ): boolean {
    const resourceType = context.resourceContext?.resourceType || '';
    const action = context.action || '';

    // Skip decision matrix from the guide
    const skipMatrix: Record<string, boolean> = {
      PUBLIC_DATA_READ: true,
      BUSINESS_DATA_READ: false, // Template resolution needed
      FINANCIAL_READ: false, // Never skip for financial
      FINANCIAL_UPDATE: false, // Never skip for financial
      FINANCIAL_DELETE: false, // Never skip for financial
      REPORTING_READ: true, // Reports can skip template resolution
      SYSTEM_CONFIG_READ: true, // System config skips templates
      SYSTEM_CONFIG_UPDATE: false, // System updates need validation
    };

    const matrixKey = `${resourceType}_${action}`;

    return skipMatrix[matrixKey] || false;
  }

  /**
   * Extract permissions from database template
   */
  private extractPermissionsFromTemplate(
    template: MktPermissionTemplateWorkspaceEntity,
  ): string[] {
    if (!template.resourcePermissions) return [];

    return template.resourcePermissions.map(
      (rp) =>
        (rp as unknown as TemplateResourcePermissionProperty).permissionType ||
        (rp as unknown as TemplateResourcePermissionProperty).permission ||
        'read',
    );
  }

  /**
   * Extract actions from database template
   */
  private extractActionsFromTemplate(
    template: MktPermissionTemplateWorkspaceEntity,
  ): string[] {
    if (!template.systemActions) return [];

    return template.systemActions.map(
      (sa) =>
        (sa as unknown as TemplateSystemActionProperty).actionType ||
        (sa as unknown as TemplateSystemActionProperty).action ||
        'view',
    );
  }

  /**
   * Extract resources from database template
   */
  private extractResourcesFromTemplate(
    template: MktPermissionTemplateWorkspaceEntity,
  ): string[] {
    if (!template.resourcePermissions) return [];

    return template.resourcePermissions.map(
      (rp) =>
        (rp as unknown as TemplateResourcePermissionProperty).resourceType ||
        (rp as unknown as TemplateResourcePermissionProperty).resource ||
        'general',
    );
  }

  /**
   * Extract conditions from database template
   */
  private extractConditionsFromTemplate(
    template: MktPermissionTemplateWorkspaceEntity,
  ): TemplateCondition[] {
    // Extract from accessLimitations or other related data
    if (!template.accessLimitations) return [];

    return template.accessLimitations
      .filter(
        (al) =>
          (al as unknown as TemplateAccessLimitationProperty).conditionField,
      )
      .map((al) => ({
        field:
          (al as unknown as TemplateAccessLimitationProperty).conditionField ||
          '',
        operator: ((al as unknown as TemplateAccessLimitationProperty)
          .conditionOperator || 'eq') as
          | 'eq'
          | 'ne'
          | 'in'
          | 'nin'
          | 'gt'
          | 'lt'
          | 'gte'
          | 'lte',
        value:
          (al as unknown as TemplateAccessLimitationProperty).conditionValue ||
          '',
      }));
  }

  /**
   * Extract restrictions from database template
   */
  private extractRestrictionsFromTemplate(
    template: MktPermissionTemplateWorkspaceEntity,
  ): TemplateRestriction[] {
    if (!template.accessLimitations) return [];

    return template.accessLimitations.map((al) => ({
      type: ((al as unknown as TemplateAccessLimitationProperty)
        .limitationType || 'RESOURCE') as
        | 'DEPARTMENT'
        | 'TIME'
        | 'LOCATION'
        | 'RESOURCE'
        | 'ACTION',
      value:
        typeof (al as unknown as TemplateAccessLimitationProperty)
          .limitationValue === 'object' &&
        (al as unknown as TemplateAccessLimitationProperty).limitationValue !==
          null
          ? JSON.stringify(
              (al as unknown as TemplateAccessLimitationProperty)
                .limitationValue,
            )
          : String(
              (al as unknown as TemplateAccessLimitationProperty)
                .limitationValue || 'default',
            ),
    }));
  }

  /**
   * Get fallback role templates when database query fails
   */
  private getFallbackRoleTemplates(
    userRoles: string[],
    workspaceId: string,
  ): PermissionTemplateInterface[] {
    const templates: PermissionTemplateInterface[] = [];

    for (const role of userRoles) {
      switch (role.toUpperCase()) {
        case 'ADMIN':
          templates.push({
            id: `fallback-admin-${workspaceId}`,
            name: 'Fallback Administrator Template',
            templateType: 'ROLE_BASED',
            priority: 100,
            permissions: ['*'],
            actions: ['*'],
            resources: ['*'],
            conditions: [],
            restrictions: [],
            isActive: true,
            effectiveFrom: new Date(),
            metadata: { role, source: 'fallback' },
          });
          break;
        case 'EMPLOYEE':
          templates.push({
            id: `fallback-employee-${workspaceId}`,
            name: 'Fallback Employee Template',
            templateType: 'ROLE_BASED',
            priority: 50,
            permissions: ['read'],
            actions: ['view'],
            resources: ['orders', 'products'],
            conditions: [],
            restrictions: [{ type: 'DEPARTMENT', value: 'own-department' }],
            isActive: true,
            effectiveFrom: new Date(),
            metadata: { role, source: 'fallback' },
          });
          break;
      }
    }

    return templates;
  }

  /**
   * Check if template is relevant to department
   */
  private isTemplateRelevantToDepartment(
    template: MktPermissionTemplateWorkspaceEntity,
    _departmentId: string,
    _departmentInfo: DepartmentInfo,
  ): boolean {
    // Logic to determine if template applies to this department
    // Could check template metadata, department-specific tags, or relationships

    // For now, return true for system templates that could apply to departments
    if (template.isSystemTemplate) {
      return true;
    }

    // Check if template has department-specific configuration
    // This could be expanded based on actual template structure
    return false;
  }

  /**
   * Extract permissions from user permission override
   */
  private extractPermissionsFromOverride(
    _override: MktUserPermissionOverrideWorkspaceEntity,
  ): string[] {
    // Return basic permissions for overrides
    return ['read', 'write']; // Default fallback for overrides
  }

  /**
   * Extract actions from user permission override
   */
  private extractActionsFromOverride(
    _override: MktUserPermissionOverrideWorkspaceEntity,
  ): string[] {
    // Return basic actions for overrides
    return ['view', 'edit']; // Default fallback for overrides
  }

  /**
   * Extract resources from user permission override
   */
  private extractResourcesFromOverride(
    _override: MktUserPermissionOverrideWorkspaceEntity,
  ): string[] {
    // Return basic resources for overrides
    return ['general']; // Default fallback for overrides
  }

  /**
   * Get fallback hierarchy templates
   */
  private getFallbackHierarchyTemplates(
    hierarchyLevel: number,
    workspaceId: string,
  ): PermissionTemplateInterface[] {
    const templates: PermissionTemplateInterface[] = [];

    // Map numeric hierarchy levels to template types
    if (hierarchyLevel <= 2) {
      // Executive level (1-2)
      templates.push({
        id: `fallback-executive-${workspaceId}`,
        name: 'Fallback Executive Template',
        templateType: 'HIERARCHY_BASED',
        priority: 95,
        permissions: ['*'],
        actions: ['*'],
        resources: ['*'],
        conditions: [],
        restrictions: [],
        isActive: true,
        effectiveFrom: new Date(),
        metadata: { hierarchyLevel, source: 'fallback' },
      });
    } else if (hierarchyLevel <= 5) {
      // Director level (3-5)
      templates.push({
        id: `fallback-director-${workspaceId}`,
        name: 'Fallback Director Template',
        templateType: 'HIERARCHY_BASED',
        priority: 85,
        permissions: ['read', 'write', 'update'],
        actions: ['view', 'edit', 'create', 'approve'],
        resources: ['orders', 'products', 'customers', 'reports'],
        conditions: [],
        restrictions: [{ type: 'DEPARTMENT', value: 'supervised-departments' }],
        isActive: true,
        effectiveFrom: new Date(),
        metadata: { hierarchyLevel, source: 'fallback' },
      });
    } else {
      // Manager and below (6+)
      templates.push({
        id: `fallback-manager-${workspaceId}`,
        name: 'Fallback Manager Template',
        templateType: 'HIERARCHY_BASED',
        priority: 75,
        permissions: ['read', 'write'],
        actions: ['view', 'edit'],
        resources: ['orders', 'products'],
        conditions: [],
        restrictions: [{ type: 'DEPARTMENT', value: 'own-department' }],
        isActive: true,
        effectiveFrom: new Date(),
        metadata: { hierarchyLevel, source: 'fallback' },
      });
    }

    return templates;
  }

  /**
   * Get fallback department templates
   */
  private getFallbackDepartmentTemplates(
    departmentId: string,
    workspaceId: string,
  ): PermissionTemplateInterface[] {
    return [
      {
        id: `fallback-dept-${departmentId}-${workspaceId}`,
        name: `Fallback Department Template`,
        templateType: 'DEPARTMENT_BASED',
        priority: 60,
        permissions: ['read', 'write'],
        actions: ['view', 'edit'],
        resources: ['orders', 'products'],
        conditions: [
          { field: 'departmentId', operator: 'eq', value: departmentId },
        ],
        restrictions: [],
        isActive: true,
        effectiveFrom: new Date(),
        metadata: { departmentId, source: 'fallback' },
      },
    ];
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]
      .estimatedExecutionTime;
  }
}
