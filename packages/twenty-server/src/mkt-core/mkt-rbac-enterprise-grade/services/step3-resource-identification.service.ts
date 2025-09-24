/**
 * Resource Identification Service (Step 3)
 * Identifies and classifies resources, analyzes sensitivity, and resolves ownership chains
 * Based on Step 2 patterns and Twenty.com database architecture
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DateTime } from 'luxon';
import { Repository } from 'typeorm';

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
  SensitivityAnalysisResult,
  CrossReferenceAnalysis,
  OwnershipInheritanceChain,
  ResourceClassificationConfig,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/resource-identification.types';
import { VALIDATION_STEP_NAMES } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';
import { ObjectMetadataEntity } from 'src/engine/metadata-modules/object-metadata/object-metadata.entity';
import { FieldMetadataEntity } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';

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
    @InjectRepository(ObjectMetadataEntity, 'core')
    private readonly objectMetadataRepository: Repository<ObjectMetadataEntity>,
  ) {}

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

      // 2. Perform sensitivity analysis
      const sensitivityAnalysis = await this.performSensitivityAnalysis(
        objectName,
        recordId,
        context.userContext.workspaceId,
      );

      // 3. Resolve ownership and inheritance chain
      const ownershipChain = await this.buildOwnershipInheritanceChain(
        objectName,
        recordId,
        context.userContext.workspaceId,
      );

      // 4. Analyze cross-references and dependencies
      const crossReferences = await this.analyzeCrossReferences(
        objectName,
        recordId,
        context.userContext.workspaceId,
      );

      // 5. Build enhanced resource context
      const enhancedResourceContext = await this.buildEnhancedResourceContext(
        resourceMetadata,
        sensitivityAnalysis,
        ownershipChain,
        crossReferences,
        context,
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
          dependenciesAnalyzed: crossReferences.referencingObjects.length > 0,
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
      // Get object metadata using direct repository access
      const objectMetadata = await this.objectMetadataRepository.findOne({
        where: {
          nameSingular: objectName,
          workspaceId: workspaceId,
          isActive: true,
        },
        relations: ['fields'],
      });

      if (!objectMetadata) {
        throw new Error(`Object metadata not found for: ${objectName}`);
      }

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
          objectMetadataId: objectMetadata.id,
          fieldCount: objectMetadata.fields?.length || 0,
          isStandard: objectMetadata.isSystem || false,
          createdAt: objectMetadata.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error identifying resource: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform sensitivity analysis on the resource
   */
  private async performSensitivityAnalysis(
    objectName: string,
    recordId: string | undefined,
    workspaceId: string,
  ): Promise<SensitivityAnalysisResult> {
    try {
      let sensitivityScore = 0;
      const triggeredPatterns: string[] = [];
      const fieldAnalysis: SensitivityAnalysisResult['fieldAnalysis'] = [];

      // Check object name against sensitive patterns
      const objectNameLower = objectName.toLowerCase();

      this.classificationConfig.sensitivePatterns.forEach((pattern) => {
        if (objectNameLower.includes(pattern)) {
          sensitivityScore += 10;
          triggeredPatterns.push(`object:${pattern}`);
        }
      });

      // Get object metadata and analyze fields
      const objectMetadata = await this.objectMetadataRepository.findOne({
        where: {
          nameSingular: objectName,
          workspaceId: workspaceId,
          isActive: true,
        },
        relations: ['fields'],
      });

      if (objectMetadata?.fields) {
        objectMetadata.fields.forEach((field: FieldMetadataEntity) => {
          const fieldNameLower = field.name.toLowerCase();
          let fieldSensitivity = 0;

          this.classificationConfig.sensitivePatterns.forEach((pattern) => {
            if (fieldNameLower.includes(pattern)) {
              fieldSensitivity += 5;
              triggeredPatterns.push(`field:${field.name}:${pattern}`);
            }
          });

          // Additional scoring based on field type
          if (field.type === 'TEXT' && fieldNameLower.includes('password')) {
            fieldSensitivity += 15;
          }
          if (field.type === 'EMAILS' || field.type === 'PHONES') {
            fieldSensitivity += 8;
          }

          if (fieldSensitivity > 0) {
            fieldAnalysis.push({
              fieldName: field.name,
              fieldType: field.type,
              sensitivityContribution: fieldSensitivity,
            });
            sensitivityScore += fieldSensitivity;
          }
        });
      }

      // Determine final sensitivity level
      let sensitivityLevel: SensitivityAnalysisResult['sensitivityLevel'];

      if (sensitivityScore >= 30) {
        sensitivityLevel = 'TOP_SECRET';
      } else if (sensitivityScore >= 20) {
        sensitivityLevel = 'RESTRICTED';
      } else if (sensitivityScore >= 10) {
        sensitivityLevel = 'CONFIDENTIAL';
      } else if (sensitivityScore >= 5) {
        sensitivityLevel = 'INTERNAL';
      } else {
        sensitivityLevel = 'PUBLIC';
      }

      // Generate recommendations
      const recommendedRestrictions = this.generateSecurityRecommendations(
        sensitivityLevel,
        triggeredPatterns,
      );

      // Identify applicable compliance frameworks
      const complianceFrameworks = this.identifyApplicableCompliance(
        objectName,
        sensitivityLevel,
        triggeredPatterns,
      );

      return {
        sensitivityScore,
        sensitivityLevel,
        triggeredPatterns,
        fieldAnalysis,
        recommendedRestrictions,
        complianceFrameworks,
      };
    } catch (error) {
      this.logger.error(`Error in sensitivity analysis: ${error.message}`);
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
   * Analyze cross-references and dependencies
   */
  private async analyzeCrossReferences(
    objectName: string,
    recordId: string | undefined,
    workspaceId: string,
  ): Promise<CrossReferenceAnalysis> {
    try {
      const referencingObjects: string[] = [];
      const relationshipTypes: Record<string, string> = {};
      const dependencyStrength: Record<string, 'WEAK' | 'MODERATE' | 'STRONG'> =
        {};

      // Get object metadata to find relationships
      const objectMetadata = await this.objectMetadataRepository.findOne({
        where: {
          nameSingular: objectName,
          workspaceId: workspaceId,
          isActive: true,
        },
        relations: ['fields'],
      });

      if (objectMetadata?.fields) {
        // Analyze relationship fields
        objectMetadata.fields.forEach((field: FieldMetadataEntity) => {
          if (field.type === 'RELATION') {
            const relatedObject =
              field.relationTargetObjectMetadata?.nameSingular;

            if (relatedObject) {
              referencingObjects.push(relatedObject);
              relationshipTypes[relatedObject] = 'RELATION';

              // For simplicity, assume moderate dependency for all relations
              // In a production system, this would be based on more sophisticated analysis
              dependencyStrength[relatedObject] = 'MODERATE';
            }
          }
        });
      }

      // Determine cascade risk
      const strongDependencies = Object.values(dependencyStrength).filter(
        (s) => s === 'STRONG',
      ).length;
      const cascadeRisk: 'LOW' | 'MEDIUM' | 'HIGH' =
        strongDependencies > 5
          ? 'HIGH'
          : strongDependencies > 2
            ? 'MEDIUM'
            : 'LOW';

      return {
        referencingObjects,
        relationshipTypes,
        dependencyStrength,
        cascadeRisk,
      };
    } catch (error) {
      this.logger.error(`Error analyzing cross-references: ${error.message}`);

      return {
        referencingObjects: [],
        relationshipTypes: {},
        dependencyStrength: {},
        cascadeRisk: 'LOW',
      };
    }
  }

  /**
   * Build enhanced resource context
   */
  private async buildEnhancedResourceContext(
    resourceMetadata: ResourceMetadata,
    sensitivityAnalysis: SensitivityAnalysisResult,
    ownershipChain: OwnershipInheritanceChain,
    crossReferences: CrossReferenceAnalysis,
    context: EnhancedPermissionContext,
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
      confidentialityLevel: sensitivityAnalysis.sensitivityLevel,
      dataClassification: {
        containsPII: sensitivityAnalysis.triggeredPatterns.some(
          (p) => p.includes('personal') || p.includes('ssn'),
        ),
        containsFinancialInfo: sensitivityAnalysis.triggeredPatterns.some(
          (p) => p.includes('payment') || p.includes('finance'),
        ),
        retentionPeriod: resourceMetadata.retentionPeriod,
        encryptionRequired: resourceMetadata.encryptionRequired,
        auditRequired: resourceMetadata.auditLevel !== 'NONE',
      },
      ownerId: ownershipChain.ownerId,
      departmentId: ownershipChain.userDepartment,
      isSystemResource: resourceMetadata.resourceType.includes('SYSTEM'),
      isSensitive: sensitivityAnalysis.sensitivityLevel !== 'PUBLIC',
      isFinancialData: resourceMetadata.resourceType.includes('FINANCIAL'),
      isPersonalData: sensitivityAnalysis.triggeredPatterns.some((p) =>
        p.includes('personal'),
      ),
      isAuditData: resourceMetadata.resourceType.includes('AUDIT'),
      dependencies: {
        requiredResources: crossReferences.referencingObjects.filter(
          (obj) => crossReferences.dependencyStrength[obj] === 'STRONG',
        ),
        blockedByResources: [],
        relatedResources: crossReferences.referencingObjects,
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

  private generateSecurityRecommendations(
    sensitivityLevel: string,
    triggeredPatterns: string[],
  ): string[] {
    const recommendations: string[] = [];

    if (sensitivityLevel === 'TOP_SECRET') {
      recommendations.push(
        'IMPLEMENT_ZERO_TRUST',
        'REQUIRE_MFA',
        'ENABLE_DATA_MASKING',
      );
    }
    if (sensitivityLevel === 'RESTRICTED') {
      recommendations.push(
        'ENABLE_ENCRYPTION',
        'RESTRICT_EXPORT',
        'AUDIT_ACCESS',
      );
    }
    if (triggeredPatterns.some((p) => p.includes('personal'))) {
      recommendations.push('GDPR_COMPLIANCE', 'DATA_MINIMIZATION');
    }
    if (triggeredPatterns.some((p) => p.includes('financial'))) {
      recommendations.push('SOX_COMPLIANCE', 'SEGREGATION_OF_DUTIES');
    }

    return recommendations;
  }

  private identifyApplicableCompliance(
    objectName: string,
    sensitivityLevel: string,
    triggeredPatterns: string[],
  ): string[] {
    const frameworks: string[] = [];

    if (
      triggeredPatterns.some(
        (p) => p.includes('payment') || p.includes('finance'),
      )
    ) {
      frameworks.push(
        ...this.classificationConfig.complianceFrameworks.FINANCIAL,
      );
    }
    if (
      triggeredPatterns.some((p) => p.includes('personal') || p.includes('ssn'))
    ) {
      frameworks.push(
        ...this.classificationConfig.complianceFrameworks.PERSONAL,
      );
    }
    if (
      sensitivityLevel === 'TOP_SECRET' ||
      sensitivityLevel === 'RESTRICTED'
    ) {
      frameworks.push(...this.classificationConfig.complianceFrameworks.AUDIT);
    }

    return [...new Set(frameworks)]; // Remove duplicates
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
