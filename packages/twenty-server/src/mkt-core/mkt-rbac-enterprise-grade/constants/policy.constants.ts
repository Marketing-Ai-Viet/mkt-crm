/**
 * Policy Constants and Enums for Enterprise RBAC
 * Contains all policy-related enums, constants, and configuration values
 */

/**
 * Policy Evaluation Modes
 */
export enum PolicyEvaluationMode {
  STRICT = 'STRICT', // All conditions must be met
  PERMISSIVE = 'PERMISSIVE', // Any condition can grant access
  BALANCED = 'BALANCED', // Balanced approach with priority rules
  AUDIT_ONLY = 'AUDIT_ONLY', // Evaluate but don't enforce
}

/**
 * Policy Types
 */
export enum PolicyType {
  DATA_ACCESS = 'DATA_ACCESS',
  FIELD_LEVEL = 'FIELD_LEVEL',
  ROW_LEVEL = 'ROW_LEVEL',
  COLUMN_LEVEL = 'COLUMN_LEVEL',
  TIME_BASED = 'TIME_BASED',
  LOCATION_BASED = 'LOCATION_BASED',
  DEPARTMENT_BASED = 'DEPARTMENT_BASED',
  HIERARCHY_BASED = 'HIERARCHY_BASED',
  CUSTOM = 'CUSTOM',
}

/**
 * Condition Operators for policy evaluation
 */
export enum ConditionOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  IN = 'in',
  NOT_IN = 'nin',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  REGEX = 'regex',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between',
}

/**
 * Logical Operators for combining conditions
 */
export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not',
  XOR = 'xor',
}

/**
 * Policy Constants
 * Configuration values for policy-related functionality
 */
export const POLICY_CONSTANTS = {
  // Evaluation timeouts
  DEFAULT_EVALUATION_TIMEOUT: 5000, // 5 seconds
  MAX_EVALUATION_TIMEOUT: 30000, // 30 seconds

  // Cache settings
  DEFAULT_CACHE_TTL: 300, // 5 minutes
  MAX_CACHE_SIZE: 10000,
  CACHE_CLEANUP_INTERVAL: 60000, // 1 minute

  // Performance limits
  MAX_CONCURRENT_EVALUATIONS: 100,
  MAX_CONDITION_DEPTH: 10,
  MAX_CONDITIONS_PER_GROUP: 50,
  MAX_FILTERS_PER_POLICY: 20,

  // Priority ranges
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 1000,
  DEFAULT_PRIORITY: 500,
  SYSTEM_POLICY_PRIORITY: 100,

  // Audit and monitoring
  AUDIT_RETENTION_DAYS: 365,
  METRICS_RETENTION_DAYS: 90,
  ALERT_THRESHOLD_DEFAULT: 10,

  // Resource limits
  MAX_MEMORY_USAGE_MB: 512,
  MAX_CPU_USAGE_PERCENT: 80,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Policy Cache Keys for standardized caching
 */
export const POLICY_CACHE_KEYS = {
  EVALUATION: (userId: string, resourceType: string, action: string) =>
    `policy:eval:${userId}:${resourceType}:${action}`,
  POLICY: (policyId: string) => `policy:${policyId}`,
  USER_POLICIES: (userId: string) => `policy:user:${userId}`,
  RESOURCE_POLICIES: (resourceType: string) =>
    `policy:resource:${resourceType}`,
  FILTER: (filterId: string) => `policy:filter:${filterId}`,
  TEMPLATE: (templateId: string) => `policy:template:${templateId}`,
  METRICS: (policyId: string, period: string) =>
    `policy:metrics:${policyId}:${period}`,
  CONFLICT_RESOLUTION: (contextHash: string) =>
    `policy:conflict:${contextHash}`,
} as const;

/**
 * Policy Action Constants
 */
export const POLICY_ACTIONS = {
  ALLOW: 'ALLOW',
  DENY: 'DENY',
  MODIFY: 'MODIFY',
  AUDIT: 'AUDIT',
  ESCALATE: 'ESCALATE',
} as const;

/**
 * Policy Scope Constants
 */
export const POLICY_SCOPES = {
  GLOBAL: 'GLOBAL',
  WORKSPACE: 'WORKSPACE',
  DEPARTMENT: 'DEPARTMENT',
  TEAM: 'TEAM',
  USER: 'USER',
} as const;

/**
 * Policy Category Constants
 */
export const POLICY_CATEGORIES = {
  SECURITY: 'SECURITY',
  COMPLIANCE: 'COMPLIANCE',
  BUSINESS: 'BUSINESS',
  OPERATIONAL: 'OPERATIONAL',
} as const;

/**
 * Policy Risk Level Constants
 */
export const POLICY_RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

/**
 * Policy Enforcement Constants
 */
export const POLICY_ENFORCEMENT = {
  BLOCK: 'BLOCK',
  WARN: 'WARN',
  AUDIT: 'AUDIT',
  DEFER: 'DEFER',
} as const;

/**
 * Policy Resolution Strategy Constants
 */
export const POLICY_RESOLUTION_STRATEGIES = {
  DENY_WINS: 'DENY_WINS',
  ALLOW_WINS: 'ALLOW_WINS',
  HIGHEST_PRIORITY: 'HIGHEST_PRIORITY',
  MOST_SPECIFIC: 'MOST_SPECIFIC',
  CUSTOM: 'CUSTOM',
} as const;

/**
 * Policy Cache Strategy Constants
 */
export const POLICY_CACHE_STRATEGIES = {
  AGGRESSIVE: 'AGGRESSIVE',
  CONSERVATIVE: 'CONSERVATIVE',
  DISABLED: 'DISABLED',
} as const;

/**
 * Policy Audit Level Constants
 */
export const POLICY_AUDIT_LEVELS = {
  NONE: 'NONE',
  BASIC: 'BASIC',
  DETAILED: 'DETAILED',
  COMPREHENSIVE: 'COMPREHENSIVE',
} as const;

/**
 * Policy Monitoring Level Constants
 */
export const POLICY_MONITORING_LEVELS = {
  NONE: 'NONE',
  BASIC: 'BASIC',
  ENHANCED: 'ENHANCED',
} as const;

/**
 * Policy Modification Type Constants
 */
export const POLICY_MODIFICATION_TYPES = {
  FILTER_FIELDS: 'FILTER_FIELDS',
  MASK_VALUES: 'MASK_VALUES',
  LIMIT_RECORDS: 'LIMIT_RECORDS',
  ADD_CONDITIONS: 'ADD_CONDITIONS',
} as const;

/**
 * Policy Violation Type Constants
 */
export const POLICY_VIOLATION_TYPES = {
  POLICY: 'POLICY',
  COMPLIANCE: 'COMPLIANCE',
  SECURITY: 'SECURITY',
} as const;

/**
 * Policy Violation Severity Constants
 */
export const POLICY_VIOLATION_SEVERITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

/**
 * Policy Conflict Type Constants
 */
export const POLICY_CONFLICT_TYPES = {
  ALLOW_DENY: 'ALLOW_DENY',
  PRIORITY: 'PRIORITY',
  SCOPE: 'SCOPE',
  CONDITIONS: 'CONDITIONS',
} as const;

/**
 * Data Type Constants for policy conditions
 */
export const POLICY_DATA_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  ARRAY: 'array',
  OBJECT: 'object',
} as const;
