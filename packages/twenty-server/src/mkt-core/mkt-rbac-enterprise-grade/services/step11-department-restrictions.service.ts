/**
 * Step 11: Department Restrictions Service
 * Validates access permissions based on department boundaries, organizational hierarchy, and cross-departmental policies
 * Part of the 15-step Enterprise RBAC validation process
 * Uses workspace entities only, no core module dependencies
 */

import { Injectable, Logger } from '@nestjs/common';

import { IsNull } from 'typeorm';
import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import { EnhancedPermissionContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
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

export interface MktDepartmentWorkspaceEntity {
  id: string;
  departmentCode: string;
  departmentName: string;
  description: string;
  budgetCode: string;
  costCenter: string;
  requiresKpiTracking: boolean;
  allowsCrossDepartmentAccess: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MktDepartmentHierarchyWorkspaceEntity {
  id: string;
  parentDepartmentId: string;
  childDepartmentId: string;
  hierarchyLevel: number;
  relationshipType: string;
  validFrom: Date;
  validTo: Date;
  inheritsPermissions: boolean;
  canEscalateToParent: boolean;
  allowsCrossBranchAccess: boolean;
  inheritsParentPermissions: boolean;
  canViewTeamData: boolean;
  canEditTeamData: boolean;
  canExportTeamData: boolean;
  minimumSecurityLevel: string;
  canApprove: boolean;
  canDelegate: boolean;
  canAudit: boolean;
  canManageUsers: boolean;
  canAccessSensitiveData: boolean;
  canOverrideSubordinates: boolean;
  requiresDualApproval: boolean;
  requiresMFA: boolean;
  canAccessAfterHours: boolean;
  requiresFullAuditTrail: boolean;
  canDeleteData: boolean;
  gdprCompliant: boolean;
  priorityLevel: number;
  permissionWeight: number;
  hierarchyPath: string[];
  securityNotes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MktOrganizationLevelWorkspaceEntity {
  id: string;
  levelCode: string;
  levelName: string;
  description: string;
  hierarchyLevel: number;
  parentLevelId: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface MktUserPermissionTemplateWorkspaceEntity {
  id: string;
  templateId: string;
  workspaceMemberId: string;
  assignedById: string;
  isActive: boolean;
  assignedAt: Date;
  expiresAt: Date;
  assignmentReason: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type DepartmentAccessLevel =
  | 'NO_ACCESS'
  | 'READ_ONLY'
  | 'LIMITED_EDIT'
  | 'FULL_ACCESS'
  | 'ADMIN_ACCESS';

type CrossDepartmentPolicy =
  | 'STRICT_ISOLATION'
  | 'LIMITED_VISIBILITY'
  | 'CONTROLLED_ACCESS'
  | 'OPEN_ACCESS';

type DepartmentSecurityLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'RESTRICTED'
  | 'CONFIDENTIAL'
  | 'TOP_SECRET';

interface DepartmentAccess {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  accessLevel: DepartmentAccessLevel;
  canView: boolean;
  canEdit: boolean;
  canExport: boolean;
  canApprove: boolean;
  canDelegate: boolean;
  canAudit: boolean;
  canManageUsers: boolean;
  inheritedPermissions: string[];
  directPermissions: string[];
  restrictions: string[];
}

interface HierarchyPosition {
  departmentId: string;
  hierarchyLevel: number;
  hierarchyPath: string[];
  parentDepartments: string[];
  childDepartments: string[];
  siblingDepartments: string[];
  canEscalateUp: boolean;
  canDelegateDown: boolean;
  crossBranchAccess: boolean;
}

interface DepartmentRestrictionResult {
  userId: string;
  primaryDepartment: string | null;
  accessibleDepartments: DepartmentAccess[];
  hierarchyPosition: HierarchyPosition | null;
  crossDepartmentPolicy: CrossDepartmentPolicy;
  securityClearanceLevel: DepartmentSecurityLevel;
  effectivePermissions: {
    canViewCrossDepartment: boolean;
    canEditCrossDepartment: boolean;
    canExportCrossDepartment: boolean;
    canAccessSensitiveData: boolean;
    requiresDualApproval: boolean;
    requiresMFA: boolean;
    canAccessAfterHours: boolean;
    requiresFullAuditTrail: boolean;
  };
  restrictions: {
    blockedDepartments: string[];
    timeBasedRestrictions: string[];
    dataExportLimitations: string[];
    approvalRequirements: string[];
  };
  complianceFlags: {
    gdprCompliant: boolean;
    requiresDataMasking: boolean;
    auditRequired: boolean;
    retentionPolicyApplied: boolean;
  };
  lastEvaluated: Date;
  nextReviewDate: Date;
}

@Injectable()
export class Step11DepartmentRestrictionsService
  implements PermissionValidationStep
{
  private readonly logger = new Logger(
    Step11DepartmentRestrictionsService.name,
  );
  readonly stepNumber = VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS];
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 110;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Get department repository
   */
  private async getDepartmentRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktDepartmentWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDepartmentWorkspaceEntity>(
      workspaceId,
      'mktDepartment',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get department hierarchy repository
   */
  private async getDepartmentHierarchyRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktDepartmentHierarchyWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDepartmentHierarchyWorkspaceEntity>(
      workspaceId,
      'mktDepartmentHierarchy',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get user permission template repository
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
   * Validate Step 11: Department Restrictions
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step 11: ${this.stepName} - Starting department restrictions check`,
      );

      // Validate prerequisites
      if (!context.userContext) {
        return {
          result: CheckResult.FAIL,
          continue: false,
          reason: 'Missing user context for department restrictions check',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: {
            error: 'USER_CONTEXT_MISSING',
            stepNumber: this.stepNumber,
          },
        };
      }

      const workspaceId = context.userContext.workspaceId || '';

      // Get complete department restrictions evaluation
      const departmentRestrictions = await this.evaluateDepartmentRestrictions(
        context.userContext.userId || context.userContext.workspaceMemberId,
        workspaceId,
      );

      const resourceDepartment = await this.identifyResourceDepartment(
        context.resourceContext?.objectName || '',
        workspaceId,
      );

      const isAllowed = await this.validateDepartmentAccess(
        departmentRestrictions,
        resourceDepartment,
        context.action || '',
        workspaceId,
      );

      // Update context with department restrictions information
      this.updateContextWithDepartmentRestrictions(
        context,
        departmentRestrictions,
      );

      this.logger.debug(`Step 11: ${this.stepName} completed successfully`);

      const result = isAllowed ? CheckResult.PASS : CheckResult.FAIL;

      return {
        result,
        continue: true,
        reason: isAllowed
          ? `Department access allowed - ${departmentRestrictions.crossDepartmentPolicy}`
          : `Department access denied - ${departmentRestrictions.crossDepartmentPolicy}`,
        executionTime: DateTime.now().diff(stepStartTime).toMillis(),
        metadata: {
          crossDepartmentPolicy: departmentRestrictions.crossDepartmentPolicy,
          securityClearanceLevel: departmentRestrictions.securityClearanceLevel,
          accessibleDepartmentCount:
            departmentRestrictions.accessibleDepartments.length,
          primaryDepartment: departmentRestrictions.primaryDepartment || '',
        },
      };
    } catch (error) {
      this.logger.error(
        `Step 11: ${this.stepName} failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        result: CheckResult.FAIL,
        continue: true,
        reason: `Department restrictions check failed: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: DateTime.now().diff(stepStartTime).toMillis(),
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stepNumber: this.stepNumber,
        },
      };
    }
  }

  /**
   * Determine if this step should execute based on context
   */
  shouldExecute(_context: EnhancedPermissionContext): boolean {
    // Always execute department restrictions check
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
    ];
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    return (
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS]
        ?.estimatedExecutionTime || 450
    );
  }

  /**
   * Check if step execution time exceeds threshold
   */
  isPerformanceOptimal(executionTime: number): boolean {
    const threshold =
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS]
        ?.maxExecutionTime || 5000;

    return executionTime <= threshold;
  }

  /**
   * Validate department access for given restrictions and resource
   */
  private async validateDepartmentAccess(
    restrictions: DepartmentRestrictionResult,
    resourceDepartmentId: string | null,
    action: string,
    workspaceId: string,
  ): Promise<boolean> {
    try {
      if (!restrictions.primaryDepartment) {
        return false;
      }

      if (!resourceDepartmentId) {
        return restrictions.crossDepartmentPolicy === 'OPEN_ACCESS';
      }

      const hasDirectAccess = restrictions.accessibleDepartments.some(
        (dept) =>
          dept.departmentId === resourceDepartmentId &&
          this.hasActionPermission(dept, action),
      );

      if (hasDirectAccess) {
        return true;
      }

      return await this.evaluateCrossDepartmentAccess(
        restrictions,
        resourceDepartmentId,
        action,
        workspaceId,
      );
    } catch (error) {
      this.logger.error('Department access validation error:', error);

      return false;
    }
  }

  /**
   * Update context with department restrictions information
   */
  private updateContextWithDepartmentRestrictions(
    context: EnhancedPermissionContext,
    restrictions: DepartmentRestrictionResult,
  ): void {
    // Store department restrictions information in context metadata
    if (!context.metadata) {
      context.metadata = {};
    }

    const convertedMetadata: Record<string, string | number | boolean | Date> =
      {};

    Object.assign(context.metadata, {
      departmentRestrictionsSource: restrictions.crossDepartmentPolicy,
      departmentSecurityLevel: restrictions.securityClearanceLevel,
      primaryDepartment: restrictions.primaryDepartment || '',
      accessibleDepartmentCount: restrictions.accessibleDepartments.length,
      departmentRestrictionsEvaluated: restrictions.lastEvaluated,
      ...convertedMetadata,
    });

    // Update department team context if it exists
    if (!context.departmentTeamContext) {
      context.departmentTeamContext = {
        userDepartmentId: restrictions.primaryDepartment || '',
        isCrossDepartment:
          restrictions.crossDepartmentPolicy !== 'STRICT_ISOLATION',
        allowCrossDepartmentAccess:
          restrictions.effectivePermissions.canViewCrossDepartment,
      };
    }
  }

  async getValidationDetails(
    userId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>> {
    const restrictions = await this.evaluateDepartmentRestrictions(
      userId,
      workspaceId,
    );

    return {
      stepNumber: this.stepNumber,
      stepName: this.stepName,
      userId,
      workspaceId,
      restrictions,
      validationStatus: 'completed',
      evaluatedAt: new Date().toISOString(),
    };
  }

  private async evaluateDepartmentRestrictions(
    userId: string,
    workspaceId: string,
  ): Promise<DepartmentRestrictionResult> {
    const userTemplates = await this.getUserPermissionTemplates(
      userId,
      workspaceId,
    );
    const primaryDepartment = await this.identifyPrimaryDepartment(
      userTemplates,
      workspaceId,
    );
    const accessibleDepartments = await this.getAccessibleDepartments(
      userTemplates,
      workspaceId,
    );
    const hierarchyPosition = await this.calculateHierarchyPosition(
      primaryDepartment,
      workspaceId,
    );
    const crossDepartmentPolicy = this.determineCrossDepartmentPolicy(
      accessibleDepartments,
      hierarchyPosition,
    );
    const securityClearanceLevel = this.determineSecurityClearanceLevel(
      accessibleDepartments,
      hierarchyPosition,
    );
    const effectivePermissions = this.calculateEffectivePermissions(
      accessibleDepartments,
      hierarchyPosition,
    );
    const restrictions = await this.calculateRestrictions(
      accessibleDepartments,
      hierarchyPosition,
      workspaceId,
    );
    const complianceFlags = this.evaluateComplianceFlags(
      accessibleDepartments,
      effectivePermissions,
    );

    return {
      userId,
      primaryDepartment,
      accessibleDepartments,
      hierarchyPosition,
      crossDepartmentPolicy,
      securityClearanceLevel,
      effectivePermissions,
      restrictions,
      complianceFlags,
      lastEvaluated: new Date(),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  }

  private async getUserPermissionTemplates(
    userId: string,
    workspaceId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const userTemplateRepo =
      await this.getUserPermissionTemplateRepository(workspaceId);

    return userTemplateRepo.find({
      where: {
        workspaceMemberId: userId,
        isActive: true,
        deletedAt: IsNull(),
      },
    });
  }

  private async identifyPrimaryDepartment(
    templates: MktUserPermissionTemplateWorkspaceEntity[],
    workspaceId: string,
  ): Promise<string | null> {
    if (templates.length === 0) {
      return null;
    }

    const departmentRepo = await this.getDepartmentRepository(workspaceId);

    const departments = await departmentRepo.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    if (departments.length > 0) {
      return departments[0].id;
    }

    return null;
  }

  private async getAccessibleDepartments(
    templates: MktUserPermissionTemplateWorkspaceEntity[],
    workspaceId: string,
  ): Promise<DepartmentAccess[]> {
    const departmentRepo = await this.getDepartmentRepository(workspaceId);
    const hierarchyRepo =
      await this.getDepartmentHierarchyRepository(workspaceId);

    const departments = await departmentRepo.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const hierarchies = await hierarchyRepo.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const accessibleDepartments: DepartmentAccess[] = [];

    for (const dept of departments) {
      const hierarchy = hierarchies.find(
        (h) =>
          h.childDepartmentId === dept.id || h.parentDepartmentId === dept.id,
      );

      const accessLevel = this.calculateDepartmentAccessLevel(
        dept,
        hierarchy,
        templates,
      );

      accessibleDepartments.push({
        departmentId: dept.id,
        departmentCode: dept.departmentCode,
        departmentName: dept.departmentName,
        accessLevel,
        canView: accessLevel !== 'NO_ACCESS',
        canEdit: ['LIMITED_EDIT', 'FULL_ACCESS', 'ADMIN_ACCESS'].includes(
          accessLevel,
        ),
        canExport: ['FULL_ACCESS', 'ADMIN_ACCESS'].includes(accessLevel),
        canApprove: hierarchy?.canApprove || false,
        canDelegate: hierarchy?.canDelegate || false,
        canAudit: hierarchy?.canAudit || false,
        canManageUsers: hierarchy?.canManageUsers || false,
        inheritedPermissions: hierarchy?.inheritsParentPermissions
          ? ['parent_permissions']
          : [],
        directPermissions: ['department_access'],
        restrictions: this.calculateDepartmentRestrictions(dept, hierarchy),
      });
    }

    return accessibleDepartments.filter(
      (dept) => dept.accessLevel !== 'NO_ACCESS',
    );
  }

  private calculateDepartmentAccessLevel(
    department: MktDepartmentWorkspaceEntity,
    hierarchy: MktDepartmentHierarchyWorkspaceEntity | undefined,
    templates: MktUserPermissionTemplateWorkspaceEntity[],
  ): DepartmentAccessLevel {
    if (templates.length === 0) {
      return 'NO_ACCESS';
    }

    if (hierarchy?.canManageUsers) {
      return 'ADMIN_ACCESS';
    }

    if (hierarchy?.canEditTeamData && hierarchy?.canExportTeamData) {
      return 'FULL_ACCESS';
    }

    if (hierarchy?.canEditTeamData) {
      return 'LIMITED_EDIT';
    }

    if (hierarchy?.canViewTeamData || department.allowsCrossDepartmentAccess) {
      return 'READ_ONLY';
    }

    return 'NO_ACCESS';
  }

  private calculateDepartmentRestrictions(
    department: MktDepartmentWorkspaceEntity,
    hierarchy: MktDepartmentHierarchyWorkspaceEntity | undefined,
  ): string[] {
    const restrictions: string[] = [];

    if (!department.allowsCrossDepartmentAccess) {
      restrictions.push('no_cross_department_access');
    }

    if (hierarchy?.requiresDualApproval) {
      restrictions.push('requires_dual_approval');
    }

    if (hierarchy?.requiresMFA) {
      restrictions.push('requires_mfa');
    }

    if (!hierarchy?.canAccessAfterHours) {
      restrictions.push('business_hours_only');
    }

    if (hierarchy?.requiresFullAuditTrail) {
      restrictions.push('full_audit_required');
    }

    if (!hierarchy?.canDeleteData) {
      restrictions.push('no_data_deletion');
    }

    return restrictions;
  }

  private async calculateHierarchyPosition(
    primaryDepartmentId: string | null,
    workspaceId: string,
  ): Promise<HierarchyPosition | null> {
    if (!primaryDepartmentId) {
      return null;
    }

    const hierarchyRepo =
      await this.getDepartmentHierarchyRepository(workspaceId);

    const hierarchies = await hierarchyRepo.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    const departmentHierarchies = hierarchies.filter(
      (h) =>
        h.childDepartmentId === primaryDepartmentId ||
        h.parentDepartmentId === primaryDepartmentId,
    );

    const parentDepartments = departmentHierarchies
      .filter((h) => h.childDepartmentId === primaryDepartmentId)
      .map((h) => h.parentDepartmentId);

    const childDepartments = departmentHierarchies
      .filter((h) => h.parentDepartmentId === primaryDepartmentId)
      .map((h) => h.childDepartmentId);

    const siblingDepartments = this.findSiblingDepartments(
      primaryDepartmentId,
      hierarchies,
    );

    const hierarchy = departmentHierarchies[0];
    const hierarchyPath = hierarchy?.hierarchyPath || [primaryDepartmentId];

    return {
      departmentId: primaryDepartmentId,
      hierarchyLevel: hierarchy?.hierarchyLevel || 1,
      hierarchyPath,
      parentDepartments,
      childDepartments,
      siblingDepartments,
      canEscalateUp: hierarchy?.canEscalateToParent || false,
      canDelegateDown: hierarchy?.canDelegate || false,
      crossBranchAccess: hierarchy?.allowsCrossBranchAccess || false,
    };
  }

  private findSiblingDepartments(
    departmentId: string,
    hierarchies: MktDepartmentHierarchyWorkspaceEntity[],
  ): string[] {
    const parentIds = hierarchies
      .filter((h) => h.childDepartmentId === departmentId)
      .map((h) => h.parentDepartmentId);

    const siblings: string[] = [];

    for (const parentId of parentIds) {
      const siblingIds = hierarchies
        .filter(
          (h) =>
            h.parentDepartmentId === parentId &&
            h.childDepartmentId !== departmentId,
        )
        .map((h) => h.childDepartmentId);

      siblings.push(...siblingIds);
    }

    return [...new Set(siblings)];
  }

  private determineCrossDepartmentPolicy(
    accessibleDepartments: DepartmentAccess[],
    hierarchyPosition: HierarchyPosition | null,
  ): CrossDepartmentPolicy {
    if (!hierarchyPosition) {
      return 'STRICT_ISOLATION';
    }

    const hasAdminAccess = accessibleDepartments.some(
      (dept) => dept.accessLevel === 'ADMIN_ACCESS',
    );

    if (hasAdminAccess) {
      return 'OPEN_ACCESS';
    }

    const hasFullAccess = accessibleDepartments.some(
      (dept) => dept.accessLevel === 'FULL_ACCESS',
    );

    if (hasFullAccess && hierarchyPosition.crossBranchAccess) {
      return 'CONTROLLED_ACCESS';
    }

    const hasReadAccess = accessibleDepartments.some(
      (dept) => dept.accessLevel === 'READ_ONLY',
    );

    if (hasReadAccess) {
      return 'LIMITED_VISIBILITY';
    }

    return 'STRICT_ISOLATION';
  }

  private determineSecurityClearanceLevel(
    accessibleDepartments: DepartmentAccess[],
    hierarchyPosition: HierarchyPosition | null,
  ): DepartmentSecurityLevel {
    if (!hierarchyPosition) {
      return 'PUBLIC';
    }

    const hasAdminAccess = accessibleDepartments.some(
      (dept) => dept.accessLevel === 'ADMIN_ACCESS',
    );

    if (hasAdminAccess) {
      return 'TOP_SECRET';
    }

    const hasFullAccess = accessibleDepartments.some(
      (dept) => dept.accessLevel === 'FULL_ACCESS',
    );

    if (hasFullAccess) {
      return 'CONFIDENTIAL';
    }

    const hasEditAccess = accessibleDepartments.some(
      (dept) => dept.accessLevel === 'LIMITED_EDIT',
    );

    if (hasEditAccess) {
      return 'RESTRICTED';
    }

    const hasReadAccess = accessibleDepartments.some(
      (dept) => dept.accessLevel === 'READ_ONLY',
    );

    if (hasReadAccess) {
      return 'INTERNAL';
    }

    return 'PUBLIC';
  }

  private calculateEffectivePermissions(
    accessibleDepartments: DepartmentAccess[],
    _hierarchyPosition: HierarchyPosition | null,
  ): DepartmentRestrictionResult['effectivePermissions'] {
    const permissions = {
      canViewCrossDepartment: false,
      canEditCrossDepartment: false,
      canExportCrossDepartment: false,
      canAccessSensitiveData: false,
      requiresDualApproval: false,
      requiresMFA: false,
      canAccessAfterHours: false,
      requiresFullAuditTrail: false,
    };

    for (const dept of accessibleDepartments) {
      if (dept.canView) permissions.canViewCrossDepartment = true;
      if (dept.canEdit) permissions.canEditCrossDepartment = true;
      if (dept.canExport) permissions.canExportCrossDepartment = true;

      if (dept.restrictions.includes('requires_dual_approval')) {
        permissions.requiresDualApproval = true;
      }
      if (dept.restrictions.includes('requires_mfa')) {
        permissions.requiresMFA = true;
      }
      if (!dept.restrictions.includes('business_hours_only')) {
        permissions.canAccessAfterHours = true;
      }
      if (dept.restrictions.includes('full_audit_required')) {
        permissions.requiresFullAuditTrail = true;
      }
    }

    const hasHighAccessLevel = accessibleDepartments.some((dept) =>
      ['FULL_ACCESS', 'ADMIN_ACCESS'].includes(dept.accessLevel),
    );

    permissions.canAccessSensitiveData = hasHighAccessLevel;

    return permissions;
  }

  private async calculateRestrictions(
    accessibleDepartments: DepartmentAccess[],
    hierarchyPosition: HierarchyPosition | null,
    workspaceId: string,
  ): Promise<DepartmentRestrictionResult['restrictions']> {
    const allDepartments = await this.getAllDepartmentIds(workspaceId);
    const accessibleIds = accessibleDepartments.map(
      (dept) => dept.departmentId,
    );
    const blockedDepartments = allDepartments.filter(
      (id) => !accessibleIds.includes(id),
    );

    const timeBasedRestrictions: string[] = [];
    const dataExportLimitations: string[] = [];
    const approvalRequirements: string[] = [];

    for (const dept of accessibleDepartments) {
      if (dept.restrictions.includes('business_hours_only')) {
        timeBasedRestrictions.push(
          `${dept.departmentCode}: business hours only`,
        );
      }
      if (!dept.canExport) {
        dataExportLimitations.push(`${dept.departmentCode}: no data export`);
      }
      if (dept.restrictions.includes('requires_dual_approval')) {
        approvalRequirements.push(
          `${dept.departmentCode}: dual approval required`,
        );
      }
    }

    return {
      blockedDepartments,
      timeBasedRestrictions,
      dataExportLimitations,
      approvalRequirements,
    };
  }

  private async getAllDepartmentIds(workspaceId: string): Promise<string[]> {
    const departmentRepo = await this.getDepartmentRepository(workspaceId);

    const departments = await departmentRepo.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
      select: ['id'],
    });

    return departments.map((dept) => dept.id);
  }

  private evaluateComplianceFlags(
    accessibleDepartments: DepartmentAccess[],
    effectivePermissions: DepartmentRestrictionResult['effectivePermissions'],
  ): DepartmentRestrictionResult['complianceFlags'] {
    const hasGdprCompliantDept = accessibleDepartments.some((dept) =>
      dept.restrictions.includes('gdpr_compliant'),
    );

    return {
      gdprCompliant: hasGdprCompliantDept,
      requiresDataMasking: effectivePermissions.canAccessSensitiveData,
      auditRequired: effectivePermissions.requiresFullAuditTrail,
      retentionPolicyApplied: effectivePermissions.canExportCrossDepartment,
    };
  }

  private async identifyResourceDepartment(
    resource: string,
    workspaceId: string,
  ): Promise<string | null> {
    const resourcePatterns = {
      mktInvoice: 'FINANCE',
      mktPayment: 'FINANCE',
      mktCustomer: 'SALES',
      mktOrder: 'SALES',
      mktContract: 'LEGAL',
      person: 'HR',
      company: 'SALES',
    };

    const resourceType = Object.keys(resourcePatterns).find((pattern) =>
      resource.toLowerCase().includes(pattern.toLowerCase()),
    );

    if (!resourceType) {
      return null;
    }

    const expectedDepartmentCode =
      resourcePatterns[resourceType as keyof typeof resourcePatterns];

    const departmentRepo = await this.getDepartmentRepository(workspaceId);

    const department = await departmentRepo.findOne({
      where: {
        departmentCode: expectedDepartmentCode,
        isActive: true,
        deletedAt: IsNull(),
      },
    });

    return department?.id || null;
  }

  private hasActionPermission(
    department: DepartmentAccess,
    action: string,
  ): boolean {
    switch (action.toLowerCase()) {
      case 'read':
      case 'view':
        return department.canView;
      case 'edit':
      case 'update':
        return department.canEdit;
      case 'delete':
        return department.accessLevel === 'ADMIN_ACCESS';
      case 'export':
        return department.canExport;
      case 'approve':
        return department.canApprove;
      case 'audit':
        return department.canAudit;
      default:
        return department.canView;
    }
  }

  private async evaluateCrossDepartmentAccess(
    restrictions: DepartmentRestrictionResult,
    resourceDepartmentId: string,
    action: string,
    workspaceId: string,
  ): Promise<boolean> {
    if (restrictions.crossDepartmentPolicy === 'STRICT_ISOLATION') {
      return false;
    }

    if (restrictions.crossDepartmentPolicy === 'OPEN_ACCESS') {
      return true;
    }

    if (restrictions.hierarchyPosition?.crossBranchAccess) {
      const isInHierarchy =
        restrictions.hierarchyPosition.parentDepartments.includes(
          resourceDepartmentId,
        ) ||
        restrictions.hierarchyPosition.childDepartments.includes(
          resourceDepartmentId,
        ) ||
        restrictions.hierarchyPosition.siblingDepartments.includes(
          resourceDepartmentId,
        );

      if (isInHierarchy) {
        return this.hasHierarchyBasedAccess(restrictions, action);
      }
    }

    if (restrictions.crossDepartmentPolicy === 'LIMITED_VISIBILITY') {
      return action.toLowerCase() === 'read' || action.toLowerCase() === 'view';
    }

    if (restrictions.crossDepartmentPolicy === 'CONTROLLED_ACCESS') {
      const allowedActions = ['read', 'view', 'edit'];

      return allowedActions.includes(action.toLowerCase());
    }

    return false;
  }

  private hasHierarchyBasedAccess(
    restrictions: DepartmentRestrictionResult,
    action: string,
  ): boolean {
    const { effectivePermissions } = restrictions;

    switch (action.toLowerCase()) {
      case 'read':
      case 'view':
        return effectivePermissions.canViewCrossDepartment;
      case 'edit':
      case 'update':
        return effectivePermissions.canEditCrossDepartment;
      case 'export':
        return effectivePermissions.canExportCrossDepartment;
      case 'delete':
        return restrictions.securityClearanceLevel === 'TOP_SECRET';
      default:
        return effectivePermissions.canViewCrossDepartment;
    }
  }
}
