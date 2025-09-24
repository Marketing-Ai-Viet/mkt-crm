/**
 * Resource Identification Types
 * Step 3 of 15-step permission validation
 * Contains all interfaces and types for resource identification and classification
 */

/**
 * Resource metadata for permission validation
 */
export interface ResourceMetadata {
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
export interface ResourceDependency {
  dependentResource: string;
  dependencyType: 'PARENT' | 'CHILD' | 'RELATED' | 'LINKED';
  accessRequirement: 'REQUIRED' | 'OPTIONAL' | 'RESTRICTED';
  cascadePermissions: boolean;
}

/**
 * Resource classification configuration
 */
export interface ResourceClassificationConfig {
  systemObjects: string[];
  configObjects: string[];
  auditObjects: string[];
  userObjects: string[];
  financialObjects: string[];
  complianceObjects: string[];
  sensitivePatterns: string[];
  retentionMapping: Record<string, number>;
  complianceFrameworks: Record<string, string[]>;
}

/**
 * Ownership inheritance chain
 */
export interface OwnershipInheritanceChain {
  ownerId: string;
  userDepartment?: string;
  parentDepartments: string[];
  workspaceId: string;
  inheritanceOrder: string[];
  permissionCascade: boolean;
}

/**
 * Resource sensitivity analysis result
 */
export interface SensitivityAnalysisResult {
  sensitivityScore: number;
  sensitivityLevel:
    | 'PUBLIC'
    | 'INTERNAL'
    | 'CONFIDENTIAL'
    | 'RESTRICTED'
    | 'TOP_SECRET';
  triggeredPatterns: string[];
  fieldAnalysis: {
    fieldName: string;
    fieldType: string;
    sensitivityContribution: number;
  }[];
  recommendedRestrictions: string[];
  complianceFrameworks: string[];
}

/**
 * Cross-reference analysis result
 */
export interface CrossReferenceAnalysis {
  referencingObjects: string[];
  relationshipTypes: Record<string, string>;
  dependencyStrength: Record<string, 'WEAK' | 'MODERATE' | 'STRONG'>;
  cascadeRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Custom attribute extraction configuration
 */
export interface CustomAttributeConfig {
  metadataFields: string[];
  businessLogicChecks: {
    checkName: string;
    fieldPatterns: string[];
    resultAttribute: string;
  }[];
  statisticalAnalysis: {
    countFieldTypes: boolean;
    analyzeRelations: boolean;
    trackUsageMetrics: boolean;
  };
}

/**
 * Resource identification cache entry
 */
export interface ResourceIdentificationCache {
  resourceMetadata: ResourceMetadata;
  sensitivityAnalysis: SensitivityAnalysisResult;
  crossReferences: CrossReferenceAnalysis;
  ownershipChain: OwnershipInheritanceChain;
  lastUpdated: Date;
  expiresAt: Date;
  version: string;
}

/**
 * Resource identification performance metrics
 */
export interface ResourceIdentificationMetrics {
  totalExecutionTime: number;
  ownershipResolutionTime: number;
  sensitivityAnalysisTime: number;
  dependencyResolutionTime: number;
  crossReferenceTime: number;
  cacheHitRate: number;
  errorRate: number;
  averageComplexityScore: number;
}

/**
 * Resource identification configuration
 */
export interface ResourceIdentificationConfig {
  enableCaching: boolean;
  cacheExpiration: number; // seconds
  maxRecursionDepth: number;
  batchSize: number;
  timeoutThreshold: number; // milliseconds
  classificationConfig: ResourceClassificationConfig;
  customAttributeConfig: CustomAttributeConfig;
  performanceMetrics: {
    enableTracking: boolean;
    metricsRetention: number; // days
  };
}
