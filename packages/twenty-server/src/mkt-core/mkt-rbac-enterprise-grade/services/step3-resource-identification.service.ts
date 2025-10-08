/**
 * Resource Identification Service (Step 3)
 * Identifies and classifies resources, analyzes sensitivity, and resolves ownership chains
 * Based on Step 2 patterns and Twenty.com database architecture
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

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
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  ResourceMetadata,
  OwnershipInheritanceChain,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/resource-identification.types';
import { VALIDATION_STEP_NAMES } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';
// DISABLED: import { MktUserPermissionOverrideWorkspaceEntity } from 'src/mkt-core/mkt-permission-template/entities/mkt-user-permission-override.workspace-entity';
import { MktPermissionResourceWorkspaceEntity } from 'src/mkt-core/mkt-permission-template/entities/mkt-permission-resource.workspace-entity';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-data-access-policy/mkt-data-access-policy.workspace-entity';
import {
  RBAC_CACHE_KEYS,
  RBAC_CACHE_TTL,
  RESOURCE_CLASSIFICATION_CONFIG,
  DATA_CLASSIFICATION,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

import { RbacCacheManagerService } from './rbac-cache-manager.service';

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

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @Optional() private readonly cacheManager?: RbacCacheManagerService,
  ) {}

  /**
   * DISABLED: Get User Permission Override repository (for testing)
   */
  // private async getUserPermissionOverrideRepository(
  //   workspaceId: string,
  // ): Promise<WorkspaceRepository<MktUserPermissionOverrideWorkspaceEntity>> {
  //   return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktUserPermissionOverrideWorkspaceEntity>(
  //     workspaceId,
  //     'mktUserPermissionOverride',
  //     { shouldBypassPermissionChecks: true },
  //   );
  // }

  /**
   * Get Permission Resource Repository for workspace
   */
  private async getPermissionResourceRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktPermissionResourceWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionResourceWorkspaceEntity>(
      workspaceId,
      'mktPermissionResource',
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Get Permission Resource by resourceKey with caching
   * Cache TTL: 24 hours (very stable data)
   */
  private async getPermissionResourceByKey(
    workspaceId: string,
    resourceKey: string,
  ): Promise<MktPermissionResourceWorkspaceEntity | null> {
    try {
      const cacheKey = `${RBAC_CACHE_KEYS.CONFIG_RESOURCES}:${workspaceId}:${resourceKey}`;

      // Try cache first
      let resourceConfig: MktPermissionResourceWorkspaceEntity | null = null;

      if (this.cacheManager) {
        resourceConfig =
          await this.cacheManager.get<MktPermissionResourceWorkspaceEntity>(
            cacheKey,
          );

        if (resourceConfig) {
          this.logger.debug(
            `Cache HIT: Permission resource ${resourceKey} (Redis)`,
          );

          return resourceConfig;
        }
      }

      // Load from DB if cache miss
      this.logger.debug(
        `Cache MISS: Loading permission resource from DB for ${resourceKey}`,
      );

      const resourceRepository =
        await this.getPermissionResourceRepository(workspaceId);

      resourceConfig = await resourceRepository.findOne({
        where: { resourceKey, isActive: true },
      });

      // Cache for 24 hours (using centralized TTL constant)
      if (this.cacheManager && resourceConfig) {
        await this.cacheManager.set(
          cacheKey,
          resourceConfig,
          RBAC_CACHE_TTL.CONFIG_RESOURCES,
        );
        this.logger.debug(
          `Cache SET: Permission resource ${resourceKey} with 24h TTL`,
        );
      }

      return resourceConfig;
    } catch (error) {
      this.logger.error(
        `Error getting permission resource ${resourceKey}: ${error.message}`,
      );

      return null;
    }
  }

  /**
   * Get all active Permission Resources with caching
   * Cache TTL: 24 hours (very stable data)
   */
  private async getAllPermissionResources(
    workspaceId: string,
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
    try {
      const cacheKey = `${RBAC_CACHE_KEYS.CONFIG_RESOURCES}:${workspaceId}:all`;

      // Try cache first
      let resources: MktPermissionResourceWorkspaceEntity[] | null = null;

      if (this.cacheManager) {
        resources =
          await this.cacheManager.get<MktPermissionResourceWorkspaceEntity[]>(
            cacheKey,
          );

        if (resources) {
          this.logger.debug(
            `Cache HIT: All permission resources (${resources.length} items) (Redis)`,
          );

          return resources;
        }
      }

      // Load from DB if cache miss
      this.logger.debug(`Cache MISS: Loading all permission resources from DB`);

      const resourceRepository =
        await this.getPermissionResourceRepository(workspaceId);

      resources = await resourceRepository.find({
        where: { isActive: true },
        order: { displayOrder: 'ASC', position: 'ASC' },
      });

      // Cache for 24 hours (using centralized TTL constant)
      if (this.cacheManager && resources) {
        await this.cacheManager.set(
          cacheKey,
          resources,
          RBAC_CACHE_TTL.CONFIG_RESOURCES,
        );
        this.logger.debug(
          `Cache SET: All permission resources (${resources.length} items) with 24h TTL`,
        );
      }

      return resources;
    } catch (error) {
      this.logger.error(
        `Error getting all permission resources: ${error.message}`,
      );

      return [];
    }
  }

  /**
   * Get Data Access Policy repository
   */
  private async getDataAccessPolicyRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktDataAccessPolicyWorkspaceEntity>> {
    return await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktDataAccessPolicyWorkspaceEntity>(
      workspaceId,
      'mktDataAccessPolicy',
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
      const userWorkspaceId = context.userContext?.workspaceId;

      if (!objectName) {
        return this.createFailResult(
          'Resource object name is required',
          stepStartTime,
        );
      }

      // Try cache first - cache key includes recordId for specific resources
      const cacheKey = recordId
        ? `${RBAC_CACHE_KEYS.RESOURCE_METADATA}:${objectName}:${recordId}`
        : `${RBAC_CACHE_KEYS.RESOURCE_METADATA}:${objectName}:type`;

      if (this.cacheManager) {
        const cachedContext =
          await this.cacheManager.get<ResourceContext>(cacheKey);

        if (cachedContext) {
          this.logger.debug(
            `Cache HIT: Resource metadata for ${objectName}${recordId ? `:${recordId}` : ''} (Redis)`,
          );

          return this.createSuccessResult(
            cachedContext,
            stepStartTime,
            'CACHE',
          );
        }
      }

      this.logger.debug(
        `Cache MISS: Loading resource metadata from database for ${objectName}`,
      );

      // 1. Identify and classify resource
      const resourceMetadata = await this.identifyAndClassifyResource(
        objectName,
        recordId,
        context.userContext.workspaceId,
        userWorkspaceId,
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

      // Cache the result
      // Use shorter TTL for specific records (resource metadata), longer for type classifications
      const ttl = recordId ? RBAC_CACHE_TTL.RESOURCE_META : RBAC_CACHE_TTL.LONG;

      if (this.cacheManager) {
        await this.cacheManager.set(cacheKey, enhancedResourceContext, ttl);
        this.logger.debug(
          `Cache SET: Resource metadata for ${objectName}${recordId ? `:${recordId}` : ''} with ${ttl}ms TTL`,
        );
      }

      // Update context with enhanced resource information
      context.resourceContext = enhancedResourceContext;

      this.logger.debug(`Step 3: ${this.stepName} completed successfully`);

      return this.createSuccessResult(
        enhancedResourceContext,
        stepStartTime,
        'DATABASE',
      );
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
    _userWorkspaceId: string,
  ): Promise<ResourceMetadata> {
    try {
      // DISABLED: Permission Override Analysis (for testing)
      // const overrideRepository =
      //   await this.getUserPermissionOverrideRepository(workspaceId);
      //
      // const resourceOverrides = await overrideRepository.find({
      //   where: { workspaceMemberId: userWorkspaceId, isActive: true },
      //   take: 5,
      // });

      // const resourceOverrides: any[] = []; // Empty - overrides disabled

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

      // DISABLED: Analyze override patterns (for testing)
      // const hasActiveOverrides = resourceOverrides.length > 0;
      // const hasGrantOverrides = resourceOverrides.some((o) => o.isAllowed);
      // const hasRevokeOverrides = resourceOverrides.some((o) => !o.isAllowed);
      // const hasExpiredOverrides = resourceOverrides.some(
      //   (o) => o.expiresAt && new Date(o.expiresAt) < new Date(),
      // );

      const hasActiveOverrides = false;
      const hasGrantOverrides = false;
      const hasRevokeOverrides = false;
      const hasExpiredOverrides = false;

      // Query data access policies for this resource
      const policyRepository =
        await this.getDataAccessPolicyRepository(workspaceId);
      const dataAccessPolicies = await policyRepository.find({
        where: {
          objectName,
          isActive: true,
        },
        take: 10, // Sample policies to understand filtering rules
      });

      // Analyze policy patterns
      // const hasDataAccessPolicies = dataAccessPolicies.length > 0;
      const hasDepartmentPolicies = dataAccessPolicies.some(
        (p) => p.departmentId !== null,
      );
      const hasUserSpecificPolicies = dataAccessPolicies.some(
        (p) => p.specificMemberId !== null,
      );
      const hasHierarchyPolicies = dataAccessPolicies.some(
        (p) => p.minHierarchyLevel !== null || p.maxHierarchyLevel !== null,
      );
      const highestPolicyPriority = Math.max(
        ...dataAccessPolicies.map((p) => p.priority || 0),
        0,
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
          // DISABLED: Permission Override Analysis (for testing)
          hasPermissionOverrides: hasActiveOverrides, // false
          hasGrantOverrides, // false
          hasRevokeOverrides, // false
          hasExpiredOverrides, // false
          activeOverrideCount: 0, // resourceOverrides.length disabled

          // Data Access Policy Analysis
          hasDataAccessPolicies: dataAccessPolicies.length > 0,
          hasDepartmentPolicies,
          hasUserSpecificPolicies,
          hasHierarchyPolicies,
          highestPolicyPriority,
          dataAccessPolicyCount: dataAccessPolicies.length,

          // Resource Classification
          isStandard: !objectName.startsWith('mkt'),
          isCustomObject: objectName.startsWith('mkt'),
          requiresDataFiltering: dataAccessPolicies.length > 0,
          hasComplexFiltering:
            hasDepartmentPolicies ||
            hasUserSpecificPolicies ||
            hasHierarchyPolicies,

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
          // Field might not exist, try next field
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
    // objectName is a PERMISSION_RESOURCE_KEY (from @Permission decorator)
    // ResourceKeys are uppercase like 'ORDERS', 'CUSTOMERS', 'USERS'
    const upperName = objectName.toUpperCase();

    // Lookup in resourceKeyClassification map
    const resourceType =
      RESOURCE_CLASSIFICATION_CONFIG.resourceKeyClassification[
        upperName as keyof typeof RESOURCE_CLASSIFICATION_CONFIG.resourceKeyClassification
      ];

    if (resourceType) {
      return resourceType;
    }

    // Fallback: Default to BUSINESS_DATA if resourceKey not found
    this.logger.warn(
      `Unknown resourceKey '${objectName}', defaulting to BUSINESS_DATA. ` +
        `Expected one of: ${Object.keys(RESOURCE_CLASSIFICATION_CONFIG.resourceKeyClassification).join(', ')}`,
    );

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
      return DATA_CLASSIFICATION.RESTRICTED;
    }
    if (resourceType === 'SYSTEM_CONFIG') {
      return DATA_CLASSIFICATION.CONFIDENTIAL;
    }
    if (
      RESOURCE_CLASSIFICATION_CONFIG.sensitivePatterns.some((pattern) =>
        objectName.toLowerCase().includes(pattern),
      )
    ) {
      return DATA_CLASSIFICATION.CONFIDENTIAL;
    }

    return DATA_CLASSIFICATION.INTERNAL;
  }

  private determineSensitivityLevel(
    objectName: string,
    resourceType: string,
  ): string {
    const nameLower = objectName.toLowerCase();

    if (resourceType === 'FINANCIAL' && nameLower.includes('payment')) {
      return DATA_CLASSIFICATION.RESTRICTED;
    }
    if (nameLower.includes('password') || nameLower.includes('token')) {
      return DATA_CLASSIFICATION.TOP_SECRET;
    }
    if (resourceType === 'AUDIT_DATA') {
      return DATA_CLASSIFICATION.RESTRICTED;
    }
    if (resourceType === 'SYSTEM_CONFIG') {
      return DATA_CLASSIFICATION.CONFIDENTIAL;
    }

    return DATA_CLASSIFICATION.INTERNAL;
  }

  private requiresEncryption(
    sensitivityLevel: string,
    resourceType: string,
  ): boolean {
    return (
      sensitivityLevel === DATA_CLASSIFICATION.TOP_SECRET ||
      sensitivityLevel === DATA_CLASSIFICATION.RESTRICTED ||
      resourceType === 'FINANCIAL'
    );
  }

  private requiresCompliance(
    resourceType: string,
    dataClassification: string,
  ): boolean {
    return (
      resourceType === 'FINANCIAL' ||
      dataClassification === DATA_CLASSIFICATION.RESTRICTED ||
      dataClassification === DATA_CLASSIFICATION.CONFIDENTIAL
    );
  }

  private determineAuditLevel(
    resourceType: string,
    sensitivityLevel: string,
  ): string {
    if (
      resourceType === 'FINANCIAL' ||
      sensitivityLevel === DATA_CLASSIFICATION.TOP_SECRET
    ) {
      return 'COMPREHENSIVE';
    }
    if (
      resourceType === 'AUDIT_DATA' ||
      sensitivityLevel === DATA_CLASSIFICATION.RESTRICTED
    ) {
      return 'DETAILED';
    }
    if (sensitivityLevel === DATA_CLASSIFICATION.CONFIDENTIAL) {
      return 'STANDARD';
    }

    return 'BASIC';
  }

  private calculateRetentionPeriod(
    resourceType: string,
    dataClassification: string,
  ): number | undefined {
    if (resourceType === 'AUDIT_DATA' || resourceType === 'FINANCIAL') {
      return RESOURCE_CLASSIFICATION_CONFIG.retentionMapping.AUDIT;
    }
    if (dataClassification === DATA_CLASSIFICATION.RESTRICTED) {
      return RESOURCE_CLASSIFICATION_CONFIG.retentionMapping.PERSONAL;
    }

    return RESOURCE_CLASSIFICATION_CONFIG.retentionMapping.BUSINESS;
  }

  private identifyAccessRestrictions(
    sensitivityLevel: string,
    resourceType: string,
  ): string[] {
    const restrictions: string[] = [];

    if (sensitivityLevel === DATA_CLASSIFICATION.TOP_SECRET) {
      restrictions.push('C_LEVEL_ONLY', 'MFA_REQUIRED', 'IP_RESTRICTED');
    } else if (sensitivityLevel === DATA_CLASSIFICATION.RESTRICTED) {
      restrictions.push('SENIOR_MANAGEMENT_ONLY', 'MFA_REQUIRED');
    } else if (sensitivityLevel === DATA_CLASSIFICATION.CONFIDENTIAL) {
      restrictions.push('DEPARTMENT_ONLY');
    }

    if (resourceType === 'FINANCIAL') {
      restrictions.push('DUAL_APPROVAL', 'FULL_AUDIT_TRAIL');
    }

    return restrictions;
  }

  // Result helper methods
  private createSuccessResult(
    resourceContext: ResourceContext,
    startTime: DateTime,
    source: 'CACHE' | 'DATABASE',
  ): StepValidationResult {
    return {
      result: CheckResult.PASS,
      reason: `Resource identification completed from ${source}`,
      continue: true,
      executionTime: DateTime.now().diff(startTime).as('milliseconds'),
      metadata: {
        resourceIdentified: true,
        resourceType: resourceContext.resourceType,
        sensitivityLevel: resourceContext.confidentialityLevel || 'INTERNAL',
        ownerResolved: !!resourceContext.ownerId,
        departmentResolved: !!resourceContext.departmentId,
        source,
      },
      modifyContext: {
        resourceContext,
      },
    };
  }

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
