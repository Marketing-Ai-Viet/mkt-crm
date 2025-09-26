/**
 * Step 7: Hierarchy Validation Service
 * Validates user hierarchy permissions and organizational level access
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
 * Hierarchy validation evaluation result
 */
type HierarchyValidationEvaluation = {
  hasPermission: boolean;
  source:
    | 'DEPARTMENT_HIERARCHY'
    | 'ORGANIZATION_LEVEL'
    | 'REPORTING_CHAIN'
    | 'CROSS_DEPARTMENT'
    | 'SYSTEM_DEFAULT';
  level: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';
  restrictions: string[];
  confidence: number;
  metadata: {
    userHierarchyLevel: number;
    requiredHierarchyLevel?: number;
    departmentAccess: boolean;
    canEscalateToParent: boolean;
    canAccessSubordinates: boolean;
    crossDepartmentAllowed: boolean;
    hierarchyPath?: string[];
  };
};

/**
 * Department hierarchy entity from workspace
 */
type DepartmentHierarchyEntity = {
  id: string;
  hierarchyLevel: number;
  relationshipType: string;
  validFrom?: Date;
  validTo?: Date;
  inheritsPermissions?: boolean;
  canEscalateToParent?: boolean;
  allowsCrossBranchAccess?: boolean;
  parentDepartmentId?: string;
  childDepartmentId?: string;
  hierarchyPath?: string[];
  inheritsParentPermissions?: boolean;
  canViewTeamData?: boolean;
  canEditTeamData?: boolean;
  canExportTeamData?: boolean;
  canApprove?: boolean;
  canDelegate?: boolean;
  canAudit?: boolean;
  canManageUsers?: boolean;
  canAccessSensitiveData?: boolean;
  canOverrideSubordinates?: boolean;
  requiresDualApproval?: boolean;
  requiresMFA?: boolean;
  canAccessAfterHours?: boolean;
  requiresFullAuditTrail?: boolean;
  canDeleteData?: boolean;
  isActive?: boolean;
};

/**
 * Organization level entity from workspace
 */
type OrganizationLevelEntity = {
  id: string;
  levelCode: string;
  levelName: string;
  levelNameEn?: string;
  description?: string;
  hierarchyLevel: number;
  parentLevelId?: string;
  displayOrder: number;
  isActive?: boolean;
};

/**
 * Workspace member entity from workspace
 */
type WorkspaceMemberEntity = {
  id: string;
  userId: string;
  userEmail: string;
  nameFirstName?: string;
  nameLastName?: string;
  departmentId?: string;
  organizationLevelId?: string;
  employmentStatusId?: string;
};

/**
 * Hierarchy access validation result
 */
type HierarchyAccessValidation = {
  canAccessResource: boolean;
  hierarchyLevelSufficient: boolean;
  departmentAccessAllowed: boolean;
  crossDepartmentAccess: boolean;
  requiresEscalation: boolean;
  escalationPath?: string[];
  restrictions: string[];
};

/**
 * Step 7: Hierarchy Validation Service
 * Validates that the user's hierarchy level allows access to the requested resource
 */
