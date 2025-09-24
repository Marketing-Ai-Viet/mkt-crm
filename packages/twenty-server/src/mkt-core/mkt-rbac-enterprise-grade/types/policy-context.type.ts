/**
 * Policy Context Types for Enterprise RBAC
 * Supports advanced data access policy evaluation and conditions
 */

import {
  PolicyEvaluationMode,
  PolicyType,
  ConditionOperator,
  LogicalOperator,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/policy.constants';

/**
 * Policy Condition Structure
 */
export type PolicyCondition = {
  // Condition identifier
  id?: string;
  name?: string;

  // Field and operation
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | Date | string[] | number[];

  // Data type information
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

  // Case sensitivity for string operations
  caseSensitive?: boolean;

  // Null handling
  treatNullAs?: string | number | boolean | null;

  // Validation
  required?: boolean;

  // Metadata
  description?: string;
  tags?: string[];
};

/**
 * Complex Condition Group with logical operators
 */
export type ConditionGroup = {
  // Group identifier
  id?: string;
  name?: string;

  // Logical operator for this group
  operator: LogicalOperator;

  // Child conditions or groups
  conditions?: PolicyCondition[];
  groups?: ConditionGroup[];

  // Group configuration
  shortCircuit?: boolean; // Stop evaluation on first match (for OR) or failure (for AND)
  weight?: number; // For weighted evaluation

  // Metadata
  description?: string;
  tags?: string[];
};

/**
 * Policy Filter Configuration
 */
export type PolicyFilter = {
  // Filter identifier
  id: string;
  name: string;
  description?: string;

  // Filter type and scope
  type: PolicyType;
  scope: 'GLOBAL' | 'WORKSPACE' | 'DEPARTMENT' | 'TEAM' | 'USER';

  // Target resource
  resourceType: string;
  resourcePattern?: string; // Regex pattern for resource matching

  // Filter conditions
  rootCondition: ConditionGroup;

  // Filter behavior
  action: 'ALLOW' | 'DENY' | 'MODIFY' | 'AUDIT';
  priority: number;

  // Execution settings
  evaluationMode: PolicyEvaluationMode;
  continueOnError?: boolean;

  // Performance settings
  maxExecutionTime?: number; // milliseconds
  cacheResults?: boolean;
  cacheTTL?: number; // seconds

  // Status and lifecycle
  isActive: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;

  // Metadata
  version: string;
  createdAt: Date;
  createdBy: string;
  lastModified: Date;
  modifiedBy: string;
  tags?: string[];
};

/**
 * Data Access Policy (Main Policy Entity)
 */
export type DataAccessPolicy = {
  // Policy identification
  id: string;
  name: string;
  description?: string;

  // Policy classification
  type: PolicyType;
  category: 'SECURITY' | 'COMPLIANCE' | 'BUSINESS' | 'OPERATIONAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Target and scope
  objectName: string;
  scope: {
    workspaceIds?: string[];
    departmentIds?: string[];
    userIds?: string[];
    hierarchyLevels?: number[];
  };

  // Policy filters and conditions
  filters: PolicyFilter[];

  // Conflict resolution
  priority: number;
  resolutionStrategy:
    | 'DENY_WINS'
    | 'ALLOW_WINS'
    | 'HIGHEST_PRIORITY'
    | 'MOST_SPECIFIC';

  // Execution configuration
  evaluationMode: PolicyEvaluationMode;
  enforcement: 'BLOCK' | 'WARN' | 'AUDIT' | 'DEFER';

  // Performance and caching
  maxEvaluationTime?: number;
  enableCaching?: boolean;
  cacheStrategy?: 'AGGRESSIVE' | 'CONSERVATIVE' | 'DISABLED';

  // Audit and monitoring
  auditLevel: 'NONE' | 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  alertOnViolation?: boolean;
  alertThreshold?: number;

  // Compliance and legal
  complianceFramework?: string[]; // GDPR, HIPAA, SOX, etc.
  legalBasis?: string;
  retentionPeriod?: number; // days

  // Status and lifecycle
  isActive: boolean;
  isDraft?: boolean;
  isSystemPolicy?: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;

  // Approval and workflow
  approvalRequired?: boolean;
  approvedBy?: string;
  approvalDate?: Date;

  // Versioning and history
  version: string;
  parentPolicyId?: string;
  changeReason?: string;

  // Metadata
  createdAt: Date;
  createdBy: string;
  lastModified: Date;
  modifiedBy: string;
  tags?: string[];
  customFields?: Record<string, string | number | boolean | Date>;
};

/**
 * Policy Evaluation Context
 */
export type PolicyEvaluationContext = {
  // Request context
  userId: string;
  workspaceId: string;
  resourceType: string;
  resourceId?: string;
  action: string;

  // User attributes for evaluation
  userAttributes: {
    hierarchyLevel: number;
    departmentId: string;
    roles: string[];
    permissions: string[];
  };

  // Resource attributes for evaluation
  resourceAttributes: {
    ownerId?: string;
    departmentId?: string;
    confidentialityLevel?: string;
  };

  // Request context
  requestContext: {
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
  };

  // Environment variables
  environment: {
    isBusinessHours?: boolean;
    currentTime: Date;
    timezone?: string;
  };

  // Evaluation settings
  evaluationMode?: PolicyEvaluationMode;
  skipCache?: boolean;
  maxExecutionTime?: number;
  debugMode?: boolean;
};

/**
 * Policy Evaluation Result
 */
export type PolicyEvaluationResult = {
  // Overall result
  allowed: boolean;
  action: 'ALLOW' | 'DENY' | 'MODIFY' | 'ESCALATE';
  confidence: number; // 0-100%

  // Applied policies
  appliedPolicies: {
    policyId: string;
    policyName: string;
    result: 'ALLOW' | 'DENY' | 'MODIFY';
    reason: string;
    priority: number;
    executionTime: number;
  }[];

  // Conflicts and resolution
  conflicts?: {
    conflictingPolicies: string[];
    resolutionStrategy: string;
    resolvedBy: string;
    reason: string;
  };

  // Modifications (for MODIFY action)
  modifications?: {
    type: 'FILTER_FIELDS' | 'MASK_VALUES' | 'LIMIT_RECORDS' | 'ADD_CONDITIONS';
    details: Record<string, string | number | boolean | Date>;
  }[];

  // Conditions and filters applied
  appliedFilters?: {
    filterId: string;
    filterName: string;
    conditions: string[];
    effect: string;
  }[];

  // Escalation information
  escalation?: {
    required: boolean;
    approvers: string[];
    reason: string;
    workflowId?: string;
  };

  // Audit and monitoring
  auditRequired: boolean;
  monitoringLevel: 'NONE' | 'BASIC' | 'ENHANCED';
  violations?: {
    type: 'POLICY' | 'COMPLIANCE' | 'SECURITY';
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }[];

  // Performance metadata
  metadata: {
    totalExecutionTime: number;
    policiesEvaluated: number;
    cacheHits: number;
    cacheMisses: number;
    evaluationPath: string[];
  };

  // Warnings and recommendations
  warnings?: string[];
  recommendations?: string[];

  // Debug information (if debug mode enabled)
  debugInfo?: {
    evaluationTrace: Record<string, string | number | boolean | Date>[];
    conditionResults: Record<string, string | number | boolean | Date>;
    variableValues: Record<string, string | number | boolean | Date>;
  };
};

/**
 * Policy Template for common patterns
 */
export type PolicyTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;

  // Template structure
  template: {
    type: PolicyType;
    defaultPriority: number;
    defaultFilters: Partial<PolicyFilter>[];
    requiredParameters: string[];
    optionalParameters: string[];
  };

  // Usage information
  usageCount: number;
  lastUsed?: Date;

  // Template metadata
  isSystemTemplate: boolean;
  version: string;
  createdAt: Date;
  createdBy: string;
};

