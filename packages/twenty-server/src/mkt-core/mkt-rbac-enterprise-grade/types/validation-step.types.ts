/**
 * Validation Step Types for Enterprise RBAC
 *
 * Data types for permission validation results and supporting information.
 * Note: The 15-step orchestrator pattern has been removed in favor of Casbin-based authorization.
 */

import { EnhancedPermissionContext } from './enhanced-permission-context.type';

// ================= VALIDATION RESULT TYPES =================

/**
 * Result from individual validation
 */
export type StepValidationResult = {
  result: 'PASS' | 'FAIL' | 'SKIP' | 'WARNING' | 'ERROR';
  reason?: string;
  details?: Record<string, unknown>;

  // Execution control
  continue: boolean;
  escalate?: boolean;
  modifyContext?: Partial<EnhancedPermissionContext>;

  // Performance data
  executionTime?: number;
  cacheHit?: boolean;

  // Additional metadata
  metadata?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
  stepData?: Record<string, unknown>;
};

/**
 * Step execution metrics
 */
export type StepExecutionMetrics = {
  stepNumber: number;
  stepName: string;
  executionTime: number;
  memoryUsage?: number;
  cacheHit: boolean;
  result: string;
  errors?: string[];
};

/**
 * Permission validation statistics
 */
export type PermissionValidationStatistics = {
  totalValidations: number;
  averageExecutionTime: number;
  stepStatistics: Record<
    number,
    {
      executionCount: number;
      averageTime: number;
      failureRate: number;
      cacheHitRate: number;
    }
  >;
  performanceTrends: {
    date: Date;
    averageTime: number;
    validationCount: number;
  }[];
};

// ================= USER & ORGANIZATION TYPES =================

/**
 * User hierarchy information
 */
export type UserHierarchyInfo = {
  userId: string;
  workspaceMemberId: string;
  departmentId: string;
  hierarchyLevel: number;
  reportingManagerId?: string;
  directReports: string[];
  organizationPath: string[];
  departmentPath: string[];
  effectivePermissions: string[];
  roles: string[];
  clearanceLevel: string;
  lastPromotionDate?: Date;
  accessExpiryDate?: Date;
};

/**
 * Department information
 */
export type DepartmentInfo = {
  id: string;
  name: string;
  code: string;
  parentDepartmentId?: string;
  childDepartments: string[];
  budgetCode: string;
  costCenter: string;
  managerId: string;
  securityLevel: string;
  allowsCrossDepartmentAccess: boolean;
  complianceRequirements: string[];
  dataClassification: string;
};

/**
 * Permission template information
 */
export type PermissionTemplate = {
  id: string;
  name: string;
  description: string;
  templateType:
    | 'ROLE_BASED'
    | 'DEPARTMENT_BASED'
    | 'HIERARCHY_BASED'
    | 'CUSTOM';
  permissions: string[];
  restrictions: string[];
  validFrom: Date;
  validTo?: Date;
  priority: number;
  conditions: Record<string, string | number | boolean>;
};

// ================= RESOURCE & OWNERSHIP TYPES =================

/**
 * Resource ownership information
 */
export type ResourceOwnership = {
  ownerId: string;
  ownerType: 'USER' | 'DEPARTMENT' | 'SYSTEM';
  createdBy: string;
  createdAt: Date;
  lastModifiedBy: string;
  lastModifiedAt: Date;
  accessControlList: AccessControlEntry[];
  inheritedPermissions: string[];
  dataClassification: string;
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'TOP_SECRET';
};

/**
 * Access control entry
 */