@Injectable()
export class Step7HierarchyValidationService
  implements PermissionValidationStep
{
  readonly stepNumber = VALIDATION_STEPS.HIERARCHY_VALIDATION;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.HIERARCHY_VALIDATION];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.HIERARCHY_VALIDATION];

  // Step configuration
  readonly isRequired = true;
  readonly canSkip = true; // Can skip for public resources or admin users
  readonly isAsync = true;
  readonly priority =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.HIERARCHY_VALIDATION].priority;

  // Dependencies
  readonly dependsOn = [
    VALIDATION_STEPS.PRE_VALIDATION,
    VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
    VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
    VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK,
    VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION,
    VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK,
  ];
  readonly conflicts = undefined;

  private readonly logger = new Logger(Step7HierarchyValidationService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Get Department Hierarchy Repository for workspace
   */
  private async getDepartmentHierarchyRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<DepartmentHierarchyEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<DepartmentHierarchyEntity>(
      workspaceId,
      'mktDepartmentHierarchy',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get Organization Level Repository for workspace
   */
  private async getOrganizationLevelRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<OrganizationLevelEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<OrganizationLevelEntity>(
      workspaceId,
      'mktOrganizationLevel',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get Workspace Member Repository for workspace
   */
  private async getWorkspaceMemberRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<WorkspaceMemberEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberEntity>(
      workspaceId,
      'workspaceMember',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Validate Step 7: Hierarchy Validation
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step 7: ${this.stepName} - Starting hierarchy validation`,
      );

      // Validate prerequisites
      if (!context.userContext) {
        return {
          result: CheckResult.FAIL,
          reason: 'User context is required for hierarchy validation',
          continue: false,
          executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        };
      }

      if (!context.hierarchyContext) {
        return {
          result: CheckResult.FAIL,
          reason: 'Hierarchy context is required for hierarchy validation',
          continue: false,
          executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        };
      }

      const workspaceId = context.userContext.workspaceId;

      // Step 1: Get user's complete hierarchy information
      const userHierarchyInfo = await this.getUserHierarchyInformation(
        context.userContext,
        workspaceId,
      );

      // Step 2: Validate hierarchy access for the requested resource/action
      const hierarchyValidation = await this.validateHierarchyAccess(
        context.userContext,
        context.hierarchyContext,
        context.resourceContext?.resourceType || '',
        context.action || '',
        userHierarchyInfo,
        workspaceId,
      );

      // Update hierarchy context with validation results
      // Note: OrganizationalHierarchyContext doesn't have validationResult property
      // Store validation results in metadata instead

      this.logger.debug(`Step 7: ${this.stepName} completed successfully`);

      const result = hierarchyValidation.hasPermission
        ? CheckResult.PASS
        : CheckResult.FAIL;

      return {
        result,
        reason: hierarchyValidation.hasPermission
          ? 'Hierarchy validation passed'
          : `Hierarchy access denied: ${hierarchyValidation.restrictions.join(', ')}`,
        continue: hierarchyValidation.hasPermission,
        executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        metadata: {
          hierarchyLevel: hierarchyValidation.metadata.userHierarchyLevel,
          requiredLevel:
            hierarchyValidation.metadata.requiredHierarchyLevel || 0,
          source: hierarchyValidation.source,
          confidence: hierarchyValidation.confidence,
          departmentAccess: hierarchyValidation.metadata.departmentAccess,
          crossDepartmentAllowed:
            hierarchyValidation.metadata.crossDepartmentAllowed,
        },
      };
    } catch (error) {
      this.logger.error(`Step 7: ${this.stepName} failed: ${error.message}`);

      // For hierarchy validation failures, we should not continue unless it's a non-critical error
      return {
        result: CheckResult.FAIL,
        reason: `Hierarchy validation failed: ${error.message}`,
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
   * Get complete hierarchy information for the user
   */
  private async getUserHierarchyInformation(
    userContext: EnhancedUserContext,
    workspaceId: string,
  ): Promise<{
    hierarchyLevel: number;
    departmentId?: string;
    organizationLevelId?: string;
    organizationLevel?: OrganizationLevelEntity;
    departmentHierarchy?: DepartmentHierarchyEntity[];
    reportingChain?: string[];
  }> {
    try {
      const memberRepository =
        await this.getWorkspaceMemberRepository(workspaceId);
      const orgLevelRepository =
        await this.getOrganizationLevelRepository(workspaceId);
      const deptHierarchyRepository =
        await this.getDepartmentHierarchyRepository(workspaceId);

      // Get user's workspace member information
      const member = await memberRepository.findOne({
        where: { id: userContext.workspaceMemberId },
      });

      if (!member) {
        throw new Error('Workspace member not found');
      }

      let hierarchyLevel = userContext.hierarchyLevel;
      let organizationLevel: OrganizationLevelEntity | undefined;

      // Get organization level information if available
      if (member.organizationLevelId) {
        const orgLevel = await orgLevelRepository.findOne({
          where: { id: member.organizationLevelId, isActive: true },
        });

        organizationLevel = orgLevel || undefined;

        if (organizationLevel) {
          hierarchyLevel = organizationLevel.hierarchyLevel;
        }
      }

      // Get department hierarchy information
      let departmentHierarchy: DepartmentHierarchyEntity[] = [];

      if (member.departmentId) {
        departmentHierarchy = await deptHierarchyRepository.find({
          where: [
            { parentDepartmentId: member.departmentId, isActive: true },
            { childDepartmentId: member.departmentId, isActive: true },
          ],
        });
      }

      // Build reporting chain (simplified - would need more complex logic for full chain)
      const reportingChain = this.buildReportingChain(
        hierarchyLevel,
        departmentHierarchy,
      );

      return {
        hierarchyLevel,
        departmentId: member.departmentId,
        organizationLevelId: member.organizationLevelId,
        organizationLevel,
        departmentHierarchy,
        reportingChain,
      };
    } catch (error) {
      this.logger.error(
        `Error getting user hierarchy information: ${error.message}`,
      );

      return {
        hierarchyLevel: userContext.hierarchyLevel,
        departmentId: userContext.departmentId,
        organizationLevelId: userContext.organizationLevelId,
      };
    }
  }

  /**
   * Validate hierarchy access for resource and action
   */
  private async validateHierarchyAccess(
    userContext: EnhancedUserContext,
    hierarchyContext: EnhancedPermissionContext['hierarchyContext'],
    resourceType: string,
    action: string,
    userHierarchyInfo: {
      hierarchyLevel: number;
      departmentId?: string;
      departmentHierarchy?: DepartmentHierarchyEntity[];
    },
    workspaceId: string,
  ): Promise<HierarchyValidationEvaluation> {
    // Priority order: Department Hierarchy -> Organization Level -> Cross Department -> System Default

    // 1. Check department hierarchy permissions
    const departmentEvaluation = await this.checkDepartmentHierarchyPermissions(
      userContext,
      hierarchyContext,
      resourceType,
      action,
      userHierarchyInfo,
      workspaceId,
    );

    if (departmentEvaluation.hasPermission) {
      return departmentEvaluation;
    }

    // 2. Check organization level permissions
    const organizationEvaluation = await this.checkOrganizationLevelPermissions(
      userContext,
      resourceType,
      action,
      userHierarchyInfo,
      workspaceId,
    );

    if (organizationEvaluation.hasPermission) {
      return organizationEvaluation;
    }

    // 3. Check cross-department access
    const crossDepartmentEvaluation = this.checkCrossDepartmentAccess(
      userContext,
      resourceType,
      action,
      userHierarchyInfo,
    );

    if (crossDepartmentEvaluation.hasPermission) {
      return crossDepartmentEvaluation;
    }

    // 4. Fall back to system default based on hierarchy level
    return this.checkSystemDefaultHierarchyPermissions(
      userContext,
      resourceType,
      action,
      userHierarchyInfo,
    );
  }

  /**
   * Check department hierarchy permissions
   */
  private async checkDepartmentHierarchyPermissions(
    userContext: EnhancedUserContext,
    hierarchyContext: EnhancedPermissionContext['hierarchyContext'],
    resourceType: string,
    action: string,
    userHierarchyInfo: {
      hierarchyLevel: number;
      departmentId?: string;
      departmentHierarchy?: DepartmentHierarchyEntity[];
    },
    _workspaceId: string,
  ): Promise<HierarchyValidationEvaluation> {
    try {
      const departmentHierarchy = userHierarchyInfo.departmentHierarchy || [];

      // Check if user has department hierarchy that allows the action
      for (const hierarchy of departmentHierarchy) {
        const permissions = this.extractPermissionsFromHierarchy(hierarchy);

        if (
          this.isActionAllowedByHierarchy(
            action,
            resourceType,
            permissions,
            hierarchy,
          )
        ) {
          return {
            hasPermission: true,
            source: 'DEPARTMENT_HIERARCHY',
            level: this.determineLevelFromHierarchyPermissions(permissions),
            restrictions: this.extractRestrictionsFromHierarchy(hierarchy),
            confidence: 90,
            metadata: {
              userHierarchyLevel: userHierarchyInfo.hierarchyLevel,
              departmentAccess: true,
              canEscalateToParent: hierarchy.canEscalateToParent || false,
              canAccessSubordinates: hierarchy.canManageUsers || false,
              crossDepartmentAllowed:
                hierarchy.allowsCrossBranchAccess || false,
              hierarchyPath: hierarchy.hierarchyPath,
            },
          };
        }
      }

      return {
        hasPermission: false,
        source: 'DEPARTMENT_HIERARCHY',
        level: 'READ',
        restrictions: ['No matching department hierarchy permission found'],
        confidence: 0,
        metadata: {
          userHierarchyLevel: userHierarchyInfo.hierarchyLevel,
          departmentAccess: false,
          canEscalateToParent: false,
          canAccessSubordinates: false,
          crossDepartmentAllowed: false,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error checking department hierarchy permissions: ${error.message}`,
      );

      return {
        hasPermission: false,
        source: 'DEPARTMENT_HIERARCHY',
        level: 'READ',
        restrictions: [`Department hierarchy check failed: ${error.message}`],
        confidence: 0,
        metadata: {
          userHierarchyLevel: userHierarchyInfo.hierarchyLevel,
          departmentAccess: false,
          canEscalateToParent: false,
          canAccessSubordinates: false,
          crossDepartmentAllowed: false,
        },
      };
    }
  }

  /**
   * Check organization level permissions
   */
  private async checkOrganizationLevelPermissions(
    userContext: EnhancedUserContext,
    resourceType: string,
    action: string,
    userHierarchyInfo: { hierarchyLevel: number },
    _workspaceId: string,
  ): Promise<HierarchyValidationEvaluation> {
    const hierarchyLevel = userHierarchyInfo.hierarchyLevel;
    const requiredLevel = this.getRequiredHierarchyLevel(resourceType, action);

    // Check if user's hierarchy level is sufficient
    const hasPermission = hierarchyLevel <= requiredLevel; // Lower number = higher level

    return {
      hasPermission,
      source: 'ORGANIZATION_LEVEL',
      level: this.determineLevelFromHierarchy(hierarchyLevel),
      restrictions: hasPermission
        ? []
        : [
            `Requires hierarchy level ${requiredLevel} or higher, user has level ${hierarchyLevel}`,
          ],
      confidence: 85,
      metadata: {
        userHierarchyLevel: hierarchyLevel,
        requiredHierarchyLevel: requiredLevel,
        departmentAccess: hasPermission,
        canEscalateToParent: hierarchyLevel <= 5, // Directors and above can escalate
        canAccessSubordinates: hierarchyLevel <= 7, // Managers and above can access subordinates
        crossDepartmentAllowed: hierarchyLevel <= 4, // Senior directors and above
      },
    };
  }

  /**
   * Check cross-department access permissions
   */
  private checkCrossDepartmentAccess(
    userContext: EnhancedUserContext,
    resourceType: string,
    action: string,
    userHierarchyInfo: {
      hierarchyLevel: number;
      departmentHierarchy?: DepartmentHierarchyEntity[];
    },
  ): HierarchyValidationEvaluation {
    const hierarchyLevel = userHierarchyInfo.hierarchyLevel;
    const departmentHierarchy = userHierarchyInfo.departmentHierarchy || [];

    // Check if cross-department access is explicitly allowed
    const allowsCrossDepartmentAccess = departmentHierarchy.some(
      (h) => h.allowsCrossBranchAccess && h.isActive,
    );

    // High-level positions (1-4) typically have cross-department access
    const hasHighLevelAccess = hierarchyLevel <= 4;

    const hasPermission = allowsCrossDepartmentAccess || hasHighLevelAccess;

    return {
      hasPermission,
      source: 'CROSS_DEPARTMENT',
      level: hasHighLevelAccess ? 'ADMIN' : 'READ',
      restrictions: hasPermission
        ? []
        : ['Cross-department access not allowed for current hierarchy level'],
      confidence: 70,
      metadata: {
        userHierarchyLevel: hierarchyLevel,
        departmentAccess: false,
        canEscalateToParent: hasHighLevelAccess,
        canAccessSubordinates: hasHighLevelAccess,
        crossDepartmentAllowed: hasPermission,
      },
    };
  }

  /**
   * Check system default hierarchy permissions
   */
  private checkSystemDefaultHierarchyPermissions(
    userContext: EnhancedUserContext,
    resourceType: string,
    action: string,
    userHierarchyInfo: { hierarchyLevel: number },
  ): HierarchyValidationEvaluation {
    const hierarchyLevel = userHierarchyInfo.hierarchyLevel;

    // System default logic based on hierarchy levels
    // 1-2: C-Level (CEO, CTO) - Full access
    // 3-4: VP/Director level - High access
    // 5-7: Manager level - Medium access
    // 8-9: Senior employee level - Basic access
    // 10-11: Junior employee level - Limited access

    let hasPermission = false;
    let level: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN' = 'READ';
    const restrictions: string[] = [];

    if (hierarchyLevel <= 2) {
      // C-Level: Full access to everything
      hasPermission = true;
      level = 'ADMIN';
    } else if (hierarchyLevel <= 4) {
      // VP/Director: High access, some restrictions
      hasPermission = true;
      level = action.toLowerCase().includes('delete') ? 'WRITE' : 'DELETE';
      if (
        resourceType.toLowerCase().includes('financial') &&
        action.toLowerCase().includes('delete')
      ) {
        restrictions.push('Financial data deletion requires CEO approval');
      }
    } else if (hierarchyLevel <= 7) {
      // Manager: Medium access
      hasPermission =
        !action.toLowerCase().includes('delete') ||
        !resourceType.toLowerCase().includes('sensitive');
      level = 'WRITE';
      if (!hasPermission) {
        restrictions.push('Managers cannot delete sensitive data');
      }
    } else if (hierarchyLevel <= 9) {
      // Senior employee: Basic access
      hasPermission =
        action.toLowerCase().includes('read') ||
        action.toLowerCase().includes('view');
      level = 'READ';
      if (!hasPermission) {
        restrictions.push('Senior employees have read-only access');
      }
    } else {
      // Junior employee: Very limited access
      hasPermission =
        action.toLowerCase().includes('read') &&
        !resourceType.toLowerCase().includes('confidential');
      level = 'READ';
      if (!hasPermission) {
        restrictions.push('Junior employees cannot access confidential data');
      }
    }

    return {
      hasPermission,
      source: 'SYSTEM_DEFAULT',
      level,
      restrictions,
      confidence: 60,
      metadata: {
        userHierarchyLevel: hierarchyLevel,
        departmentAccess: hasPermission,
        canEscalateToParent: hierarchyLevel <= 7,
        canAccessSubordinates: hierarchyLevel <= 7,
        crossDepartmentAllowed: hierarchyLevel <= 4,
      },
    };
  }

  /**
   * Extract permissions from hierarchy entity
   */
  private extractPermissionsFromHierarchy(
    hierarchy: DepartmentHierarchyEntity,
  ): Record<string, boolean> {
    return {
      canViewTeamData: hierarchy.canViewTeamData || false,
      canEditTeamData: hierarchy.canEditTeamData || false,
      canExportTeamData: hierarchy.canExportTeamData || false,
      canApprove: hierarchy.canApprove || false,
      canDelegate: hierarchy.canDelegate || false,
      canAudit: hierarchy.canAudit || false,
      canManageUsers: hierarchy.canManageUsers || false,
      canAccessSensitiveData: hierarchy.canAccessSensitiveData || false,
      canOverrideSubordinates: hierarchy.canOverrideSubordinates || false,
      canDeleteData: hierarchy.canDeleteData || false,
    };
  }

  /**
   * Check if action is allowed by hierarchy permissions
   */
  private isActionAllowedByHierarchy(
    action: string,
    resourceType: string,
    permissions: Record<string, boolean>,
    hierarchy: DepartmentHierarchyEntity,
  ): boolean {
    const lowerAction = action.toLowerCase();
    const lowerResourceType = resourceType.toLowerCase();

    // Map actions to permissions
    if (lowerAction.includes('delete')) {
      return permissions.canDeleteData;
    }
    if (
      lowerAction.includes('edit') ||
      lowerAction.includes('update') ||
      lowerAction.includes('write')
    ) {
      return permissions.canEditTeamData;
    }
    if (lowerAction.includes('export')) {
      return permissions.canExportTeamData;
    }
    if (lowerAction.includes('approve')) {
      return permissions.canApprove;
    }
    if (lowerAction.includes('audit')) {
      return permissions.canAudit;
    }
    if (lowerAction.includes('manage') && lowerResourceType.includes('user')) {
      return permissions.canManageUsers;
    }
    if (
      lowerResourceType.includes('sensitive') ||
      lowerResourceType.includes('confidential')
    ) {
      return permissions.canAccessSensitiveData;
    }
    if (lowerAction.includes('override')) {
      return permissions.canOverrideSubordinates;
    }

    // Default to view permission
    return permissions.canViewTeamData;
  }

  /**
   * Determine permission level from hierarchy permissions
   */
  private determineLevelFromHierarchyPermissions(
    permissions: Record<string, boolean>,
  ): 'READ' | 'WRITE' | 'DELETE' | 'ADMIN' {
    if (permissions.canDeleteData || permissions.canManageUsers) {
      return 'ADMIN';
    }
    if (permissions.canEditTeamData || permissions.canApprove) {
      return 'DELETE';
    }
    if (permissions.canExportTeamData || permissions.canAudit) {
      return 'WRITE';
    }

    return 'READ';
  }

  /**
   * Extract restrictions from hierarchy entity
   */
  private extractRestrictionsFromHierarchy(
    hierarchy: DepartmentHierarchyEntity,
  ): string[] {
    const restrictions: string[] = [];

    if (hierarchy.requiresDualApproval) {
      restrictions.push('Requires dual approval');
    }
    if (hierarchy.requiresMFA) {
      restrictions.push('Requires multi-factor authentication');
    }
    if (!hierarchy.canAccessAfterHours) {
      restrictions.push('No after-hours access allowed');
    }
    if (hierarchy.requiresFullAuditTrail) {
      restrictions.push('Full audit trail required');
    }
    if (hierarchy.validFrom && hierarchy.validTo) {
      const now = new Date();

      if (now < hierarchy.validFrom || now > hierarchy.validTo) {
        restrictions.push('Outside valid time period');
      }
    }

    return restrictions;
  }

  /**
   * Get required hierarchy level for resource and action
   */
  private getRequiredHierarchyLevel(
    resourceType: string,
    action: string,
  ): number {
    const lowerResourceType = resourceType.toLowerCase();
    const lowerAction = action.toLowerCase();

    // Financial data requires high levels
    if (
      lowerResourceType.includes('financial') ||
      lowerResourceType.includes('payment')
    ) {
      if (lowerAction.includes('delete')) return 2; // CEO level
      if (lowerAction.includes('write') || lowerAction.includes('edit'))
        return 3; // VP level

      return 5; // Director level for read
    }

    // Sensitive data
    if (
      lowerResourceType.includes('sensitive') ||
      lowerResourceType.includes('confidential')
    ) {
      if (lowerAction.includes('delete')) return 3; // VP level
      if (lowerAction.includes('write') || lowerAction.includes('edit'))
        return 5; // Director level

      return 7; // Manager level for read
    }

    // System resources
    if (
      lowerResourceType.includes('system') ||
      lowerResourceType.includes('admin')
    ) {
      return 3; // VP level
    }

    // User management
    if (lowerResourceType.includes('user') && lowerAction.includes('manage')) {
      return 5; // Director level
    }

    // Default requirements
    if (lowerAction.includes('delete')) return 7; // Manager level
    if (lowerAction.includes('write') || lowerAction.includes('edit')) return 8; // Senior employee

    return 9; // Regular employee for read
  }

  /**
   * Determine permission level from hierarchy level
   */
  private determineLevelFromHierarchy(
    hierarchyLevel: number,
  ): 'READ' | 'WRITE' | 'DELETE' | 'ADMIN' {
    if (hierarchyLevel <= 2) return 'ADMIN';
    if (hierarchyLevel <= 4) return 'DELETE';
    if (hierarchyLevel <= 7) return 'WRITE';

    return 'READ';
  }

  /**
   * Build reporting chain from hierarchy information
   */
  private buildReportingChain(
    hierarchyLevel: number,
    departmentHierarchy: DepartmentHierarchyEntity[],
  ): string[] {
    const chain: string[] = [];

    // Simple reporting chain based on hierarchy level
    // In a real implementation, this would traverse the actual reporting structure
    for (let level = hierarchyLevel - 1; level >= 1; level--) {
      chain.push(`level-${level}`);
    }

    // Add department hierarchy information
    departmentHierarchy.forEach((hierarchy) => {
      if (hierarchy.parentDepartmentId) {
        chain.push(`dept-${hierarchy.parentDepartmentId}`);
      }
    });

    return chain;
  }

  /**
   * Determine if this step should execute based on context
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // Skip for admin users
    const userRoles = context.userContext?.roles || [];

    if (userRoles.includes('ADMIN') || userRoles.includes('SYSTEM_ADMIN')) {
      this.logger.debug('Step 7 skipped: Admin user detected');

      return false;
    }

    // Skip if no hierarchy context
    if (!context.hierarchyContext) {
      this.logger.debug('Step 7 skipped: No hierarchy context available');

      return false;
    }

    // Skip for public resources
    if (context.resourceContext?.confidentialityLevel === 'PUBLIC') {
      this.logger.debug('Step 7 skipped: Public resource access');

      return false;
    }

    return true;
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.HIERARCHY_VALIDATION]
      .estimatedExecutionTime;
  }
}
