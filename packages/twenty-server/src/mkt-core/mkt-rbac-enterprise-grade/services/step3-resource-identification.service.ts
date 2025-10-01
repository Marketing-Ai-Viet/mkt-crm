/**
 * Resource Identification Service (Step 3)
 * Identifies and classifies resources, analyzes sensitivity, and resolves ownership chains
 * Based on Step 2 patterns and Twenty.com database architecture
 */

import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  ResourceContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  STEP_PERFORMANCE_CONFIG,
  VALIDATION_STEPS,
  DATA_CLASSIFICATION,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  ResourceMetadata,
  OwnershipInheritanceChain,
  ResourceClassificationConfig,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/resource-identification.types';
import { VALIDATION_STEP_NAMES } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';
import { MktUserPermissionOverrideWorkspaceEntity } from 'src/mkt-core/mkt-permission-template/entities/mkt-user-permission-override.workspace-entity';

/**
 * Resource Identification Service - Step 3 in the 15-step validation process
 * Following Step 2 implementation patterns
 */
@Injectable()
export class Step3ResourceIdentificationService
  implements PermissionValidationStep
{
  private readonly logger = new Logger(Step3ResourceIdentificationService.name);

  // Step identification
  readonly stepNumber = VALIDATION_STEPS.RESOURCE_IDENTIFICATION;
  readonly stepName =
    VALIDATION_STEP_NAMES[VALIDATION_STEPS.RESOURCE_IDENTIFICATION];
  readonly description =
    'Identify resource type, ownership, sensitivity, and dependencies';

  // Step configuration
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.RESOURCE_IDENTIFICATION].priority;

  // Dependencies
  readonly dependsOn = [
    VALIDATION_STEPS.PRE_VALIDATION,
    VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
  ];
  readonly conflicts = undefined;

  // Performance settings
  readonly maxExecutionTime =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.RESOURCE_IDENTIFICATION]
      .maxExecutionTime;
  readonly enableCaching =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.RESOURCE_IDENTIFICATION]
      .enableCaching;
  readonly cacheExpirationTime =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.RESOURCE_IDENTIFICATION]
      .cacheExpirationTime;
  readonly retryAttempts =
    STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.RESOURCE_IDENTIFICATION]
      .retryAttempts;

  // Resource classification configuration
  private readonly classificationConfig: ResourceClassificationConfig = {
    systemObjects: [
      'user',
      'workspace',
      'permission',
      'role',
      'setting',
      'objectMetadata',
    ],
    configObjects: ['view', 'webhook', 'apiKey', 'appToken'],
    auditObjects: ['mktPermissionAudit', 'timelineActivity', 'workflowRun'],
    userObjects: ['person', 'workspaceMember', 'company', 'opportunity'],
    financialObjects: ['mktInvoice', 'mktPayment', 'mktOrder', 'mktContract'],
    complianceObjects: ['mktDataAccessPolicy', 'mktPermissionTemplate'],
    sensitivePatterns: [
      'salary',
      'wage',
      'payment',
      'ssn',
      'personal',
      'medical',
      'password',
      'token',
      'credential',
    ],
    retentionMapping: {
      AUDIT: 2555, // 7 years
      FINANCIAL: 2555, // 7 years
      PERSONAL: 1095, // 3 years
      BUSINESS: 365, // 1 year
      SYSTEM: 1825, // 5 years
    },
    complianceFrameworks: {
      FINANCIAL: ['SOX', 'PCI_DSS'],
      PERSONAL: ['GDPR', 'CCPA'],
      MEDICAL: ['HIPAA'],
      AUDIT: ['ISO_27001', 'SOC_2'],
    },
  };

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Get User Permission Override repository
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
   * Determine if this step should be executed based on context
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // Execute if resource context is missing or incomplete
    return !(
      context.resourceContext?.objectName &&
      context.resourceContext?.resourceType &&
      context.resourceContext?.confidentialityLevel &&
      context.resourceContext?.ownerId
    );
  }

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(context: EnhancedPermissionContext): number {
    if (
      context.resourceContext?.objectName &&
      context.resourceContext?.recordId
    ) {
      return STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.RESOURCE_IDENTIFICATION]
        .estimatedExecutionTime;
    }

    return this.maxExecutionTime;
  }

  /**
   * Execute Step 3: Resource Identification
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    this.logger.debug(
      `Starting Step 3: ${this.stepName} for resource ${context.resourceContext?.objectName}`,
    );

    try {
      // Check if we can skip this step
      if (!this.shouldExecute(context)) {
        return this.createSkipResult(
          'Resource context already resolved',
          stepStartTime,
        );
      }
      const objectName = context.resourceContext?.objectName;
      const recordId = context.resourceContext?.recordId;

      if (!objectName) {
        return this.createFailResult(
          'Resource object name is required',
          stepStartTime,
        );
      }

      // 1. Identify and classify resource
      const resourceMetadata = await this.identifyAndClassifyResource(
        objectName,
        recordId,
        context.userContext.workspaceId,
      );

      // 2. Resolve ownership and inheritance chain
      const ownershipChain = await this.buildOwnershipInheritanceChain(
        objectName,
        recordId,
        context.userContext.workspaceId,
      );

      // 3. Build enhanced resource context
      const enhancedResourceContext = await this.buildEnhancedResourceContext(
        resourceMetadata,
        ownershipChain,
      );

      // Update context with enhanced resource information
      context.resourceContext = enhancedResourceContext;

      this.logger.debug(`Step 3: ${this.stepName} completed successfully`);

      return {
        result: CheckResult.PASS,
        reason: 'Resource identification completed successfully',
        continue: true,
        executionTime: DateTime.now().diff(stepStartTime).as('milliseconds'),
        metadata: {
          resourceIdentified: true,
          resourceType: enhancedResourceContext.resourceType,
          sensitivityLevel:
            enhancedResourceContext.confidentialityLevel || 'INTERNAL',
          ownerResolved: !!ownershipChain.ownerId,
          departmentResolved: !!ownershipChain.userDepartment,
        },
        modifyContext: {
          resourceContext: enhancedResourceContext,
        },
      };
    } catch (error) {
      this.logger.error(
        `Step 3: ${this.stepName} error: ${error.message}`,
        error.stack,
      );

      return this.createFailResult(
        `Resource identification error: ${error.message}`,
        stepStartTime,
      );
    }
  }

  /**
   * Identify and classify resource type and metadata
   */
  private async identifyAndClassifyResource(
    objectName: string,
    recordId: string | undefined,
    workspaceId: string,
  ): Promise<ResourceMetadata> {
    try {
      // Use user permission override repository to check if resource has any overrides
      const overrideRepository =
        await this.getUserPermissionOverrideRepository(workspaceId);

      // Get resource-related overrides to understand access patterns
      // This helps identify if resource has special access requirements
      const resourceOverrides = await overrideRepository.find({
        where: { resourceId: objectName, isActive: true },
        take: 5, // Sample a few overrides to understand patterns
      });

      // Classify resource type
      const resourceType = this.classifyResourceType(objectName);
      const resourceCategory = this.determineResourceCategory(resourceType);

      // Determine data classification and sensitivity level
      const dataClassification = this.determineDataClassification(
        objectName,
        resourceType,
      );
      const sensitivityLevel = this.determineSensitivityLevel(
        objectName,
        resourceType,
      );

      // Check if encryption is required
      const encryptionRequired = this.requiresEncryption(
        sensitivityLevel,
        resourceType,
      );

      // Check if compliance frameworks apply
      const complianceRequired = this.requiresCompliance(
        resourceType,
        dataClassification,
      );

      // Determine audit level
      const auditLevel = this.determineAuditLevel(
        resourceType,
        sensitivityLevel,
      );

      // Calculate retention period
      const retentionPeriod = this.calculateRetentionPeriod(
        resourceType,
        dataClassification,
      );

      // Identify access restrictions
      const accessRestrictions = this.identifyAccessRestrictions(
        sensitivityLevel,
        resourceType,
      );

      // Analyze override patterns to detect special access requirements
      const hasActiveOverrides = resourceOverrides.length > 0;
      const hasGrantOverrides = resourceOverrides.some(
        (o) => o.isAllowed === true,
      );
      const hasRevokeOverrides = resourceOverrides.some(
        (o) => o.isAllowed === false,
      );

      // Check if resource has expired overrides (indicates time-sensitive access)
      const hasExpiredOverrides = resourceOverrides.some(
        (o) => o.expiresAt && new Date(o.expiresAt) < new Date(),
      );

      return {
        objectName,
        objectId: recordId,
        resourceType,
        resourceCategory,
        sensitivityLevel,
        dataClassification,
        ownerId: undefined, // Will be resolved separately
        departmentId: undefined, // Will be resolved separately
        isShared: false, // Default, will be updated if sharing is detected
        isPublic: sensitivityLevel === DATA_CLASSIFICATION.PUBLIC,
        encryptionRequired,
        complianceRequired,
        auditLevel,
        retentionPeriod,
        accessRestrictions,
        crossReferences: [], // Will be populated by cross-reference analysis
        dependencies: [], // Will be populated by dependency analysis
        customAttributes: {
          hasPermissionOverrides: hasActiveOverrides,
          hasGrantOverrides,
          hasRevokeOverrides,
          hasExpiredOverrides,
          activeOverrideCount: resourceOverrides.length,
          isStandard: !objectName.startsWith('mkt'),
          isCustomObject: objectName.startsWith('mkt'),
          analyzedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Error identifying resource: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build ownership inheritance chain following Step 2 patterns
   */
  private async buildOwnershipInheritanceChain(
    objectName: string,
    recordId: string | undefined,
    workspaceId: string,
  ): Promise<OwnershipInheritanceChain> {
    try {
      let ownerId = 'system';
      let userDepartment: string | undefined;
      let parentDepartments: string[] = [];

      // Try to resolve record owner if recordId is provided
      if (recordId) {
        const recordOwner = await this.resolveRecordOwnership(
          objectName,
          recordId,
          workspaceId,
        );

        if (recordOwner) {
          ownerId = recordOwner;
        }
      }

      // If owner is a user, get their department and hierarchy
      if (ownerId !== 'system') {
        const userContext = await this.getUserOrganizationalContext(
          ownerId,
          workspaceId,
        );

        if (userContext) {
          userDepartment = userContext.departmentId;
          if (userDepartment) {
            parentDepartments = await this.getDepartmentHierarchyPath(
              userDepartment,
              workspaceId,
            );
          }
        }
      }

      // Build inheritance order
      const inheritanceOrder: string[] = [ownerId];

      if (userDepartment) {
        inheritanceOrder.push(userDepartment);
        inheritanceOrder.push(...parentDepartments);
      }
      inheritanceOrder.push(`workspace:${workspaceId}`);

      return {
        ownerId,
        userDepartment,
        parentDepartments,
        workspaceId,
        inheritanceOrder,
        permissionCascade: true,
      };
    } catch (error) {
      this.logger.error(`Error building ownership chain: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build enhanced resource context
   */
  private async buildEnhancedResourceContext(
    resourceMetadata: ResourceMetadata,
    ownershipChain: OwnershipInheritanceChain,
  ): Promise<ResourceContext> {
    return {
      objectName: resourceMetadata.objectName,
      recordId: resourceMetadata.objectId,
      resourceType: resourceMetadata.resourceType as
        | 'BUSINESS_DATA'
        | 'SYSTEM_CONFIG'
        | 'USER_MGMT'
        | 'FINANCIAL'
        | 'REPORTING',
      resourceCategory: resourceMetadata.resourceCategory,
      confidentialityLevel: resourceMetadata.sensitivityLevel as
        | 'PUBLIC'
        | 'INTERNAL'
        | 'CONFIDENTIAL'
        | 'RESTRICTED'
        | 'TOP_SECRET',
      dataClassification: {
        containsPII: resourceMetadata.sensitivityLevel === 'RESTRICTED',
        containsFinancialInfo:
          resourceMetadata.resourceType.includes('FINANCIAL'),
        retentionPeriod: resourceMetadata.retentionPeriod,
        encryptionRequired: resourceMetadata.encryptionRequired,
        auditRequired: resourceMetadata.auditLevel !== 'NONE',
      },
      ownerId: ownershipChain.ownerId,
      departmentId: ownershipChain.userDepartment,
      isSystemResource: resourceMetadata.resourceType.includes('SYSTEM'),
      isSensitive: resourceMetadata.sensitivityLevel !== 'PUBLIC',
      isFinancialData: resourceMetadata.resourceType.includes('FINANCIAL'),
      isPersonalData: resourceMetadata.sensitivityLevel === 'RESTRICTED',
      isAuditData: resourceMetadata.resourceType.includes('AUDIT'),
      dependencies: {
        requiredResources: [],
        blockedByResources: [],
        relatedResources: [],
      },
    };
  }

  // ================= HELPER METHODS =================

  private async getWorkspaceMemberRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<WorkspaceMemberWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
      workspaceId,
      'workspaceMember',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getDepartmentHierarchyRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktDepartmentHierarchyWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDepartmentHierarchyWorkspaceEntity>(
      workspaceId,
      'mktDepartmentHierarchy',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async resolveRecordOwnership(
    objectName: string,
    recordId: string,
    workspaceId: string,
  ): Promise<string | undefined> {
    try {
      const repository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          objectName,
          { shouldBypassPermissionChecks: true },
        );

      // Try common owner field names
      const ownerFields = [
        'ownerId',
        'createdById',
        'userId',
        'workspaceMemberId',
      ];

      for (const field of ownerFields) {
        try {
          const record = await repository.findOne({
            where: { id: recordId },
            select: [field],
          });

          if (record?.[field]) {
            return record[field];
          }
        } catch (error) {
          // Field might not exist, continue to next
          continue;
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error(`Error resolving record ownership: ${error.message}`);

      return undefined;
    }
  }

  private async getUserOrganizationalContext(
    userId: string,
    workspaceId: string,
  ): Promise<
    { departmentId?: string; organizationLevelId?: string } | undefined
  > {
    try {
      const workspaceMemberRepository =
        await this.getWorkspaceMemberRepository(workspaceId);

      const member = await workspaceMemberRepository.findOne({
        where: { id: userId },
        select: {
          id: true,
          departmentId: true,
          organizationLevelId: true,
        },
      });

      return member
        ? {
            departmentId: member.departmentId || undefined,
            organizationLevelId: member.organizationLevelId || undefined,
          }
        : undefined;
    } catch (error) {
      this.logger.error(
        `Error getting user organizational context: ${error.message}`,
      );

      return undefined;
    }
  }

  private async getDepartmentHierarchyPath(
    departmentId: string,
    workspaceId: string,
  ): Promise<string[]> {
    try {
      const parentDepartments: string[] = [];
      const hierarchyRepository =
        await this.getDepartmentHierarchyRepository(workspaceId);

      const hierarchyRelations = await hierarchyRepository.find({
        where: {
          childDepartmentId: departmentId,
          isActive: true,
        },
        select: {
          parentDepartmentId: true,
          hierarchyLevel: true,
        },
        order: {
          hierarchyLevel: 'ASC',
        },
      });

      // Build path from hierarchy relations
      for (const relation of hierarchyRelations) {
        if (relation.parentDepartmentId) {
          parentDepartments.push(relation.parentDepartmentId);
          // Recursively get parent departments
          const grandParents = await this.getDepartmentHierarchyPath(
            relation.parentDepartmentId,
            workspaceId,
          );

          parentDepartments.push(...grandParents);
        }
      }

      return [...new Set(parentDepartments)]; // Remove duplicates
    } catch (error) {
      this.logger.error(
        `Error getting department hierarchy path: ${error.message}`,
      );

      return [];
    }
  }

  // Classification helper methods
  private classifyResourceType(objectName: string): string {
    const nameLower = objectName.toLowerCase();

    if (
      this.classificationConfig.systemObjects.some((obj) =>
        nameLower.includes(obj),
      )
    ) {
      return 'SYSTEM_CONFIG';
    }
    if (
      this.classificationConfig.financialObjects.some((obj) =>
        nameLower.includes(obj),
      )
    ) {
      return 'FINANCIAL';
    }
    if (
      this.classificationConfig.auditObjects.some((obj) =>
        nameLower.includes(obj),
      )
    ) {
      return 'AUDIT_DATA';
    }
    if (
      this.classificationConfig.userObjects.some((obj) =>
        nameLower.includes(obj),
      )
    ) {
      return 'USER_MGMT';
    }

    return 'BUSINESS_DATA';
  }

  private determineResourceCategory(resourceType: string): string {
    const categoryMapping: Record<string, string> = {
      SYSTEM_CONFIG: 'SYSTEM',
      FINANCIAL: 'FINANCIAL',
      USER_MGMT: 'USER_DATA',
      AUDIT_DATA: 'AUDIT',
      BUSINESS_DATA: 'BUSINESS',
    };

    return categoryMapping[resourceType] || 'GENERAL';
  }

  private determineDataClassification(
    objectName: string,
    resourceType: string,
  ): string {
    if (resourceType === 'FINANCIAL' || resourceType === 'AUDIT_DATA') {
      return 'RESTRICTED';
    }
    if (resourceType === 'SYSTEM_CONFIG') {
      return 'CONFIDENTIAL';
    }
    if (
      this.classificationConfig.sensitivePatterns.some((pattern) =>
        objectName.toLowerCase().includes(pattern),
      )
    ) {
      return 'CONFIDENTIAL';
    }

    return 'INTERNAL';
  }

  private determineSensitivityLevel(
    objectName: string,
    resourceType: string,
  ): string {
    const nameLower = objectName.toLowerCase();

    if (resourceType === 'FINANCIAL' && nameLower.includes('payment')) {
      return 'RESTRICTED';
    }
    if (nameLower.includes('password') || nameLower.includes('token')) {
      return 'TOP_SECRET';
    }
    if (resourceType === 'AUDIT_DATA') {
      return 'RESTRICTED';
    }
    if (resourceType === 'SYSTEM_CONFIG') {
      return 'CONFIDENTIAL';
    }

    return 'INTERNAL';
  }

  private requiresEncryption(
    sensitivityLevel: string,
    resourceType: string,
  ): boolean {
    return (
      sensitivityLevel === 'TOP_SECRET' ||
      sensitivityLevel === 'RESTRICTED' ||
      resourceType === 'FINANCIAL'
    );
  }

  private requiresCompliance(
    resourceType: string,
    dataClassification: string,
  ): boolean {
    return (
      resourceType === 'FINANCIAL' ||
      dataClassification === 'RESTRICTED' ||
      dataClassification === 'CONFIDENTIAL'
    );
  }

  private determineAuditLevel(
    resourceType: string,
    sensitivityLevel: string,
  ): string {
    if (resourceType === 'FINANCIAL' || sensitivityLevel === 'TOP_SECRET') {
      return 'COMPREHENSIVE';
    }
    if (resourceType === 'AUDIT_DATA' || sensitivityLevel === 'RESTRICTED') {
      return 'DETAILED';
    }
    if (sensitivityLevel === 'CONFIDENTIAL') {
      return 'STANDARD';
    }

    return 'BASIC';
  }

  private calculateRetentionPeriod(
    resourceType: string,
    dataClassification: string,
  ): number | undefined {
    if (resourceType === 'AUDIT_DATA' || resourceType === 'FINANCIAL') {
      return this.classificationConfig.retentionMapping.AUDIT;
    }
    if (dataClassification === 'RESTRICTED') {
      return this.classificationConfig.retentionMapping.PERSONAL;
    }

    return this.classificationConfig.retentionMapping.BUSINESS;
  }

  private identifyAccessRestrictions(
    sensitivityLevel: string,
    resourceType: string,
  ): string[] {
    const restrictions: string[] = [];

    if (sensitivityLevel === 'TOP_SECRET') {
      restrictions.push('C_LEVEL_ONLY', 'MFA_REQUIRED', 'IP_RESTRICTED');
    } else if (sensitivityLevel === 'RESTRICTED') {
      restrictions.push('SENIOR_MANAGEMENT_ONLY', 'MFA_REQUIRED');
    } else if (sensitivityLevel === 'CONFIDENTIAL') {
      restrictions.push('DEPARTMENT_ONLY');
    }

    if (resourceType === 'FINANCIAL') {
      restrictions.push('DUAL_APPROVAL', 'FULL_AUDIT_TRAIL');
    }

    return restrictions;
  }

  // Result helper methods
  private createSkipResult(
    reason: string,
    startTime: DateTime,
  ): StepValidationResult {
    return {
      result: CheckResult.SKIP,
      reason,
      continue: true,
      executionTime: DateTime.now().diff(startTime).as('milliseconds'),
    };
  }

  private createFailResult(
    reason: string,
    startTime: DateTime,
  ): StepValidationResult {
    return {
      result: CheckResult.FAIL,
      reason,
      continue: false,
      executionTime: DateTime.now().diff(startTime).as('milliseconds'),
      errors: [reason],
    };
  }
}