export type AccessControlEntry = {
  principalId: string;
  principalType: 'USER' | 'ROLE' | 'DEPARTMENT';
  permissions: string[];
  restrictions: string[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
};

/**
 * Reporting relationship information
 */
export type ReportingRelationship = {
  subordinateId: string;
  managerId: string;
  relationshipType: 'DIRECT' | 'DOTTED_LINE' | 'MATRIX' | 'FUNCTIONAL';
  effectiveFrom: Date;
  effectiveTo?: Date;
  delegationLevel: number;
  canActOnBehalf: boolean;
  approvalLimits: Record<string, number>;
};

// ================= TEMPLATE & POLICY TYPES =================

/**
 * Template conflict resolution result
 */
export type TemplateConflictResolution = {
  conflictingTemplates: PermissionTemplate[];
  resolutionStrategy:
    | 'MOST_RESTRICTIVE'
    | 'LEAST_RESTRICTIVE'
    | 'PRIORITY_BASED'
    | 'MANUAL';
  resolvedPermissions: string[];
  warnings: string[];
  requiresManualReview: boolean;
};

/**
 * Policy evaluation result
 */
export type PolicyEvaluationResult = {
  policyId: string;
  policyName: string;
  evaluation: 'ALLOW' | 'DENY' | 'CONDITIONAL';
  conditions: PolicyCondition[];
  filters: DataFilter[];
  restrictionLevel: string;
  auditRequired: boolean;
  timeBasedRestrictions?: TimeRestriction[];
};

/**
 * Policy condition
 */
export type PolicyCondition = {
  field: string;
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'IN'
    | 'NOT_IN'
    | 'GREATER_THAN'
    | 'LESS_THAN';
  value: string | number | boolean | Date;
  logicalOperator?: 'AND' | 'OR';
};

/**
 * Data filter for restricted access
 */
export type DataFilter = {
  field: string;
  filterType: 'INCLUDE' | 'EXCLUDE' | 'MASK' | 'AUDIT';
  criteria: Record<string, string | number | boolean>;
  applyToSubordinates: boolean;
};

/**
 * Time-based restriction
 */
export type TimeRestriction = {
  restrictionType:
    | 'TIME_OF_DAY'
    | 'DAY_OF_WEEK'
    | 'DATE_RANGE'
    | 'BUSINESS_HOURS';
  allowedTimes?: string[];
  allowedDays?: string[];
  startDate?: Date;
  endDate?: Date;
  timezone: string;
};

// ================= EMERGENCY & SPECIAL ACCESS TYPES =================

/**
 * Emergency access information
 */
export type EmergencyAccess = {
  accessLevel: 'NORMAL' | 'ELEVATED' | 'EMERGENCY';
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  validUntil: Date;
  usageCount: number;
  maxUsage: number;
  auditTrail: EmergencyAccessLog[];
};

/**
 * Emergency access log
 */
export type EmergencyAccessLog = {
  timestamp: Date;
  action: string;
  resourceAccessed: string;
  justification: string;
  ipAddress: string;
  deviceId: string;
};

// ================= PERFORMANCE & CACHE TYPES =================

/**
 * Performance cache data
 */
export type PerformanceCacheData = {
  cacheKey: string;
  data: Record<string, unknown>;
  timestamp: Date;
  ttl: number;
  hitCount: number;
  lastAccessed: Date;
  metadata: Record<string, string | number>;
};

// ================= BUSINESS RULE TYPES =================

/**
 * Business rule evaluation result
 */
export type BusinessRuleEvaluationResult = {
  ruleId: string;
  ruleName: string;
  evaluation: boolean;
  reasoning: string;
  weight: number;
  category: string;
  dependencies: string[];
  lastUpdated: Date;
};

/**
 * Approval requirement information
 */
export type ApprovalRequirement = {
  required: boolean;
  approvalLevel: 'NONE' | 'MANAGER' | 'DEPARTMENT_HEAD' | 'EXECUTIVE' | 'DUAL';
  approvers: string[];
  reason: string;
  timeLimit: number; // minutes
  escalationPath: string[];
  autoApprovalConditions?: Record<string, string | number | boolean>;
};

/**
 * Resource restriction information
 */
export type ResourceRestriction = {
  restrictionType:
    | 'TIME_BASED'
    | 'LOCATION_BASED'
    | 'DEVICE_BASED'
    | 'NETWORK_BASED';
  allowedValues: string[];
  deniedValues: string[];
  conditions: Record<string, string | number | boolean>;
  override: boolean;
  bypassRoles: string[];
};

/**
 * Hierarchy filtering result
 */
export type HierarchyFilteringResult = {
  originalData: Record<string, unknown>;
  filteredData: Record<string, unknown>;
  filteredFields: string[];
  accessibleRecords: string[];
  restrictedRecords: string[];
  reasoning: string;
};

// ================= COMPLIANCE TYPES =================

/**
 * Compliance requirement result
 */
export type ComplianceRequirementResult = {
  complianceType: 'GDPR' | 'SOX' | 'HIPAA' | 'PCI_DSS' | 'CUSTOM';
  compliant: boolean;
  requirements: ComplianceRule[];
  violations: ComplianceViolation[];
  auditTrailRequired: boolean;
  dataRetentionPeriod?: number;
};

/**
 * Compliance rule
 */
export type ComplianceRule = {
  ruleId: string;
  description: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  automated: boolean;
  checkFunction: string;
};

/**
 * Compliance violation
 */
export type ComplianceViolation = {
  ruleId: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  remediation: string;
  reportedBy: string;
  reportedAt: Date;
};

// ================= DYNAMIC CONDITION TYPES =================

/**
 * Dynamic condition evaluation result
 */
export type DynamicConditionResult = {
  conditionType: 'TIME' | 'LOCATION' | 'DEVICE' | 'NETWORK' | 'BUSINESS_RULE';
  evaluation: boolean;
  currentValue: string | number | boolean;
  expectedValue: string | number | boolean;
  metadata: Record<string, string | number | boolean>;
};

/**
 * Performance optimization result
 */
export type PerformanceOptimizationResult = {
  optimizationType: 'CACHE' | 'PARALLEL' | 'SKIP' | 'PRECOMPUTE';
  enabled: boolean;
  estimatedTimeSaving: number;
  cacheHitRate?: number;
  parallelizationFactor?: number;
};

// ================= REPORTING TYPES =================

/**
 * Compliance report data
 */
export type ComplianceReportData = {
  reportId: string;
  reportType:
    | 'ACCESS_REVIEW'
    | 'PRIVILEGE_USAGE'
    | 'VIOLATION_SUMMARY'
    | 'AUDIT_TRAIL';
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedBy: string;
  generatedAt: Date;
  data: Record<string, unknown>;
  summary: Record<string, number>;
};

// ================= FINAL DECISION TYPES =================

/**
 * Final decision combination result
 */
export type FinalDecisionResult = {
  decision: 'ALLOW' | 'DENY' | 'CONDITIONAL';
  confidence: number; // 0-100
  reasons: string[];
  conditions: PolicyCondition[];
  restrictions: ResourceRestriction[];
  auditRequired: boolean;
  temporaryAccess?: EmergencyAccess;
};

/**
 * Conflict resolution result
 */
export type ConflictResolutionResult = {
  conflictType: 'PERMISSION' | 'TEMPLATE' | 'POLICY' | 'HIERARCHY';
  resolutionStrategy:
    | 'MOST_RESTRICTIVE'
    | 'LEAST_RESTRICTIVE'
    | 'PRIORITY_BASED'
    | 'MANUAL';
  originalResults: StepValidationResult[];
  resolvedResult: StepValidationResult;
  reasoning: string;
  requiresReview: boolean;
};
