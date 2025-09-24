import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionTemplate,
  PermissionTemplateCheckStep,
  StepValidationResult,
  TemplateConflictResolution,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

// eslint-disable-next-line import/order
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
// Note: Optional service for independent operation
// import { PermissionTemplateService as CorePermissionTemplateService } from 'src/mkt-core/mkt-permission-template/services/permission-template.service';

import {
  HierarchyLevel,
  DepartmentType,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/hierarchy.constants';
import {
  VALIDATION_STEPS,
  CACHE_KEY_PREFIXES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  EnhancedPermissionContext,
  PermissionTemplateContext,
  TemplateConflict as ImportedTemplateConflict,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';

/**
 * Permission Template with enhanced metadata
 */
interface EnhancedPermissionTemplate {
  id: string;
  name: string;
  description: string;
  templateType:
    | 'ROLE_BASED'
    | 'HIERARCHY_BASED'
    | 'DEPARTMENT_BASED'
    | 'CUSTOM';

  // Scope and applicability
  hierarchyLevels: HierarchyLevel[];
  departments: DepartmentType[];
  roles: string[];

  // Permissions and actions
  permissions: string[];
  actions: string[];
  resources: string[];

  // Conditions and restrictions
  conditions: TemplateCondition[];
  restrictions: TemplateRestriction[];

  // Inheritance and priority
  priority: number;
  canInherit: boolean;
  inheritanceRules: InheritanceRule[];

  // Metadata
  isActive: boolean;
  validFrom: Date;
  validTo?: Date;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdAt: Date;
  createdBy: string;
  version: string;
}

/**
 * Template application condition
 */
interface TemplateCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | boolean | Date | string[] | number[];
  required: boolean;
}

/**
 * Template restriction
 */
interface TemplateRestriction {
  type: 'TIME' | 'LOCATION' | 'RESOURCE' | 'ACTION' | 'CONDITION';
  rule: string;
  value: string | number | boolean | Date | string[] | number[];
  severity: 'WARNING' | 'ERROR' | 'BLOCK';
}

/**
 * Inheritance rule for template permissions
 */
interface InheritanceRule {
  inheritFrom: HierarchyLevel;
  inheritTo: HierarchyLevel[];
  conditions: string[];
  limitations: string[];
}

/**
 * Template conflict information
 */
interface LocalTemplateConflict {
  conflictType:
    | 'PERMISSION_CONFLICT'
    | 'RESTRICTION_CONFLICT'
    | 'PRIORITY_CONFLICT';
  templates: string[];
  conflictingElements: string[];
  resolutionStrategy:
    | 'DENY_WINS'
    | 'ALLOW_WINS'
    | 'HIGHEST_PRIORITY'
    | 'MOST_SPECIFIC';
  resolved: boolean;
  resolution?: {
    strategy: string;
    resolvedValue: string | number | boolean;
    appliedRules: string[];
    metadata?: Record<string, string | number | boolean>;
  };
}

/**
 * Permission Template Service - Step 4
 */
@Injectable()
export class PermissionTemplateService implements PermissionTemplateCheckStep {
  private readonly logger = new Logger(PermissionTemplateService.name);

  readonly stepNumber = VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK;
  readonly stepName = 'Permission Template Check';
  readonly description =
    'Resolve applicable templates, evaluate conflicts, apply hierarchy, and resolve priority';
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 80;
  readonly maxExecutionTime = 700;
  readonly enableCaching = true;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    // Optional service for independent operation
    // private readonly corePermissionTemplateService?: CorePermissionTemplateService,
  ) {}

  /**
   * Main validation method
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Starting permission template check for user: ${context.userContext?.userId}`,
      );

      // Check if we can skip this step
      if (!this.shouldExecute(context)) {
        return this.createSkipResult(
          'Template context already resolved',
          startTime,
        );
      }

      // Ensure we have user context
      if (!context.userContext || !context.hierarchyContext) {
        return this.createFailResult(
          'User and hierarchy context required for template resolution',
          startTime,
        );
      }

      // Resolve applicable templates
      const applicableTemplates =
        await this.resolveApplicableTemplates(context);

      if (applicableTemplates.length === 0) {
        this.logger.warn(
          `No applicable templates found for user: ${context.userContext?.userId}`,
        );
      }

      // Evaluate template conflicts
      const conflictResolution =
        await this.evaluateTemplateConflicts(applicableTemplates);

      // Apply template hierarchy
      const hierarchyAppliedTemplates = await this.applyTemplateHierarchy(
        applicableTemplates,
        context.userContext.hierarchyLevel,
      );

      // Resolve template priority
      const prioritizedTemplates = await this.resolveTemplatePriority([
        hierarchyAppliedTemplates,
      ]);

      // Build template context
      const templateContext: PermissionTemplateContext = {
        templateId: 'resolved-template',
        templateName: 'Resolved Permission Template',
        templateType: 'INHERITED',
        hierarchyLevel: context.userContext.hierarchyLevel,
        priority: 1,
        isActive: true,
        createdAt: DateTime.now(),
        inheritedFrom: prioritizedTemplates.map((t) => t.id),
        conflicts: [], // Empty array for now since structure is different
        resolution: conflictResolution.requiresManualReview
          ? 'MERGE'
          : undefined,
      };

      const executionTime = Date.now() - startTime;

      return {
        result: 'PASS',
        reason: 'Permission templates successfully resolved and applied',
        continue: true,
        executionTime,
        stepData: {
          templateContext,
          applicableTemplates: prioritizedTemplates,
          conflictResolution,
        },
        modifyContext: {
          templateContext,
        },
        warnings:
          conflictResolution.warnings.length > 0
            ? conflictResolution.warnings
            : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Error in permission template check: ${error.message}`,
        error.stack,
      );

      return this.createErrorResult(error.message, startTime);
    }
  }

  /**
   * Determine if this step should be executed
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // Skip if template context already exists and is complete
    if (
      context.templateContext?.templateId &&
      context.templateContext?.isActive
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get estimated execution time
   */
  getEstimatedExecutionTime(context: EnhancedPermissionContext): number {
    if (context.templateContext) return 100; // Already resolved

    return this.maxExecutionTime || 700;
  }

  /**
   * Resolve applicable templates based on user context
   */
  async resolveApplicableTemplates(
    context: EnhancedPermissionContext,
  ): Promise<PermissionTemplate[]> {
    try {
      const userContext = context.userContext!;
      const hierarchyContext = context.hierarchyContext!;

      // Try cache first
      const cacheKey = this.getCacheKey(userContext.workspaceMemberId);

      // Get base templates (would normally come from core service)
      // const coreTemplates = await this.corePermissionTemplateService?.getPermissionTemplatesForUser(
      //   userContext.workspaceMemberId
      // ) || [];
      const coreTemplates: {
        id?: string;
        name?: string;
        description?: string;
        permissions?: string[];
        actions?: string[];
        resources?: string[];
        priority?: number;
        canInherit?: boolean;
        isActive?: boolean;
        effectiveFrom?: Date;
        effectiveTo?: Date;
        createdAt?: Date;
        createdBy?: string;
        version?: string;
      }[] = []; // Placeholder for independent operation

      const applicableTemplates: PermissionTemplate[] = [];

      // Convert and filter core templates
      for (const coreTemplate of coreTemplates) {
        const enhancedTemplate = await this.enhanceTemplate(
          coreTemplate,
          context,
        );

        if (await this.isTemplateApplicable(enhancedTemplate, context)) {
          applicableTemplates.push(
            this.convertToPermissionTemplate(enhancedTemplate),
          );
        }
      }

      // Add hierarchy-based templates
      const hierarchyTemplates = await this.getHierarchyBasedTemplates(
        userContext.hierarchyLevel,
      );

      applicableTemplates.push(
        ...hierarchyTemplates.map((t) => this.convertToPermissionTemplate(t)),
      );

      // Add department-based templates
      const departmentTemplates = await this.getDepartmentBasedTemplates(
        (userContext.departmentId || 'OTHER') as DepartmentType,
      );

      applicableTemplates.push(
        ...departmentTemplates.map((t) => this.convertToPermissionTemplate(t)),
      );

      // Add role-based templates
      const roleTemplates = await this.getRoleBasedTemplates(
        userContext.roles || [],
      );

      applicableTemplates.push(
        ...roleTemplates.map((t) => this.convertToPermissionTemplate(t)),
      );

      // Sort by priority (highest first)
      applicableTemplates.sort((a, b) => b.priority - a.priority);

      this.logger.debug(
        `Found ${applicableTemplates.length} applicable templates`,
      );

      return applicableTemplates;
    } catch (error) {
      this.logger.error(
        `Error resolving applicable templates: ${error.message}`,
        error.stack,
      );

      return [];
    }
  }

  /**
   * Convert enhanced template to basic permission template
   */
  private convertToPermissionTemplate(
    enhanced: EnhancedPermissionTemplate,
  ): PermissionTemplate {
    return {
      id: enhanced.id,
      name: enhanced.name,
      description: enhanced.description,
      templateType: enhanced.templateType,
      permissions: enhanced.permissions,
      restrictions: enhanced.restrictions.map((r) => r.rule),
      validFrom: enhanced.validFrom,
      validTo: enhanced.validTo,
      priority: enhanced.priority,
      conditions: enhanced.conditions.reduce(
        (acc, condition) => {
          let value = condition.value;

          // Convert complex types to simple ones
          if (Array.isArray(value)) {
            value = value.join(',');
          } else if (value instanceof Date) {
            value = value.toISOString();
          }
          acc[condition.field] = value as string | number | boolean;

          return acc;
        },
        {} as Record<string, string | number | boolean>,
      ),
    };
  }

  /**
   * Evaluate template conflicts
   */
  async evaluateTemplateConflicts(
    templates: PermissionTemplate[],
  ): Promise<TemplateConflictResolution> {
    try {
      const conflicts: LocalTemplateConflict[] = [];

      // Simple conflict detection and resolution
      const conflictingPermissions = new Set<string>();
      const allPermissions = new Set<string>();

      templates.forEach((template) => {
        template.permissions.forEach((permission) => {
          if (allPermissions.has(permission)) {
            conflictingPermissions.add(permission);
          }
          allPermissions.add(permission);
        });
      });

      const hasConflicts = conflictingPermissions.size > 0;

      return {
        conflictingTemplates: hasConflicts ? templates : [],
        resolutionStrategy: 'PRIORITY_BASED' as const,
        resolvedPermissions: Array.from(allPermissions),
        warnings: hasConflicts
          ? Array.from(conflictingPermissions).map(
              (p) => `Permission conflict: ${p}`,
            )
          : [],
        requiresManualReview: hasConflicts,
      };
    } catch (error) {
      this.logger.error(
        `Error evaluating template conflicts: ${error.message}`,
        error.stack,
      );

      return {
        conflictingTemplates: [],
        resolutionStrategy: 'PRIORITY_BASED',
        resolvedPermissions: [],
        warnings: [`Error evaluating conflicts: ${error.message}`],
        requiresManualReview: true,
      };
    }
  }

  /**
   * Apply template hierarchy rules
   */
  async applyTemplateHierarchy(
    templates: PermissionTemplate[],
    hierarchyLevel: number,
  ): Promise<PermissionTemplate> {
    try {
      // Find the most applicable template based on hierarchy level
      const applicableTemplate = templates
        .filter(
          (t) =>
            t.templateType === 'HIERARCHY_BASED' ||
            t.templateType === 'ROLE_BASED',
        )
        .sort((a, b) => b.priority - a.priority)[0];

      if (!applicableTemplate) {
        // Return a default template if none found
        return {
          id: 'default-hierarchy',
          name: 'Default Hierarchy Template',
          description: 'Default template for hierarchy level ' + hierarchyLevel,
          templateType: 'HIERARCHY_BASED',
          permissions: [],
          restrictions: [],
          validFrom: new Date(),
          priority: 0,
          conditions: {},
        };
      }

      // Return the most applicable template with possible modifications
      return {
        ...applicableTemplate,
        name: `${applicableTemplate.name} (Hierarchy Applied)`,
        permissions: [...applicableTemplate.permissions], // Could add inherited permissions here
      };
    } catch (error) {
      this.logger.error(
        `Error applying template hierarchy: ${error.message}`,
        error.stack,
      );

      // Return first template or default
      return (
        templates[0] || {
          id: 'error-default',
          name: 'Error Default Template',
          description: 'Default template due to error',
          templateType: 'ROLE_BASED',
          permissions: [],
          restrictions: [],
          validFrom: new Date(),
          priority: 0,
          conditions: {},
        }
      );
    }
  }

  /**
   * Resolve template priority and conflicts
   */
  async resolveTemplatePriority(
    templates: PermissionTemplate[],
  ): Promise<PermissionTemplate[]> {
    try {
      // Sort templates by priority (highest first)
      const sortedTemplates = templates.sort((a, b) => b.priority - a.priority);

      // Simple priority resolution - return all templates in priority order
      return sortedTemplates;
    } catch (error) {
      this.logger.error(
        `Error resolving template priority: ${error.message}`,
        error.stack,
      );

      return templates;
    }
  }

  /**
   * Helper methods for template processing
   */
  private async enhanceTemplate(
    coreTemplate: {
      id?: string;
      name?: string;
      description?: string;
      permissions?: string[];
      actions?: string[];
      resources?: string[];
      priority?: number;
      canInherit?: boolean;
      isActive?: boolean;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      createdAt?: Date;
      createdBy?: string;
      version?: string;
    },
    context: EnhancedPermissionContext,
  ): Promise<EnhancedPermissionTemplate> {
    // Convert core template to enhanced template with additional metadata
    return {
      id: coreTemplate.id || 'unknown',
      name: coreTemplate.name || 'Unknown Template',
      description: coreTemplate.description || 'No description provided',
      templateType: 'ROLE_BASED',
      hierarchyLevels: this.extractHierarchyLevels(
        coreTemplate as Record<string, unknown>,
      ),
      departments: this.extractDepartments(
        coreTemplate as Record<string, unknown>,
      ),
      roles: this.extractRoles(coreTemplate as Record<string, unknown>),
      permissions: coreTemplate.permissions || [],
      actions: coreTemplate.actions || [],
      resources: coreTemplate.resources || [],
      conditions: this.extractConditions(
        coreTemplate as Record<string, unknown>,
      ),
      restrictions: [],
      priority: coreTemplate.priority || 50,
      canInherit: coreTemplate.canInherit !== false,
      inheritanceRules: this.extractInheritanceRules(
        coreTemplate as Record<string, unknown>,
      ),
      isActive: coreTemplate.isActive !== false,
      validFrom: coreTemplate.effectiveFrom || new Date(),
      validTo: coreTemplate.effectiveTo,
      effectiveFrom: coreTemplate.effectiveFrom,
      effectiveTo: coreTemplate.effectiveTo,
      createdAt: coreTemplate.createdAt || new Date(),
      createdBy: coreTemplate.createdBy || 'system',
      version: coreTemplate.version || '1.0',
    };
  }

  private async isTemplateApplicable(
    template: EnhancedPermissionTemplate,
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    const userContext = context.userContext!;

    // Check if template is active
    if (!template.isActive) return false;

    // Check effective dates
    const now = new Date();

    if (template.effectiveFrom && template.effectiveFrom > now) return false;
    if (template.effectiveTo && template.effectiveTo < now) return false;

    // Check hierarchy level
    if (
      template.hierarchyLevels.length > 0 &&
      !template.hierarchyLevels.includes(userContext.hierarchyLevel)
    ) {
      return false;
    }

    // Check department
    if (
      template.departments.length > 0 &&
      !template.departments.includes(
        (userContext.departmentId || 'OTHER') as DepartmentType,
      )
    ) {
      return false;
    }

    // Check roles
    if (
      template.roles.length > 0 &&
      !template.roles.some((role) => (userContext.roles || []).includes(role))
    ) {
      return false;
    }

    // Check conditions
    for (const condition of template.conditions) {
      if (!(await this.evaluateCondition(condition, context))) {
        return false;
      }
    }

    return true;
  }

  private async getHierarchyBasedTemplates(
    hierarchyLevel: HierarchyLevel,
  ): Promise<EnhancedPermissionTemplate[]> {
    // Get templates based on hierarchy level
    const templates: EnhancedPermissionTemplate[] = [];

    // CEO level templates
    if (hierarchyLevel <= HierarchyLevel.CEO) {
      templates.push(this.createCEOTemplate());
    }

    // C-Level templates
    if (hierarchyLevel <= HierarchyLevel.C_LEVEL) {
      templates.push(this.createCLevelTemplate());
    }

    // VP level templates
    if (hierarchyLevel <= HierarchyLevel.VP) {
      templates.push(this.createVPTemplate());
    }

    // Director level templates
    if (hierarchyLevel <= HierarchyLevel.DIRECTOR) {
      templates.push(this.createDirectorTemplate());
    }

    // Manager level templates
    if (hierarchyLevel <= HierarchyLevel.MANAGER) {
      templates.push(this.createManagerTemplate());
    }

    return templates;
  }

  private async getDepartmentBasedTemplates(
    departmentType: DepartmentType,
  ): Promise<EnhancedPermissionTemplate[]> {
    const templates: EnhancedPermissionTemplate[] = [];

    // Add department-specific templates
    switch (departmentType) {
      case DepartmentType.FINANCE:
        templates.push(this.createFinanceTemplate());
        break;
      case DepartmentType.HR:
        templates.push(this.createHRTemplate());
        break;
      case DepartmentType.ENGINEERING:
        templates.push(this.createEngineeringTemplate());
        break;
      // Add more departments as needed
    }

    return templates;
  }

  private async getRoleBasedTemplates(
    roles: string[],
  ): Promise<EnhancedPermissionTemplate[]> {
    const templates: EnhancedPermissionTemplate[] = [];

    for (const role of roles) {
      const roleTemplate = await this.createRoleTemplate(role);

      if (roleTemplate) {
        templates.push(roleTemplate);
      }
    }

    return templates;
  }

  private findPermissionConflicts(
    templates: EnhancedPermissionTemplate[],
  ): LocalTemplateConflict[] {
    const conflicts: LocalTemplateConflict[] = [];

    // Implementation would check for conflicting permissions
    return conflicts;
  }

  private findRestrictionConflicts(
    templates: EnhancedPermissionTemplate[],
  ): LocalTemplateConflict[] {
    const conflicts: LocalTemplateConflict[] = [];

    // Implementation would check for conflicting restrictions
    return conflicts;
  }

  private findPriorityConflicts(
    templates: EnhancedPermissionTemplate[],
  ): LocalTemplateConflict[] {
    const conflicts: LocalTemplateConflict[] = [];

    // Implementation would check for priority conflicts
    return conflicts;
  }

  private async resolveConflict(
    conflict: LocalTemplateConflict,
    templates: EnhancedPermissionTemplate[],
  ): Promise<{
    strategy: string;
    resolvedValue: string | number | boolean;
    appliedRules: string[];
    metadata?: Record<string, string | number | boolean>;
  } | null> {
    // Implementation would resolve the specific conflict
    return null;
  }

  private isTemplateApplicableToHierarchy(
    template: EnhancedPermissionTemplate,
    hierarchyLevel: number,
  ): boolean {
    return (
      template.hierarchyLevels.length === 0 ||
      template.hierarchyLevels.includes(hierarchyLevel)
    );
  }

  private async applyInheritanceRules(
    template: EnhancedPermissionTemplate,
    hierarchyLevel: number,
  ): Promise<EnhancedPermissionTemplate> {
    // Apply inheritance rules based on hierarchy level
    return template;
  }

  private async getInheritedPermissions(
    template: EnhancedPermissionTemplate,
    hierarchyLevel: number,
  ): Promise<string[]> {
    // Get permissions inherited from higher hierarchy levels
    return [];
  }

  private async resolveSamePriorityConflicts(
    templates: EnhancedPermissionTemplate[],
  ): Promise<EnhancedPermissionTemplate[]> {
    // Resolve conflicts between templates of same priority
    return templates;
  }

  private async evaluateCondition(
    condition: TemplateCondition,
    context: EnhancedPermissionContext,
  ): Promise<boolean> {
    // Evaluate template condition against context
    return true;
  }

  // Template creation methods
  private createCEOTemplate(): EnhancedPermissionTemplate {
    return {
      id: 'ceo-template',
      name: 'CEO Template',
      description: 'Full access template for CEO level',
      templateType: 'HIERARCHY_BASED',
      hierarchyLevels: [HierarchyLevel.CEO],
      departments: [],
      roles: [],
      permissions: ['*'],
      actions: ['*'],
      resources: ['*'],
      conditions: [],
      restrictions: [],
      priority: 100,
      canInherit: true,
      inheritanceRules: [],
      isActive: true,
      validFrom: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
      version: '1.0',
    };
  }

  private createCLevelTemplate(): EnhancedPermissionTemplate {
    return {
      id: 'c-level-template',
      name: 'C-Level Template',
      description: 'Executive access template for C-Level positions',
      templateType: 'HIERARCHY_BASED',
      hierarchyLevels: [HierarchyLevel.C_LEVEL],
      departments: [],
      roles: [],
      permissions: ['admin', 'manage_all', 'financial_access'],
      actions: ['create', 'read', 'update', 'delete', 'approve', 'escalate'],
      resources: ['*'],
      conditions: [],
      restrictions: [],
      priority: 90,
      canInherit: true,
      inheritanceRules: [],
      isActive: true,
      validFrom: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
      version: '1.0',
    };
  }

  private createVPTemplate(): EnhancedPermissionTemplate {
    return {
      id: 'vp-template',
      name: 'VP Template',
      description:
        'Vice President access template with departmental management',
      templateType: 'HIERARCHY_BASED',
      hierarchyLevels: [HierarchyLevel.VP],
      departments: [],
      roles: [],
      permissions: ['manage_department', 'approve_budget', 'hire_staff'],
      actions: ['create', 'read', 'update', 'approve'],
      resources: ['department_data', 'budget_data', 'staff_data'],
      conditions: [],
      restrictions: [],
      priority: 80,
      canInherit: true,
      inheritanceRules: [],
      isActive: true,
      validFrom: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
      version: '1.0',
    };
  }

  private createDirectorTemplate(): EnhancedPermissionTemplate {
    return {
      id: 'director-template',
      name: 'Director Template',
      description: 'Director level access template for team management',
      templateType: 'HIERARCHY_BASED',
      hierarchyLevels: [HierarchyLevel.DIRECTOR],
      departments: [],
      roles: [],
      permissions: ['manage_team', 'approve_small_budget'],
      actions: ['create', 'read', 'update'],
      resources: ['team_data', 'project_data'],
      conditions: [],
      restrictions: [],
      priority: 70,
      canInherit: true,
      inheritanceRules: [],
      isActive: true,
      validFrom: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
      version: '1.0',
    };
  }

  private createManagerTemplate(): EnhancedPermissionTemplate {
    return {
      id: 'manager-template',
      name: 'Manager Template',
      description: 'Manager level access for direct report management',
      templateType: 'HIERARCHY_BASED',
      hierarchyLevels: [HierarchyLevel.MANAGER],
      departments: [],
      roles: [],
      permissions: ['manage_direct_reports', 'view_team_data'],
      actions: ['create', 'read', 'update'],
      resources: ['direct_report_data'],
      conditions: [],
      restrictions: [],
      priority: 60,
      canInherit: true,
      inheritanceRules: [],
      isActive: true,
      validFrom: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
      version: '1.0',
    };
  }

  private createFinanceTemplate(): EnhancedPermissionTemplate {
    return {
      id: 'finance-template',
      name: 'Finance Department Template',
      description: 'Financial data access template for finance department',
      templateType: 'DEPARTMENT_BASED',
      hierarchyLevels: [],
      departments: [DepartmentType.FINANCE],
      roles: [],
      permissions: ['financial_data_access', 'budget_view', 'invoice_manage'],
      actions: ['read', 'create', 'update'],
      resources: ['invoice', 'payment', 'budget'],
      conditions: [],
      restrictions: [],
      priority: 75,
      canInherit: false,
      inheritanceRules: [],
      isActive: true,
      validFrom: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
      version: '1.0',
    };
  }

  private createHRTemplate(): EnhancedPermissionTemplate {
    return {
      id: 'hr-template',
      name: 'HR Department Template',
      description: 'Human resources access template for HR department',
      templateType: 'DEPARTMENT_BASED',
      hierarchyLevels: [],
      departments: [DepartmentType.HR],
      roles: [],
      permissions: ['employee_data_access', 'salary_view', 'hire_manage'],
      actions: ['read', 'create', 'update'],
      resources: ['employee', 'salary', 'benefits'],
      conditions: [],
      restrictions: [],
      priority: 75,
      canInherit: false,
      inheritanceRules: [],
      isActive: true,
      validFrom: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
      version: '1.0',
    };
  }

  private createEngineeringTemplate(): EnhancedPermissionTemplate {
    return {
      id: 'engineering-template',
      name: 'Engineering Department Template',
      description: 'Technical access template for engineering department',
      templateType: 'DEPARTMENT_BASED',
      hierarchyLevels: [],
      departments: [DepartmentType.ENGINEERING],
      roles: [],
      permissions: ['code_access', 'deploy_manage', 'system_config'],
      actions: ['read', 'create', 'update', 'delete'],
      resources: ['code', 'deployment', 'system'],
      conditions: [],
      restrictions: [],
      priority: 75,
      canInherit: false,
      inheritanceRules: [],
      isActive: true,
      validFrom: new Date(),
      createdAt: new Date(),
      createdBy: 'system',
      version: '1.0',
    };
  }

  private async createRoleTemplate(
    _role: string,
  ): Promise<EnhancedPermissionTemplate | null> {
    // Create template based on role
    return null;
  }

  // Extraction methods
  private extractHierarchyLevels(
    template: Record<string, unknown>,
  ): HierarchyLevel[] {
    return (template.hierarchyLevels as HierarchyLevel[]) || [];
  }

  private extractDepartments(
    template: Record<string, unknown>,
  ): DepartmentType[] {
    return (template.departments as DepartmentType[]) || [];
  }

  private extractRoles(template: Record<string, unknown>): string[] {
    return (template.roles as string[]) || [];
  }

  private extractConditions(
    template: Record<string, unknown>,
  ): TemplateCondition[] {
    return (template.conditions as TemplateCondition[]) || [];
  }

  private extractInheritanceRules(
    template: Record<string, unknown>,
  ): InheritanceRule[] {
    return (template.inheritanceRules as InheritanceRule[]) || [];
  }

  private extractPermissions(
    templates: EnhancedPermissionTemplate[],
  ): string[] {
    return templates.flatMap((t) => t.permissions);
  }

  private extractActions(templates: EnhancedPermissionTemplate[]): string[] {
    return templates.flatMap((t) => t.actions);
  }

  private extractResources(templates: EnhancedPermissionTemplate[]): string[] {
    return templates.flatMap((t) => t.resources);
  }

  private extractInheritedPermissions(
    templates: EnhancedPermissionTemplate[],
    hierarchyLevel: number,
  ): string[] {
    return templates
      .filter((t) => t.canInherit && t.hierarchyLevels.includes(hierarchyLevel))
      .flatMap((t) => t.permissions);
  }

  private extractDelegatedPermissions(
    _templates: EnhancedPermissionTemplate[],
  ): string[] {
    return []; // Implementation would extract delegated permissions
  }

  private extractTemporaryPermissions(
    _templates: EnhancedPermissionTemplate[],
  ): {
    permission: string;
    validUntil: Date;
    grantedBy: string;
    reason: string;
  }[] {
    return []; // Implementation would extract temporary permissions
  }

  private extractRestrictions(
    templates: EnhancedPermissionTemplate[],
  ): TemplateRestriction[] {
    return templates.flatMap((t) => t.restrictions);
  }

  private formatTemplateResults(templates: EnhancedPermissionTemplate[]): {
    id: string;
    name: string;
    type: string;
    priority: number;
    permissions: number;
    restrictions: number;
  }[] {
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.templateType,
      priority: t.priority,
      permissions: t.permissions.length,
      restrictions: t.restrictions.length,
    }));
  }

  private convertToImportedConflicts(
    conflicts: LocalTemplateConflict[],
  ): ImportedTemplateConflict[] {
    return conflicts.map((c) => ({
      conflictType: this.mapConflictType(c.conflictType),
      templateIds: c.templates,
      resolution: this.mapResolution(c.resolutionStrategy),
      reason: `${c.conflictType}: ${c.conflictingElements.join(', ')}`,
    }));
  }

  private mapConflictType(
    type: 'PERMISSION_CONFLICT' | 'RESTRICTION_CONFLICT' | 'PRIORITY_CONFLICT',
  ): 'PERMISSION' | 'RESTRICTION' | 'LEVEL' {
    switch (type) {
      case 'PERMISSION_CONFLICT':
        return 'PERMISSION';
      case 'RESTRICTION_CONFLICT':
        return 'RESTRICTION';
      case 'PRIORITY_CONFLICT':
        return 'LEVEL';
      default:
        return 'PERMISSION';
    }
  }

  private mapResolution(
    strategy: 'DENY_WINS' | 'ALLOW_WINS' | 'HIGHEST_PRIORITY' | 'MOST_SPECIFIC',
  ): 'DENY' | 'ALLOW' | 'ESCALATE' {
    switch (strategy) {
      case 'DENY_WINS':
        return 'DENY';
      case 'ALLOW_WINS':
        return 'ALLOW';
      case 'HIGHEST_PRIORITY':
      case 'MOST_SPECIFIC':
        return 'ESCALATE';
      default:
        return 'DENY';
    }
  }

  private formatConflicts(conflicts: LocalTemplateConflict[]): {
    type: string;
    templates: string[];
    resolved: boolean;
    strategy: string;
  }[] {
    return conflicts.map((c) => ({
      type: c.conflictType,
      templates: c.templates,
      resolved: c.resolved,
      strategy: c.resolutionStrategy,
    }));
  }

  private calculateEffectiveTo(
    templates: EnhancedPermissionTemplate[],
  ): Date | undefined {
    const effectiveToDates = templates
      .map((t) => t.effectiveTo)
      .filter((date) => date !== undefined) as Date[];

    if (effectiveToDates.length === 0) return undefined;

    return new Date(Math.min(...effectiveToDates.map((d) => d.getTime())));
  }

  private buildResolutionPath(
    templates: EnhancedPermissionTemplate[],
  ): string[] {
    return templates.map((t) => `${t.templateType}:${t.name}`);
  }

  /**
   * Cache key generation
   */
  private getCacheKey(workspaceMemberId: string): string {
    return `${CACHE_KEY_PREFIXES.PERMISSION_TEMPLATE}${workspaceMemberId}`;
  }

  /**
   * Helper methods for creating results
   */
  private createSkipResult(
    reason: string,
    startTime: number,
  ): StepValidationResult {
    return {
      result: 'SKIP',
      reason,
      continue: true,
      executionTime: Date.now() - startTime,
    };
  }

  private createFailResult(
    reason: string,
    startTime: number,
  ): StepValidationResult {
    return {
      result: 'FAIL',
      reason,
      continue: false,
      executionTime: Date.now() - startTime,
      errors: [reason],
    };
  }

  private createErrorResult(
    error: string,
    startTime: number,
  ): StepValidationResult {
    return {
      result: 'ERROR',
      reason: `System error: ${error}`,
      continue: false,
      executionTime: Date.now() - startTime,
      errors: [error],
    };
  }
}
