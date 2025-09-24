/**
 * Validation Step Types for Enterprise RBAC
 * Defines the contract for 15-step permission validation
 * Converted from interfaces to types for better type system integration
 */

import {
  EnhancedPermissionContext,
  ValidationStepResult,
  EnhancedPermissionResult,
} from './enhanced-permission-context.type';

/**
 * Base type for all validation steps
 */
export type PermissionValidationStep = {
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
};

/**
 * Result from individual step validation
 */
export type StepValidationResult = {
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
  stepData?: Record<string, string | number | boolean | Date>;
};

/**
 * Validation orchestrator type
 */
export type PermissionValidationOrchestrator = {
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
};

/**
 * Validation execution plan
 */
export type ValidationExecutionPlan = {
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
};

/**
 * Step 1: Pre-validation Type
 */
export type PreValidationStep = PermissionValidationStep & {
  validateContext(context: EnhancedPermissionContext): Promise<boolean>;
  validateAuthentication(context: EnhancedPermissionContext): Promise<boolean>;
  validateWorkspace(context: EnhancedPermissionContext): Promise<boolean>;
  validateAction(context: EnhancedPermissionContext): Promise<boolean>;
};

/**
 * Step 2: User Context Resolution Type
 */
export type UserContextResolutionStep = PermissionValidationStep & {
  resolveUserHierarchy(
    workspaceMemberId: string,
  ): Promise<Record<string, string | number | boolean | Date>>;
  resolveDepartmentInfo(
    workspaceMemberId: string,
  ): Promise<Record<string, string | number | boolean | Date>>;
  resolveReportingRelationships(
    workspaceMemberId: string,
  ): Promise<Record<string, string | number | boolean | Date>>;
  resolvePermissionTemplates(
    workspaceMemberId: string,
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 3: Resource Identification Type
 */
export type ResourceIdentificationStep = PermissionValidationStep & {
  identifyResourceType(objectName: string): Promise<string>;
  resolveResourceOwnership(
    objectName: string,
    recordId?: string,
  ): Promise<Record<string, string | number | boolean | Date>>;
  classifyResourceSensitivity(
    objectName: string,
    recordId?: string,
  ): Promise<string>;
  resolveDependencies(
    objectName: string,
    recordId?: string,
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 4: Permission Template Check Type
 */
export type PermissionTemplateCheckStep = PermissionValidationStep & {
  resolveApplicableTemplates(
    context: EnhancedPermissionContext,
  ): Promise<Record<string, string | number | boolean | Date>[]>;
  evaluateTemplateConflicts(
    templates: Record<string, string | number | boolean | Date>[],
  ): Promise<Record<string, string | number | boolean | Date>>;
  applyTemplateHierarchy(
    templates: Record<string, string | number | boolean | Date>[],
    hierarchyLevel: number,
  ): Promise<Record<string, string | number | boolean | Date>>;
  resolveTemplatePriority(
    templates: Record<string, string | number | boolean | Date>[],
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 5: Action Permission Validation Type
 */
export type ActionPermissionValidationStep = PermissionValidationStep & {
  validateActionType(action: string, userLevel: number): Promise<boolean>;
  validateRiskLevel(action: string, userClearance: string): Promise<boolean>;
  checkApprovalRequirements(
    action: string,
    context: EnhancedPermissionContext,
  ): Promise<Record<string, string | number | boolean | Date>>;
  validateActionConstraints(
    action: string,
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
};

/**
 * Step 6: Resource Permission Check Type
 */
export type ResourcePermissionCheckStep = PermissionValidationStep & {
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
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 7: Hierarchy-based Validation Type
 */
export type HierarchyValidationStep = PermissionValidationStep & {
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
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 8: Data Access Policy Check Type
 */
export type DataAccessPolicyCheckStep = PermissionValidationStep & {
  evaluatePolicies(
    context: EnhancedPermissionContext,
  ): Promise<Record<string, string | number | boolean | Date>>;
  parseFilterConditions(
    conditions: Record<string, string | number | boolean | Date>,
  ): Promise<Record<string, string | number | boolean | Date>>;
  applyDepartmentPolicies(
    context: EnhancedPermissionContext,
  ): Promise<Record<string, string | number | boolean | Date>>;
  resolvePolicyConflicts(
    policies: Record<string, string | number | boolean | Date>[],
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 9: Special Permissions Type
 */
export type SpecialPermissionsStep = PermissionValidationStep & {
  checkEmergencyAccess(userId: string): Promise<boolean>;
  validateTemporaryElevation(
    userId: string,
  ): Promise<Record<string, string | number | boolean | Date>>;
  checkSystemOverrides(context: EnhancedPermissionContext): Promise<boolean>;
  validateBypassConditions(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
};

/**
 * Step 10: Financial/Sensitive Data Checks Type
 */
export type SensitiveDataCheckStep = PermissionValidationStep & {
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
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 11: Department & Team Restrictions Type
 */
export type DepartmentRestrictionsStep = PermissionValidationStep & {
  validateDepartmentAccess(
    userDeptId: string,
    targetDeptId: string,
  ): Promise<boolean>;
  checkTeamPermissions(context: EnhancedPermissionContext): Promise<boolean>;
  validateCrossDepartmentRules(
    context: EnhancedPermissionContext,
  ): Promise<boolean>;
  checkManagerialOverride(context: EnhancedPermissionContext): Promise<boolean>;
};

/**
 * Step 12: Dynamic Conditions Type
 */
export type DynamicConditionsStep = PermissionValidationStep & {
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
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 13: Cache Check & Performance Type
 */
export type CachePerformanceStep = PermissionValidationStep & {
  checkCache(
    context: EnhancedPermissionContext,
  ): Promise<Record<string, string | number | boolean | Date>>;
  updateCache(
    context: EnhancedPermissionContext,
    result: Record<string, string | number | boolean | Date>,
  ): Promise<void>;
  optimizePerformance(
    context: EnhancedPermissionContext,
  ): Promise<Record<string, string | number | boolean | Date>>;
  monitorExecution(
    context: EnhancedPermissionContext,
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 14: Audit & Logging Type
 */
export type AuditLoggingStep = PermissionValidationStep & {
  logPermissionCheck(
    context: EnhancedPermissionContext,
    result: Record<string, string | number | boolean | Date>,
  ): Promise<void>;
  auditSensitiveAccess(context: EnhancedPermissionContext): Promise<void>;
  trackSecurityEvents(context: EnhancedPermissionContext): Promise<void>;
  generateComplianceReport(
    context: EnhancedPermissionContext,
  ): Promise<Record<string, string | number | boolean | Date>>;
};

/**
 * Step 15: Final Decision & Response Type
 */
export type FinalDecisionStep = PermissionValidationStep & {
  combineResults(
    stepResults: ValidationStepResult[],
  ): Promise<Record<string, string | number | boolean | Date>>;
  resolveConflicts(
    conflictingResults: Record<string, string | number | boolean | Date>[],
  ): Promise<Record<string, string | number | boolean | Date>>;
  generateFinalResponse(
    context: EnhancedPermissionContext,
    combinedResult: Record<string, string | number | boolean | Date>,
  ): Promise<EnhancedPermissionResult>;
  applyPostProcessing(
    result: EnhancedPermissionResult,
  ): Promise<EnhancedPermissionResult>;
};

/**
 * Step factory type for creating validation steps
 */
export type ValidationStepFactory = {
  createStep(
    stepNumber: number,
    config?: Record<string, string | number | boolean | Date>,
  ): PermissionValidationStep;
  createAllSteps(
    config?: Record<string, string | number | boolean | Date>,
  ): PermissionValidationStep[];
  getStepTypes(): Record<number, string>;
};

/**
 * Validation middleware type for cross-cutting concerns
 */
export type ValidationMiddleware = {
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
};

/**
 * Performance monitor type
 */
export type PermissionValidationMonitor = {
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
