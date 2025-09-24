/**
 * Resource Identification Service
 * Step 3 of 15-step permission validation
 * Identifies resource type, ownership, sensitivity, and dependencies
 */

import { Injectable, Logger } from '@nestjs/common';

import {
  ResourceIdentificationStep,
  StepValidationResult,
  ResourceOwnership,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  EnhancedPermissionContext,
  ResourceContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  VALIDATION_STEPS,
  DATA_CLASSIFICATION,
  CACHE_KEY_PREFIXES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

/**
 * Resource metadata for permission validation
 */
interface ResourceMetadata {
  objectName: string;
  objectId?: string;
  resourceType: string;
  resourceCategory: string;
  sensitivityLevel: string;
  dataClassification: string;
  ownerId?: string;
  departmentId?: string;
  isShared: boolean;
  isPublic: boolean;
  encryptionRequired: boolean;
  complianceRequired: boolean;
  auditLevel: string;
  retentionPeriod?: number;
  accessRestrictions: string[];
  crossReferences: string[];
  dependencies: ResourceDependency[];
  customAttributes: Record<string, string | number | boolean | Date>;
}

/**
 * Resource dependency information
 */
interface ResourceDependency {
  dependentResource: string;
  dependencyType: 'PARENT' | 'CHILD' | 'RELATED' | 'LINKED';
  accessRequirement: 'REQUIRED' | 'OPTIONAL' | 'RESTRICTED';
  cascadePermissions: boolean;
}

/**
 * Resource Identification Service - Step 3
 */
@Injectable()
export class ResourceIdentificationService
  implements ResourceIdentificationStep
{
  private readonly logger = new Logger(ResourceIdentificationService.name);

  readonly stepNumber = VALIDATION_STEPS.RESOURCE_IDENTIFICATION;
  readonly stepName = 'Resource Identification';
  readonly description =
    'Identify resource type, ownership, sensitivity, and dependencies';
  readonly isRequired = true;
  readonly canSkip = false;
  readonly isAsync = true;
  readonly priority = 85;
  readonly maxExecutionTime = 600;
  readonly enableCaching = true;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly objectMetadataService: ObjectMetadataService,
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
        `Starting resource identification for: ${context.resourceContext.objectName}`,
      );

      // Check if we can skip this step
      if (!this.shouldExecute(context)) {
        return this.createSkipResult(
          'Resource context already resolved',
          startTime,
        );
      }

      // Identify resource type
      const resourceType = await this.identifyResourceType(
        context.resourceContext.objectName,
      );

      if (!resourceType) {
        return this.createFailResult(
          `Unknown resource type: ${context.resourceContext.objectName}`,
          startTime,
        );
      }

      // Resolve resource ownership
      const ownership = await this.resolveResourceOwnership(
        context.resourceContext.objectName,
        context.resourceContext.recordId,
      );

      // Classify resource sensitivity
      const sensitivityLevel = await this.classifyResourceSensitivity(
        context.resourceContext.objectName,
        context.resourceContext.recordId,
      );

      // Resolve dependencies
      const dependencies = await this.resolveDependencies(
        context.resourceContext.objectName,
        context.resourceContext.recordId,
      );

      // Build complete resource metadata
      const resourceMetadata = await this.buildResourceMetadata({
        objectName: context.resourceContext.objectName,
        objectId: context.resourceContext.recordId,
        resourceType,
        ownership,
        sensitivityLevel,
        dependencies,
      });

      // Build resource context
      const resourceContext: ResourceContext = {
        objectName: context.resourceContext.objectName,
        recordId: context.resourceContext.recordId,
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
          containsPII: resourceMetadata.dataClassification.includes('PII'),
          containsFinancialInfo:
            resourceMetadata.dataClassification.includes('FINANCIAL'),
          retentionPeriod: resourceMetadata.retentionPeriod,
          encryptionRequired: resourceMetadata.encryptionRequired,
          auditRequired: resourceMetadata.auditLevel !== 'NONE',
        },
        ownerId: resourceMetadata.ownerId,
        departmentId: resourceMetadata.departmentId,
        isSystemResource: resourceMetadata.resourceType.includes('SYSTEM'),
        isSensitive: resourceMetadata.sensitivityLevel !== 'PUBLIC',
        isFinancialData: resourceMetadata.resourceType.includes('FINANCIAL'),
        isPersonalData: resourceMetadata.dataClassification.includes('PII'),
        isAuditData: resourceMetadata.resourceType.includes('AUDIT'),
        dependencies: {
          requiredResources: dependencies,
          blockedByResources: [],
          relatedResources: dependencies,
        },
      };

      const executionTime = Date.now() - startTime;

      return {
        result: 'PASS',
        reason: 'Resource successfully identified and classified',
        continue: true,
        executionTime,
        stepData: {
          resourceContext,
          resourceMetadata,
        },
        modifyContext: {
          resourceContext,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error in resource identification: ${error.message}`,
        error.stack,
      );

      return this.createErrorResult(error.message, startTime);
    }
  }

  /**
   * Determine if this step should be executed
   */
  shouldExecute(context: EnhancedPermissionContext): boolean {
    // Skip if resource context already exists and is complete
    return !(
      context.resourceContext?.objectName &&
      context.resourceContext?.resourceType &&
      context.resourceContext?.confidentialityLevel
    );
  }

  /**
   * Get estimated execution time
   */
  getEstimatedExecutionTime(context: EnhancedPermissionContext): number {
    if (context.resourceContext) return 100; // Already resolved

    return this.maxExecutionTime || 600;
  }

  /**
   * Identify resource type based on object name
   */
  async identifyResourceType(objectName: string): Promise<string> {
    try {
      // Try cache first
      const cacheKey = `${CACHE_KEY_PREFIXES.RESOURCE_INFO}type:${objectName}`;

      // Query object metadata
      const objectMetadata =
        await this.objectMetadataService.findOneWithinWorkspace(
          'default', // TODO: Get actual workspace ID from context
          { where: { nameSingular: objectName } },
        );

      if (!objectMetadata) {
        this.logger.warn(`Object metadata not found for: ${objectName}`);

        return 'UNKNOWN';
      }

      // Determine resource type based on object characteristics
      let resourceType = 'BUSINESS_OBJECT';

      // Check for specific patterns
      if (this.isSystemObject(objectName)) {
        resourceType = 'SYSTEM_OBJECT';
      } else if (this.isConfigurationObject(objectName)) {
        resourceType = 'CONFIGURATION_OBJECT';
      } else if (this.isAuditObject(objectName)) {
        resourceType = 'AUDIT_OBJECT';
      } else if (this.isUserDataObject(objectName)) {
        resourceType = 'USER_DATA_OBJECT';
      } else if (this.isFinancialObject(objectName)) {
        resourceType = 'FINANCIAL_OBJECT';
      } else if (this.isComplianceObject(objectName)) {
        resourceType = 'COMPLIANCE_OBJECT';
      }

      this.logger.debug(
        `Identified resource type: ${resourceType} for ${objectName}`,
      );

      return resourceType;
    } catch (error) {
      this.logger.error(
        `Error identifying resource type: ${error.message}`,
        error.stack,
      );

      return 'UNKNOWN';
    }
  }

  /**
   * Resolve resource ownership
   */
  async resolveResourceOwnership(
    objectName: string,
    recordId?: string,
  ): Promise<ResourceOwnership> {
    try {
      const objectMetadata =
        await this.objectMetadataService.findOneWithinWorkspace(
          'default', // TODO: Get actual workspace ID from context
          { where: { nameSingular: objectName } },
        );

      if (!objectMetadata) {
        return {
          ownerId: 'system',
          ownerType: 'SYSTEM',
          createdBy: 'system',
          createdAt: new Date(),
          lastModifiedBy: 'system',
          lastModifiedAt: new Date(),
          accessControlList: [],
          inheritedPermissions: [],
          dataClassification: 'INTERNAL',
          sensitivity: 'INTERNAL',
        };
      }

      // Look for ownership fields
      const ownerField = objectMetadata.fields?.find(
        (field: { name: string; type: string }) =>
          field.name.toLowerCase().includes('owner') ||
          field.name.toLowerCase().includes('created_by') ||
          field.name === 'userId',
      );

      const departmentField = objectMetadata.fields?.find(
        (field: { name: string; type: string }) =>
          field.name.toLowerCase().includes('department') ||
          field.name.toLowerCase().includes('team'),
      );

      let ownerId: string | undefined;
      let departmentId: string | undefined;

      // If we have a specific record, try to get actual ownership data
      if (recordId && ownerField) {
        // This would query the actual data table to get ownership info
        // For now, we'll return placeholder logic
        ownerId = await this.getRecordOwner(
          objectName,
          recordId,
          ownerField.name,
        );
      }

      if (recordId && departmentField) {
        departmentId = await this.getRecordDepartment(
          objectName,
          recordId,
          departmentField.name,
        );
      }

      return {
        ownerId: ownerId || 'system',
        ownerType: ownerId ? 'USER' : 'SYSTEM',
        createdBy: ownerId || 'system',
        createdAt: new Date(),
        lastModifiedBy: ownerId || 'system',
        lastModifiedAt: new Date(),
        accessControlList: [],
        inheritedPermissions: [],
        dataClassification: 'INTERNAL',
        sensitivity: 'INTERNAL',
      };
    } catch (error) {
      this.logger.error(
        `Error resolving resource ownership: ${error.message}`,
        error.stack,
      );

      return {
        ownerId: 'system',
        ownerType: 'SYSTEM',
        createdBy: 'system',
        createdAt: new Date(),
        lastModifiedBy: 'system',
        lastModifiedAt: new Date(),
        accessControlList: [],
        inheritedPermissions: [],
        dataClassification: 'INTERNAL',
        sensitivity: 'INTERNAL',
      };
    }
  }

  /**
   * Classify resource sensitivity level
   */
  async classifyResourceSensitivity(
    objectName: string,
    _recordId?: string,
  ): Promise<string> {
    try {
      // Base sensitivity on object type and field analysis
      const objectMetadata =
        await this.objectMetadataService.findOneWithinWorkspace(
          'default', // TODO: Get actual workspace ID from context
          { where: { nameSingular: objectName } },
        );

      if (!objectMetadata) {
        return DATA_CLASSIFICATION.INTERNAL;
      }

      let sensitivityScore = 0;
      const sensitivePatterns = [
        'salary',
        'wage',
        'compensation',
        'payment',
        'invoice',
        'finance',
        'ssn',
        'social',
        'passport',
        'license',
        'personal',
        'medical',
        'health',
        'diagnosis',
        'treatment',
        'legal',
        'contract',
        'agreement',
        'lawsuit',
        'security',
        'password',
        'token',
        'key',
        'credential',
      ];

      // Check object name sensitivity
      const objectNameLower = objectName.toLowerCase();

      sensitivePatterns.forEach((pattern) => {
        if (objectNameLower.includes(pattern)) {
          sensitivityScore += 10;
        }
      });

      // Check field sensitivity
      if (objectMetadata.fields) {
        objectMetadata.fields.forEach(
          (field: { name: string; type: string }) => {
            const fieldNameLower = field.name.toLowerCase();

            sensitivePatterns.forEach((pattern) => {
              if (fieldNameLower.includes(pattern)) {
                sensitivityScore += 5;
              }
            });
          },
        );
      }

      // Classify based on score
      if (sensitivityScore >= 20) {
        return DATA_CLASSIFICATION.TOP_SECRET;
      } else if (sensitivityScore >= 15) {
        return DATA_CLASSIFICATION.RESTRICTED;
      } else if (sensitivityScore >= 10) {
        return DATA_CLASSIFICATION.CONFIDENTIAL;
      } else if (sensitivityScore >= 5) {
        return DATA_CLASSIFICATION.INTERNAL;
      } else {
        return DATA_CLASSIFICATION.PUBLIC;
      }
    } catch (error) {
      this.logger.error(
        `Error classifying resource sensitivity: ${error.message}`,
        error.stack,
      );

      return DATA_CLASSIFICATION.INTERNAL;
    }
  }

  /**
   * Resolve resource dependencies
   */
  async resolveDependencies(
    objectName: string,
    _recordId?: string,
  ): Promise<string[]> {
    try {
      const dependencies: string[] = [];

      const objectMetadata =
        await this.objectMetadataService.findOneWithinWorkspace(
          'default', // TODO: Get actual workspace ID from context
          { where: { nameSingular: objectName } },
        );

      if (!objectMetadata?.fields) {
        return dependencies;
      }

      // Look for relation fields that create dependencies
      const relationFields = objectMetadata.fields.filter(
        (field: { name: string; type: string }) =>
          field.type === 'RELATION' ||
          (field.name.toLowerCase().includes('id') && field.name !== 'id'),
      );

      for (const field of relationFields) {
        const dependentResource = this.inferResourceFromField(field.name);

        dependencies.push(dependentResource);
      }

      return dependencies;
    } catch (error) {
      this.logger.error(
        `Error resolving dependencies: ${error.message}`,
        error.stack,
      );

      return [];
    }
  }

  /**
   * Build complete resource metadata
   */
  private async buildResourceMetadata(params: {
    objectName: string;
    objectId?: string;
    resourceType: string;
    ownership: ResourceOwnership;
    sensitivityLevel: string;
    dependencies: string[];
  }): Promise<ResourceMetadata> {
    const {
      objectName,
      objectId,
      resourceType,
      ownership,
      sensitivityLevel,
      dependencies,
    } = params;

    return {
      objectName,
      objectId,
      resourceType,
      resourceCategory: this.determineResourceCategory(resourceType),
      sensitivityLevel,
      dataClassification: sensitivityLevel,
      ownerId: ownership.ownerId,
      departmentId: ownership.ownerId, // Simplified mapping
      isShared: this.isSharedResource(objectName),
      isPublic: this.isPublicResource(objectName),
      encryptionRequired: this.requiresEncryption(sensitivityLevel),
      complianceRequired: this.requiresCompliance(
        resourceType,
        sensitivityLevel,
      ),
      auditLevel: this.determineAuditLevel(resourceType, sensitivityLevel),
      retentionPeriod: this.determineRetentionPeriod(resourceType),
      accessRestrictions: this.determineAccessRestrictions(
        resourceType,
        sensitivityLevel,
      ),
      crossReferences: await this.findCrossReferences(objectName, objectId),
      dependencies: [], // Simplified for now
      customAttributes: await this.extractCustomAttributes(objectName),
    };
  }

  /**
   * Helper methods for resource classification
   */
  private isSystemObject(objectName: string): boolean {
    const systemObjects = [
      'user',
      'workspace',
      'permission',
      'role',
      'setting',
      'configuration',
    ];

    return systemObjects.some((obj) => objectName.toLowerCase().includes(obj));
  }

  private isConfigurationObject(objectName: string): boolean {
    const configObjects = ['setting', 'config', 'preference', 'template'];

    return configObjects.some((obj) => objectName.toLowerCase().includes(obj));
  }

  private isAuditObject(objectName: string): boolean {
    const auditObjects = ['audit', 'log', 'history', 'trail'];

    return auditObjects.some((obj) => objectName.toLowerCase().includes(obj));
  }

  private isUserDataObject(objectName: string): boolean {
    const userObjects = ['contact', 'person', 'profile', 'account'];

    return userObjects.some((obj) => objectName.toLowerCase().includes(obj));
  }

  private isFinancialObject(objectName: string): boolean {
    const financialObjects = [
      'invoice',
      'payment',
      'transaction',
      'billing',
      'revenue',
    ];

    return financialObjects.some((obj) =>
      objectName.toLowerCase().includes(obj),
    );
  }

  private isComplianceObject(objectName: string): boolean {
    const complianceObjects = [
      'compliance',
      'regulation',
      'policy',
      'procedure',
    ];

    return complianceObjects.some((obj) =>
      objectName.toLowerCase().includes(obj),
    );
  }

  private async getRecordOwner(
    _objectName: string,
    _recordId: string,
    _ownerField: string,
  ): Promise<string | undefined> {
    // This would query the actual data table
    // Placeholder implementation
    return undefined;
  }

  private async getRecordDepartment(
    _objectName: string,
    _recordId: string,
    _departmentField: string,
  ): Promise<string | undefined> {
    // This would query the actual data table
    // Placeholder implementation
    return undefined;
  }

  private async buildOwnershipInheritanceChain(
    _objectName: string,
    _recordId?: string,
  ): Promise<string[]> {
    return [];
  }

  private inferResourceFromField(fieldName: string): string {
    // Infer related resource from field name
    if (fieldName.endsWith('Id')) {
      return fieldName.slice(0, -2);
    }

    return fieldName;
  }

  private inferDependencyType(
    fieldName: string,
  ): 'PARENT' | 'CHILD' | 'RELATED' | 'LINKED' {
    if (fieldName.toLowerCase().includes('parent')) return 'PARENT';
    if (fieldName.toLowerCase().includes('child')) return 'CHILD';

    return 'RELATED';
  }

  private inferAccessRequirement(
    fieldName: string,
  ): 'REQUIRED' | 'OPTIONAL' | 'RESTRICTED' {
    return 'OPTIONAL';
  }

  private shouldCascadePermissions(_fieldName: string): boolean {
    const cascadeFields = ['owner', 'parent', 'workspace'];

    return cascadeFields.some((field) =>
      _fieldName.toLowerCase().includes(field),
    );
  }

  private determineResourceCategory(resourceType: string): string {
    const categoryMapping: Record<string, string> = {
      SYSTEM_OBJECT: 'SYSTEM',
      CONFIGURATION_OBJECT: 'CONFIGURATION',
      AUDIT_OBJECT: 'AUDIT',
      USER_DATA_OBJECT: 'USER_DATA',
      FINANCIAL_OBJECT: 'FINANCIAL',
      COMPLIANCE_OBJECT: 'COMPLIANCE',
      BUSINESS_OBJECT: 'BUSINESS',
    };

    return categoryMapping[resourceType] || 'GENERAL';
  }

  private isSharedResource(objectName: string): boolean {
    const sharedObjects = ['template', 'configuration', 'setting'];

    return sharedObjects.some((obj) => objectName.toLowerCase().includes(obj));
  }

  private isPublicResource(objectName: string): boolean {
    const publicObjects = ['announcement', 'policy', 'procedure'];

    return publicObjects.some((obj) => objectName.toLowerCase().includes(obj));
  }

  private requiresEncryption(sensitivityLevel: string): boolean {
    return [
      DATA_CLASSIFICATION.RESTRICTED,
      DATA_CLASSIFICATION.TOP_SECRET,
    ].includes(
      sensitivityLevel as
        | typeof DATA_CLASSIFICATION.RESTRICTED
        | typeof DATA_CLASSIFICATION.TOP_SECRET,
    );
  }

  private requiresCompliance(
    resourceType: string,
    sensitivityLevel: string,
  ): boolean {
    return (
      resourceType.includes('FINANCIAL') ||
      resourceType.includes('COMPLIANCE') ||
      [DATA_CLASSIFICATION.RESTRICTED, DATA_CLASSIFICATION.TOP_SECRET].includes(
        sensitivityLevel as
          | typeof DATA_CLASSIFICATION.RESTRICTED
          | typeof DATA_CLASSIFICATION.TOP_SECRET,
      )
    );
  }

  private determineAuditLevel(
    resourceType: string,
    sensitivityLevel: string,
  ): string {
    if (
      resourceType.includes('FINANCIAL') ||
      sensitivityLevel === DATA_CLASSIFICATION.TOP_SECRET
    ) {
      return 'COMPREHENSIVE';
    }
    if (
      resourceType.includes('SYSTEM') ||
      sensitivityLevel === DATA_CLASSIFICATION.RESTRICTED
    ) {
      return 'DETAILED';
    }

    return 'BASIC';
  }

  private determineRetentionPeriod(resourceType: string): number | undefined {
    const retentionMapping: Record<string, number> = {
      AUDIT_OBJECT: 2555, // 7 years in days
      FINANCIAL_OBJECT: 2555,
      COMPLIANCE_OBJECT: 2555,
      USER_DATA_OBJECT: 1095, // 3 years
      BUSINESS_OBJECT: 365, // 1 year
    };

    return retentionMapping[resourceType];
  }

  private determineAccessRestrictions(
    resourceType: string,
    sensitivityLevel: string,
  ): string[] {
    const restrictions: string[] = [];

    if (sensitivityLevel === DATA_CLASSIFICATION.TOP_SECRET) {
      restrictions.push(
        'C_LEVEL_ONLY',
        'AUDIT_REQUIRED',
        'ENCRYPTION_REQUIRED',
      );
    } else if (sensitivityLevel === DATA_CLASSIFICATION.RESTRICTED) {
      restrictions.push('SENIOR_MANAGEMENT_ONLY', 'AUDIT_REQUIRED');
    }

    if (resourceType.includes('FINANCIAL')) {
      restrictions.push('FINANCIAL_AUTHORITY_REQUIRED');
    }

    return restrictions;
  }

  private async findCrossReferences(
    _objectName: string,
    _objectId?: string,
  ): Promise<string[]> {
    // This would find resources that reference this object
    return [];
  }

  private async extractCustomAttributes(
    _objectName: string,
  ): Promise<Record<string, string | number | boolean | Date>> {
    // Extract custom metadata attributes
    return {};
  }

  private determineComplianceFramework(metadata: ResourceMetadata): string[] {
    const frameworks: string[] = [];

    if (metadata.resourceType.includes('FINANCIAL')) {
      frameworks.push('SOX', 'PCI_DSS');
    }

    if (metadata.sensitivityLevel === DATA_CLASSIFICATION.TOP_SECRET) {
      frameworks.push('ISO_27001', 'SOC_2');
    }

    return frameworks;
  }

  private formatDependencies(dependencies: ResourceDependency[]): {
    resource: string;
    type: string;
    required: boolean;
    cascades: boolean;
  }[] {
    return dependencies.map((dep) => ({
      resource: dep.dependentResource,
      type: dep.dependencyType,
      required: dep.accessRequirement === 'REQUIRED',
      cascades: dep.cascadePermissions,
    }));
  }

  private buildResolutionPath(metadata: ResourceMetadata): string[] {
    return [
      `object:${metadata.objectName}`,
      `type:${metadata.resourceType}`,
      `sensitivity:${metadata.sensitivityLevel}`,
      `category:${metadata.resourceCategory}`,
    ];
  }

  /**
   * Cache key generation
   */
  private getCacheKey(objectName: string, recordId?: string): string {
    const key = `${CACHE_KEY_PREFIXES.RESOURCE_INFO}${objectName}`;

    return recordId ? `${key}:${recordId}` : key;
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
