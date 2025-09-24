import {
  EnhancedPermissionContext,
  ValidationStepResult,
  EnhancedPermissionResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';

// ================= SPECIFIC TYPE DEFINITIONS =================

/**
 * User hierarchy information with proper typing
 */
export interface UserHierarchyInfo {
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
}

/**
 * Department information with proper typing
 */
export interface DepartmentInfo {
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
}

/**
 * Permission template information
 */
export interface PermissionTemplate {
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
}

/**
 * Resource ownership information
 */
export interface ResourceOwnership {
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
}

/**
 * Access control entry
 */
export interface AccessControlEntry {
  principalId: string;
  principalType: 'USER' | 'ROLE' | 'DEPARTMENT';
  permissions: string[];
  restrictions: string[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

/**
 * Reporting relationship information
 */
export interface ReportingRelationship {
  subordinateId: string;
  managerId: string;
  relationshipType: 'DIRECT' | 'DOTTED_LINE' | 'MATRIX' | 'FUNCTIONAL';
  effectiveFrom: Date;
  effectiveTo?: Date;
  delegationLevel: number;
  canActOnBehalf: boolean;
  approvalLimits: Record<string, number>;
}

/**
 * Template conflict resolution result
 */
export interface TemplateConflictResolution {
  conflictingTemplates: PermissionTemplate[];
  resolutionStrategy:
    | 'MOST_RESTRICTIVE'
    | 'LEAST_RESTRICTIVE'
    | 'PRIORITY_BASED'
    | 'MANUAL';
  resolvedPermissions: string[];
  warnings: string[];
  requiresManualReview: boolean;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  policyId: string;
  policyName: string;
  evaluation: 'ALLOW' | 'DENY' | 'CONDITIONAL';
  conditions: PolicyCondition[];
  filters: DataFilter[];
  restrictionLevel: string;
  auditRequired: boolean;
  timeBasedRestrictions?: TimeRestriction[];
}

/**
 * Policy condition
 */
export interface PolicyCondition {
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
}

/**
 * Data filter for restricted access
 */
export interface DataFilter {
  field: string;
  filterType: 'INCLUDE' | 'EXCLUDE' | 'MASK' | 'AUDIT';
  criteria: Record<string, string | number | boolean>;
  applyToSubordinates: boolean;
}

/**
 * Time-based restriction
 */
export interface TimeRestriction {
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
}

/**
 * Emergency access information
 */
export interface EmergencyAccess {
  accessLevel: 'NORMAL' | 'ELEVATED' | 'EMERGENCY';
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  validUntil: Date;
  usageCount: number;
  maxUsage: number;
  auditTrail: EmergencyAccessLog[];
}

/**
 * Emergency access log
 */
export interface EmergencyAccessLog {
  timestamp: Date;
  action: string;
  resourceAccessed: string;
  justification: string;
  ipAddress: string;
  deviceId: string;
}

/**
 * Performance cache data
 */
export interface PerformanceCacheData {
  cacheKey: string;
  data: Record<string, unknown>;
  timestamp: Date;
  ttl: number;
  hitCount: number;
  lastAccessed: Date;
  metadata: Record<string, string | number>;
}

/**
 * Business rule evaluation result
 */
export interface BusinessRuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  evaluation: boolean;
  reasoning: string;
  weight: number;
  category: string;
  dependencies: string[];
  lastUpdated: Date;
}

/**
 * Approval requirement information
 */
export interface ApprovalRequirement {
  required: boolean;
  approvalLevel: 'NONE' | 'MANAGER' | 'DEPARTMENT_HEAD' | 'EXECUTIVE' | 'DUAL';
  approvers: string[];
  reason: string;
  timeLimit: number; // minutes
  escalationPath: string[];
  autoApprovalConditions?: Record<string, string | number | boolean>;
}

/**
 * Resource restriction information
 */
export interface ResourceRestriction {
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
}

/**
 * Hierarchy filtering result
 */
export interface HierarchyFilteringResult {
  originalData: Record<string, unknown>;
  filteredData: Record<string, unknown>;
  filteredFields: string[];
  accessibleRecords: string[];
  restrictedRecords: string[];
  reasoning: string;
}

/**
 * Compliance requirement result
 */
export interface ComplianceRequirementResult {
  complianceType: 'GDPR' | 'SOX' | 'HIPAA' | 'PCI_DSS' | 'CUSTOM';
  compliant: boolean;
  requirements: ComplianceRule[];
  violations: ComplianceViolation[];
  auditTrailRequired: boolean;
  dataRetentionPeriod?: number;
}

/**
 * Compliance rule
 */
export interface ComplianceRule {
  ruleId: string;
  description: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  automated: boolean;
  checkFunction: string;
}

/**
 * Compliance violation
 */
export interface ComplianceViolation {
  ruleId: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  remediation: string;
  reportedBy: string;
  reportedAt: Date;
}

/**
 * Dynamic condition evaluation result
 */
export interface DynamicConditionResult {
  conditionType: 'TIME' | 'LOCATION' | 'DEVICE' | 'NETWORK' | 'BUSINESS_RULE';
  evaluation: boolean;
  currentValue: string | number | boolean;
  expectedValue: string | number | boolean;
  metadata: Record<string, string | number | boolean>;
}

/**
 * Performance optimization result
 */
export interface PerformanceOptimizationResult {
  optimizationType: 'CACHE' | 'PARALLEL' | 'SKIP' | 'PRECOMPUTE';
  enabled: boolean;
  estimatedTimeSaving: number;
  cacheHitRate?: number;
  parallelizationFactor?: number;
}

/**
 * Compliance report data
 */
export interface ComplianceReportData {
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
}

/**
 * Final decision combination result
 */
export interface FinalDecisionResult {
  decision: 'ALLOW' | 'DENY' | 'CONDITIONAL';
  confidence: number; // 0-100
  reasons: string[];
  conditions: PolicyCondition[];
  restrictions: ResourceRestriction[];
  auditRequired: boolean;
  temporaryAccess?: EmergencyAccess;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  conflictType: 'PERMISSION' | 'TEMPLATE' | 'POLICY' | 'HIERARCHY';
  resolutionStrategy:
    | 'MOST_RESTRICTIVE'
    | 'LEAST_RESTRICTIVE'
    | 'PRIORITY_BASED'
    | 'MANUAL';
  originalResults: ValidationStepResult[];
  resolvedResult: ValidationStepResult;
  reasoning: string;
  requiresReview: boolean;
}

/**
 * Base interface for all validation steps
 */
export interface PermissionValidationStep {
  // Step identification
  readonly stepNumber: number;
  readonly stepName: string;
  readonly description: string;

  // Step configuration
  readonly isRequired: boolean;
  readonly canSkip: boolean;
  readonly isAsync: boolean;
  readonly priority: number;

  // Dependencies
  readonly dependsOn?: number[]; // Array of step numbers this step depends on
  readonly conflicts?: number[]; // Array of step numbers this step conflicts with

  // Performance settings
  readonly maxExecutionTime?: number; // milliseconds
  readonly enableCaching?: boolean;
  readonly cacheKeyGenerator?: (context: EnhancedPermissionContext) => string;

  /**
   * Main validation method
   */
  validate(context: EnhancedPermissionContext): Promise<StepValidationResult>;

  /**
   * Pre-validation checks (optional)
   */
  preValidate?(context: EnhancedPermissionContext): Promise<boolean>;

  /**
   * Post-validation cleanup (optional)
   */
  postValidate?(
    context: EnhancedPermissionContext,
    result: StepValidationResult,
  ): Promise<void>;

  /**
   * Determine if this step should be executed based on context
   */
  shouldExecute(context: EnhancedPermissionContext): boolean;

  /**
   * Get estimated execution time for this step
   */
  getEstimatedExecutionTime(context: EnhancedPermissionContext): number;
}

/**
 * Result from individual step validation
 */
export interface StepValidationResult {
  // Step execution result
  result: 'PASS' | 'FAIL' | 'SKIP' | 'WARNING' | 'ERROR';
  reason?: string;
  details?: Record<string, string | number | boolean | Date>;

  // Execution control
  continue: boolean; // Whether to continue with next steps
  escalate?: boolean; // Whether to escalate this decision
  modifyContext?: Partial<EnhancedPermissionContext>; // Context modifications for next steps

  // Performance data
  executionTime?: number;
  cacheHit?: boolean;

  // Additional metadata
  metadata?: Record<string, string | number | boolean | Date>;
  warnings?: string[];
  errors?: string[];

  // Step-specific data
  stepData?: Record<string, unknown>;
}

/**
 * Validation orchestrator interface
 */
export interface PermissionValidationOrchestrator {
  /**
   * Execute all validation steps
   */
  executeValidation(
    context: EnhancedPermissionContext,
  ): Promise<EnhancedPermissionResult>;

  /**
   * Execute specific steps only
   */
  executeSteps(
    context: EnhancedPermissionContext,
    stepNumbers: number[],
  ): Promise<EnhancedPermissionResult>;

  /**
   * Get execution plan for context
   */
  getExecutionPlan(
    context: EnhancedPermissionContext,
  ): Promise<ValidationExecutionPlan>;

  /**
   * Register validation step
   */
  registerStep(step: PermissionValidationStep): void;

  /**
   * Unregister validation step
   */
  unregisterStep(stepNumber: number): void;

  /**
   * Get registered steps
   */
  getRegisteredSteps(): PermissionValidationStep[];
}

/**
 * Validation execution plan
 */
export interface ValidationExecutionPlan {
  // Steps to execute
  steps: {
    stepNumber: number;
    stepName: string;
    estimatedTime: number;
    dependencies: number[];
    canRunInParallel: boolean;
  }[];

  // Execution groups (for parallel execution)
  executionGroups: number[][]; // Array of arrays, each inner array contains steps that can run in parallel

  // Total estimated time
  totalEstimatedTime: number;

  // Optimization flags
  optimizations: {
    cacheEnabled: boolean;
    parallelExecution: boolean;
    earlyExit: boolean;
    skipOptional: boolean;
  };
}

/**
 * Step 1: Pre-validation Interface
 */
export interface PreValidationStep extends PermissionValidationStep {
  validateContext(context: EnhancedPermissionContext): Promise<boolean>;
  validateAuthentication(context: EnhancedPermissionContext): Promise<boolean>;
  validateWorkspace(context: EnhancedPermissionContext): Promise<boolean>;
  validateAction(context: EnhancedPermissionContext): Promise<boolean>;
}

/**
 * Step 2: User Context Resolution Interface
 */
export interface UserContextResolutionStep extends PermissionValidationStep {
  resolveUserHierarchy(workspaceMemberId: string): Promise<UserHierarchyInfo>;
  resolveDepartmentInfo(workspaceMemberId: string): Promise<DepartmentInfo>;
  resolveReportingRelationships(
    workspaceMemberId: string,
  ): Promise<ReportingRelationship[]>;
  resolvePermissionTemplates(
    workspaceMemberId: string,
  ): Promise<PermissionTemplate[]>;
}

/**
 * Step 3: Resource Identification Interface
 */
export interface ResourceIdentificationStep extends PermissionValidationStep {
  identifyResourceType(objectName: string): Promise<string>;
  resolveResourceOwnership(
    objectName: string,
    recordId?: string,
  ): Promise<ResourceOwnership>;
  classifyResourceSensitivity(
    objectName: string,
    recordId?: string,
  ): Promise<string>;
  resolveDependencies(objectName: string, recordId?: string): Promise<string[]>;
}

/**
 * Step 4: Permission Template Check Interface
 */
export interface PermissionTemplateCheckStep extends PermissionValidationStep {
  resolveApplicableTemplates(
    context: EnhancedPermissionContext,
  ): Promise<PermissionTemplate[]>;
  evaluateTemplateConflicts(
    templates: PermissionTemplate[],
  ): Promise<TemplateConflictResolution>;
  applyTemplateHierarchy(
    templates: PermissionTemplate[],
    hierarchyLevel: number,
  ): Promise<PermissionTemplate>;
  resolveTemplatePriority(
    templates: PermissionTemplate[],
  ): Promise<PermissionTemplate[]>;
}

/**
 * Step 5: Action Permission Validation Interface
 */
export interface ActionPermissionValidationStep
  extends PermissionValidationStep {
  validateActionType(action: string, userLevel: number): Promise<boolean>;
  validateRiskLevel(action: string, userClearance: string): Promise<boolean>;
  checkApprovalRequirements(
    action: string,
    context: EnhancedPermissionContext,
  ): Promise<ApprovalRequirement>;
  validateActionConstraints(
    action: string,
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
}

/**
 * Step 6: Resource Permission Check Interface
 */
export interface ResourcePermissionCheckStep extends PermissionValidationStep {
  checkResourceAccess(resourceType: string, userId: string): Promise<boolean>;
  validateResourceCategory(
    resourceCategory: string,
    userPermissions: string[],
  ): Promise<boolean>;
  checkCrossResourceDependencies(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  validateResourceRestrictions(
    context: EnhancedPermissionContext,
  ): Promise<ResourceRestriction[]>;
}

/**
 * Step 7: Hierarchy-based Validation Interface
 */
export interface HierarchyValidationStep extends PermissionValidationStep {
  validateHierarchyLevel(
    userLevel: number,
    requiredLevel: number,
  ): Promise<boolean>;
  checkReportingRelationship(
    sourceUserId: string,
    targetUserId: string,
  ): Promise<string>;
  validateCrossHierarchyAccess(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  applyHierarchyFiltering(
    context: EnhancedPermissionContext,
  ): Promise<HierarchyFilteringResult>;
}

/**
 * Step 8: Data Access Policy Check Interface
 */
export interface DataAccessPolicyCheckStep extends PermissionValidationStep {
  evaluatePolicies(
    context: EnhancedPermissionContext,
  ): Promise<PolicyEvaluationResult[]>;
  parseFilterConditions(
    conditions: Record<string, string | number | boolean>,
  ): Promise<DataFilter[]>;
  applyDepartmentPolicies(
    context: EnhancedPermissionContext,
  ): Promise<PolicyEvaluationResult[]>;
  resolvePolicyConflicts(
    policies: PolicyEvaluationResult[],
  ): Promise<PolicyEvaluationResult>;
}

/**
 * Step 9: Special Permissions Interface
 */
export interface SpecialPermissionsStep extends PermissionValidationStep {
  checkEmergencyAccess(userId: string): Promise<boolean>;
  validateTemporaryElevation(userId: string): Promise<EmergencyAccess | null>;
  checkSystemOverrides(context: EnhancedPermissionContext): Promise<boolean>;
  validateBypassConditions(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
}

/**
 * Step 10: Financial/Sensitive Data Checks Interface
 */
export interface SensitiveDataCheckStep extends PermissionValidationStep {
  validateSalaryDataAccess(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  checkFinancialPermissions(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  validateDataClassification(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  checkComplianceRequirements(
    context: EnhancedPermissionContext,
  ): Promise<ComplianceRequirementResult>;
}

/**
 * Step 11: Department & Team Restrictions Interface
 */
export interface DepartmentRestrictionsStep extends PermissionValidationStep {
  validateDepartmentAccess(
    userDeptId: string,
    targetDeptId: string,
  ): Promise<boolean>;
  checkTeamPermissions(context: EnhancedPermissionContext): Promise<boolean>;
  validateCrossDepartmentRules(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  checkManagerialOverride(context: EnhancedPermissionContext): Promise<boolean>;
}

/**
 * Step 12: Dynamic Conditions Interface
 */
export interface DynamicConditionsStep extends PermissionValidationStep {
  validateTimeRestrictions(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  checkLocationConstraints(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  validateDeviceRestrictions(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  evaluateBusinessRules(
    context: EnhancedPermissionContext,
  ): Promise<BusinessRuleEvaluationResult[]>;
}

/**
 * Step 13: Cache Check & Performance Interface
 */
export interface CachePerformanceStep extends PermissionValidationStep {
  checkCache(
    context: EnhancedPermissionContext,
  ): Promise<PerformanceCacheData | null>;
  updateCache(
    context: EnhancedPermissionContext,
    result: ValidationStepResult,
  ): Promise<void>;
  optimizePerformance(
    context: EnhancedPermissionContext,
  ): Promise<PerformanceOptimizationResult>;
  monitorExecution(
    context: EnhancedPermissionContext,
  ): Promise<StepExecutionMetrics>;
}

/**
 * Step 14: Audit & Logging Interface
 */
export interface AuditLoggingStep extends PermissionValidationStep {
  logPermissionCheck(
    context: EnhancedPermissionContext,
    result: ValidationStepResult,
  ): Promise<void>;
  auditSensitiveAccess(context: EnhancedPermissionContext): Promise<void>;
  trackSecurityEvents(context: EnhancedPermissionContext): Promise<void>;
  generateComplianceReport(
    context: EnhancedPermissionContext,
  ): Promise<ComplianceReportData>;
}

/**
 * Step 15: Final Decision & Response Interface
 */
export interface FinalDecisionStep extends PermissionValidationStep {
  combineResults(
    stepResults: ValidationStepResult[],
  ): Promise<FinalDecisionResult>;
  resolveConflicts(
    conflictingResults: ValidationStepResult[],
  ): Promise<ConflictResolutionResult>;
  generateFinalResponse(
    context: EnhancedPermissionContext,
    combinedResult: FinalDecisionResult,
  ): Promise<EnhancedPermissionResult>;
  applyPostProcessing(
    result: EnhancedPermissionResult,
  ): Promise<EnhancedPermissionResult>;
}

/**
 * Step factory interface for creating validation steps
 */
export interface ValidationStepFactory {
  createStep(
    stepNumber: number,
    config?: Record<string, unknown>,
  ): PermissionValidationStep;
  createAllSteps(config?: Record<string, unknown>): PermissionValidationStep[];
  getStepTypes(): Record<number, string>;
}

/**
 * Validation middleware interface for cross-cutting concerns
 */
export interface ValidationMiddleware {
  readonly name: string;
  readonly priority: number;

  /**
   * Execute before step validation
   */
  beforeStep?(
    context: EnhancedPermissionContext,
    step: PermissionValidationStep,
  ): Promise<void>;

  /**
   * Execute after step validation
   */
  afterStep?(
    context: EnhancedPermissionContext,
    step: PermissionValidationStep,
    result: StepValidationResult,
  ): Promise<void>;

  /**
   * Execute before all validation
   */
  beforeValidation?(context: EnhancedPermissionContext): Promise<void>;

  /**
   * Execute after all validation
   */
  afterValidation?(
    context: EnhancedPermissionContext,
    result: EnhancedPermissionResult,
  ): Promise<void>;

  /**
   * Handle errors during validation
   */
  onError?(
    context: EnhancedPermissionContext,
    error: Error,
    step?: PermissionValidationStep,
  ): Promise<void>;
}

/**
 * Performance monitor interface
 */
export interface PermissionValidationMonitor {
  /**
   * Start monitoring a validation session
   */
  startSession(context: EnhancedPermissionContext): string; // Returns session ID

  /**
   * Record step execution metrics
   */
  recordStepMetrics(
    sessionId: string,
    stepNumber: number,
    metrics: StepExecutionMetrics,
  ): void;

  /**
   * End monitoring session
   */
  endSession(sessionId: string, result: EnhancedPermissionResult): void;

  /**
   * Get performance statistics
   */
  getStatistics(timeRange?: {
    start: Date;
    end: Date;
  }): Promise<PermissionValidationStatistics>;
}

/**
 * Step execution metrics
 */
export interface StepExecutionMetrics {
  stepNumber: number;
  stepName: string;
  executionTime: number;
  memoryUsage?: number;
  cacheHit: boolean;
  result: string;
  errors?: string[];
}

/**
 * Permission validation statistics
 */
export interface PermissionValidationStatistics {
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
}