/**
 * Policy Conflict Resolution Strategy
 */
export type ConflictResolutionStrategy = {
  strategy:
    | 'DENY_WINS'
    | 'ALLOW_WINS'
    | 'HIGHEST_PRIORITY'
    | 'MOST_SPECIFIC'
    | 'CUSTOM';
  customResolver?: string; // Custom function name for CUSTOM strategy
  fallbackAction: 'DENY' | 'ALLOW' | 'ESCALATE';

  // Conflict detection rules
  detectConflicts: boolean;
  conflictTypes: ('ALLOW_DENY' | 'PRIORITY' | 'SCOPE' | 'CONDITIONS')[];

  // Resolution metadata
  logConflicts: boolean;
  alertOnConflicts: boolean;
  maxResolutionTime: number; // milliseconds
};

/**
 * Policy Performance Metrics
 */
export type PolicyPerformanceMetrics = {
  policyId: string;

  // Execution metrics
  averageExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  totalExecutions: number;

  // Cache metrics
  cacheHitRate: number;
  cacheSize: number;
  cacheEvictions: number;

  // Error metrics
  errorRate: number;
  timeoutRate: number;

  // Resource usage
  memoryUsage: number;
  cpuUsage: number;

  // Time period
  periodStart: Date;
  periodEnd: Date;
  lastUpdated: Date;
};

/**
 * Policy Engine Configuration
 */
export type PolicyEngineConfig = {
  // Engine settings
  maxConcurrentEvaluations: number;
  defaultTimeout: number; // milliseconds
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number; // seconds

  // Performance settings
  enableProfiling: boolean;
  enableMetrics: boolean;
  metricsRetentionDays: number;

  // Security settings
  enableSandbox: boolean;
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage

  // Audit settings
  auditAllEvaluations: boolean;
  auditDetailLevel: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  auditRetentionDays: number;

  // Error handling
  continueOnError: boolean;
  fallbackAction: 'DENY' | 'ALLOW' | 'ESCALATE';
  maxRetries: number;
  retryDelay: number; // milliseconds
};

/**
 * Policy Cache Interface
 */
export type PolicyCache = {
  // Cache operations
  get(key: string): Promise<PolicyEvaluationResult | null>;
  set(key: string, result: PolicyEvaluationResult, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Cache key generation
  generateKey(context: PolicyEvaluationContext): string;

  // Cache statistics
  getStats(): Promise<{
    hitRate: number;
    size: number;
    evictions: number;
    errors: number;
  }>;

  // Cache management
  invalidatePattern(pattern: string): Promise<number>;
  warmup(contexts: PolicyEvaluationContext[]): Promise<void>;
};
