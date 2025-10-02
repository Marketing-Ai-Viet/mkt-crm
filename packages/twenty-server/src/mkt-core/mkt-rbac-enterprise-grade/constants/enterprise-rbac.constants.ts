/**
 * Enterprise RBAC Constants
 * Independent module - contains all constants for 15-step validation process
 * No dependencies on legacy RBAC modules
 */

import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Check Results for validation steps
 */
export enum CheckResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  SKIP = 'SKIP',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Permission Sources (Enterprise Independent)
 */
export enum PermissionSource {
  ROLE = 'ROLE',
  USER = 'USER',
  WORKSPACE = 'WORKSPACE',
  SYSTEM = 'SYSTEM',
  PERMISSION_TEMPLATE = 'PERMISSION_TEMPLATE',
  HIERARCHY_INHERITANCE = 'HIERARCHY_INHERITANCE',
  DEPARTMENT_POLICY = 'DEPARTMENT_POLICY',
  SPECIAL_OVERRIDE = 'SPECIAL_OVERRIDE',
  DYNAMIC_CONDITION = 'DYNAMIC_CONDITION',
  EMERGENCY_ACCESS = 'EMERGENCY_ACCESS',
  TEMPORARY_ELEVATION = 'TEMPORARY_ELEVATION',
}

/**
 * Resource Types (Enterprise Independent)
 */
export const RESOURCE_TYPES = {
  BUSINESS_DATA: 'BUSINESS_DATA',
  USER_MGMT: 'USER_MGMT',
  FINANCIAL: 'FINANCIAL',
  SYSTEM_CONFIG: 'SYSTEM_CONFIG',
  REPORTING: 'REPORTING',
} as const;

/**
 * Permission Actions (aligned with permission-actions.constants.ts)
 */
export enum PermissionAction {
  // Basic CRUD operations
  READ = 'READ',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // Advanced operations
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  SHARE = 'SHARE',
  PUBLISH = 'PUBLISH',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',

  // Approval operations
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ESCALATE = 'ESCALATE',

  // System operations
  CONFIGURE = 'CONFIGURE',
  MONITOR = 'MONITOR',
  AUDIT = 'AUDIT',

  // Bulk operations
  BULK_CREATE = 'BULK_CREATE',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
  BULK_EXPORT = 'BULK_EXPORT',

  // Team Management operations (for hierarchy levels)
  MANAGE_TEAM = 'MANAGE_TEAM',
  ASSIGN_TASKS = 'ASSIGN_TASKS',
  VIEW_TEAM_REPORTS = 'VIEW_TEAM_REPORTS',
  CONDUCT_REVIEWS = 'CONDUCT_REVIEWS',

  // Financial operations (sensitive for higher levels)
  ACCESS_SALARY_DATA = 'ACCESS_SALARY_DATA',
  APPROVE_TRANSACTIONS = 'APPROVE_TRANSACTIONS',
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  BUDGET_MANAGEMENT = 'BUDGET_MANAGEMENT',

  // Sensitive data access (hierarchy-based)
  ACCESS_SENSITIVE_DATA = 'ACCESS_SENSITIVE_DATA',
  VIEW_CONFIDENTIAL_INFO = 'VIEW_CONFIDENTIAL_INFO',
  BYPASS_WORKFLOW_APPROVAL = 'BYPASS_WORKFLOW_APPROVAL',

  // Legacy action for backwards compatibility
  MANAGE = 'MANAGE',
}

/**
 * GraphQL Operation Types (Enterprise Independent)
 */
export enum GraphQLOperationType {
  QUERY = 'QUERY',
  MUTATION = 'MUTATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

/**
 * Permission Action Categories (Enterprise Independent)
 */
export const PERMISSION_ACTION_CATEGORIES = {
  DATA_MANIPULATION: 'DATA_MANIPULATION',
  SYSTEM_ADMINISTRATION: 'SYSTEM_ADMINISTRATION',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  FINANCIAL: 'FINANCIAL',
  SECURITY: 'SECURITY',
  COMPLIANCE: 'COMPLIANCE',
  EMERGENCY: 'EMERGENCY',
  AUDIT: 'AUDIT',
} as const;

/**
 * Permission Action Keys (Enterprise Independent)
 */
export const PERMISSION_ACTION_KEYS = {
  // Data actions
  CREATE_RECORD: 'CREATE_RECORD',
  READ_RECORD: 'READ_RECORD',
  UPDATE_RECORD: 'UPDATE_RECORD',
  DELETE_RECORD: 'DELETE_RECORD',

  // Bulk actions
  BULK_CREATE: 'BULK_CREATE',
  BULK_UPDATE: 'BULK_UPDATE',
  BULK_DELETE: 'BULK_DELETE',
  BULK_EXPORT: 'BULK_EXPORT',

  // System actions
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_WORKSPACE: 'MANAGE_WORKSPACE',
  MANAGE_PERMISSIONS: 'MANAGE_PERMISSIONS',
  SYSTEM_CONFIG: 'SYSTEM_CONFIG',

  // Financial actions
  VIEW_FINANCIAL: 'VIEW_FINANCIAL',
  MANAGE_FINANCIAL: 'MANAGE_FINANCIAL',
  APPROVE_BUDGET: 'APPROVE_BUDGET',

  // Security actions
  SECURITY_ADMIN: 'SECURITY_ADMIN',
  EMERGENCY_ACCESS: 'EMERGENCY_ACCESS',
  AUDIT_ACCESS: 'AUDIT_ACCESS',
} as const;

/**
 * Permission Risk Levels (Enterprise Independent)
 */
export const PERMISSION_RISK_LEVELS = {
  VERY_LOW: 'VERY_LOW',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
  MAXIMUM: 'MAXIMUM',
} as const;

/**
 * Permission Resource Categories (Enterprise Independent)
 */
export const PERMISSION_RESOURCE_CATEGORIES = {
  USER_DATA: 'USER_DATA',
  BUSINESS_DATA: 'BUSINESS_DATA',
  FINANCIAL_DATA: 'FINANCIAL_DATA',
  SYSTEM_DATA: 'SYSTEM_DATA',
  AUDIT_DATA: 'AUDIT_DATA',
  SECURITY_CONFIG: 'SECURITY_CONFIG',
  COMPLIANCE_DATA: 'COMPLIANCE_DATA',
  CONFIGURATION: 'CONFIGURATION',
} as const;

/**
 * Permission Resource Keys (Enterprise Independent)
 */
export const PERMISSION_RESOURCE_KEYS = {
  // User resources
  USER: 'USER',
  WORKSPACE_MEMBER: 'WORKSPACE_MEMBER',
  USER_PROFILE: 'USER_PROFILE',

  // Business resources
  CONTACT: 'CONTACT',
  COMPANY: 'COMPANY',
  OPPORTUNITY: 'OPPORTUNITY',
  TASK: 'TASK',

  // System resources
  WORKSPACE: 'WORKSPACE',
  PERMISSION: 'PERMISSION',
  ROLE: 'ROLE',
  SETTING: 'SETTING',

  // Financial resources
  INVOICE: 'INVOICE',
  PAYMENT: 'PAYMENT',
  BUDGET: 'BUDGET',
  SALARY: 'SALARY',

  // Audit resources
  AUDIT_LOG: 'AUDIT_LOG',
  SECURITY_LOG: 'SECURITY_LOG',
  ACCESS_LOG: 'ACCESS_LOG',
} as const;

/**
 * 15-Step Validation Process Constants
 */
export const VALIDATION_STEPS = {
  PRE_VALIDATION: 1,
  USER_CONTEXT_RESOLUTION: 2,
  RESOURCE_IDENTIFICATION: 3,
  PERMISSION_TEMPLATE_CHECK: 4,
  ACTION_PERMISSION_VALIDATION: 5,
  RESOURCE_PERMISSION_CHECK: 6,
  HIERARCHY_VALIDATION: 7,
  DATA_ACCESS_POLICY_CHECK: 8,
  SPECIAL_PERMISSIONS: 9,
  SENSITIVE_DATA_CHECKS: 10,
  DEPARTMENT_RESTRICTIONS: 11,
  DYNAMIC_CONDITIONS: 12,
  CACHE_PERFORMANCE: 13,
  AUDIT_LOGGING: 14,
  FINAL_DECISION: 15,
} as const;

/**
 * Simplified 6-Step Validation (CRUD-only mode)
 * For basic module + action permission checking without advanced features
 */
export const SIMPLIFIED_VALIDATION_STEPS = [
  VALIDATION_STEPS.PRE_VALIDATION, // 1. Basic validation
  VALIDATION_STEPS.USER_CONTEXT_RESOLUTION, // 2. Load user context
  VALIDATION_STEPS.RESOURCE_IDENTIFICATION, // 3. Identify resource/module
  VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK, // 4. Check template permissions
  VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION, // 5. Validate CRUD action
  VALIDATION_STEPS.FINAL_DECISION, // 6. Make final decision
] as const;

/**
 * Full 15-Step Validation (Enterprise mode)
 * Complete validation with all advanced features
 */
export const FULL_VALIDATION_STEPS = [
  VALIDATION_STEPS.PRE_VALIDATION,
  VALIDATION_STEPS.USER_CONTEXT_RESOLUTION,
  VALIDATION_STEPS.RESOURCE_IDENTIFICATION,
  VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK,
  VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION,
  VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK,
  VALIDATION_STEPS.HIERARCHY_VALIDATION,
  VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK,
  VALIDATION_STEPS.SPECIAL_PERMISSIONS,
  VALIDATION_STEPS.SENSITIVE_DATA_CHECKS,
  VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS,
  VALIDATION_STEPS.DYNAMIC_CONDITIONS,
  VALIDATION_STEPS.CACHE_PERFORMANCE,
  VALIDATION_STEPS.AUDIT_LOGGING,
  VALIDATION_STEPS.FINAL_DECISION,
] as const;

/**
 * Hierarchy Levels (1-11) with detailed mappings
 */
export const HIERARCHY_LEVELS = {
  CEO: 1,
  C_LEVEL: 2,
  VP: 3,
  SENIOR_DIRECTOR: 4,
  DIRECTOR: 5,
  SENIOR_MANAGER: 6,
  MANAGER: 7,
  SENIOR_SPECIALIST: 8,
  SPECIALIST: 9,
  JUNIOR_SPECIALIST: 10,
  INTERN: 11,
} as const;

export const HIERARCHY_LEVEL_NAMES = {
  [HIERARCHY_LEVELS.CEO]: 'Chief Executive Officer',
  [HIERARCHY_LEVELS.C_LEVEL]: 'C-Level Executive',
  [HIERARCHY_LEVELS.VP]: 'Vice President',
  [HIERARCHY_LEVELS.SENIOR_DIRECTOR]: 'Senior Director',
  [HIERARCHY_LEVELS.DIRECTOR]: 'Director',
  [HIERARCHY_LEVELS.SENIOR_MANAGER]: 'Senior Manager',
  [HIERARCHY_LEVELS.MANAGER]: 'Manager',
  [HIERARCHY_LEVELS.SENIOR_SPECIALIST]: 'Senior Specialist',
  [HIERARCHY_LEVELS.SPECIALIST]: 'Specialist',
  [HIERARCHY_LEVELS.JUNIOR_SPECIALIST]: 'Junior Specialist',
  [HIERARCHY_LEVELS.INTERN]: 'Intern',
} as const;

/**
 * Data Classification Levels
 */
export const DATA_CLASSIFICATION = {
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED',
  TOP_SECRET: 'TOP_SECRET',
} as const;

/**
 * Security Level Options for Select Fields
 */
export const SECURITY_LEVEL_OPTIONS: Array<{
  value: string;
  label: string;
  position: number;
  color: TagColor;
}> = [
  {
    value: 'PUBLIC',
    label: 'Public',
    position: 0,
    color: 'green',
  },
  {
    value: 'INTERNAL',
    label: 'Internal',
    position: 1,
    color: 'blue',
  },
  {
    value: 'CONFIDENTIAL',
    label: 'Confidential',
    position: 2,
    color: 'orange',
  },
  {
    value: 'RESTRICTED',
    label: 'Restricted',
    position: 3,
    color: 'red',
  },
  {
    value: 'TOP_SECRET',
    label: 'Top Secret',
    position: 4,
    color: 'purple',
  },
];

/**
 * Risk Levels for Actions and Data
 */
export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

/**
 * Permission Sources (Enhanced)
 */
export const ENHANCED_PERMISSION_SOURCES = {
  ...PermissionSource,
  PERMISSION_TEMPLATE: 'PERMISSION_TEMPLATE',
  HIERARCHY_INHERITANCE: 'HIERARCHY_INHERITANCE',
  DEPARTMENT_POLICY: 'DEPARTMENT_POLICY',
  SPECIAL_OVERRIDE: 'SPECIAL_OVERRIDE',
  DYNAMIC_CONDITION: 'DYNAMIC_CONDITION',
} as const;

/**
 * Action Categories (Enhanced from Permission Template)
 */
export const ENHANCED_ACTION_CATEGORIES = {
  ...PERMISSION_ACTION_CATEGORIES,
  SECURITY: 'SECURITY',
  COMPLIANCE: 'COMPLIANCE',
  EMERGENCY: 'EMERGENCY',
} as const;

/**
 * Resource Categories (Enhanced from Permission Template)
 */
export const ENHANCED_RESOURCE_CATEGORIES = {
  ...PERMISSION_RESOURCE_CATEGORIES,
  AUDIT_DATA: 'AUDIT_DATA',
  SECURITY_CONFIG: 'SECURITY_CONFIG',
  COMPLIANCE_DATA: 'COMPLIANCE_DATA',
} as const;

/**
 * Department Types
 */
export const DEPARTMENT_TYPES = {
  EXECUTIVE: 'EXECUTIVE',
  ENGINEERING: 'ENGINEERING',
  PRODUCT: 'PRODUCT',
  SALES: 'SALES',
  MARKETING: 'MARKETING',
  FINANCE: 'FINANCE',
  HR: 'HR',
  OPERATIONS: 'OPERATIONS',
  LEGAL: 'LEGAL',
  SECURITY: 'SECURITY',
  CUSTOMER_SUCCESS: 'CUSTOMER_SUCCESS',
  SUPPORT: 'SUPPORT',
  OTHER: 'OTHER',
} as const;

/**
 * Sensitive Data Types
 */
export const SENSITIVE_DATA_TYPES = {
  SALARY_DATA: 'SALARY_DATA',
  FINANCIAL_DATA: 'FINANCIAL_DATA',
  PERSONAL_DATA: 'PERSONAL_DATA',
  HEALTH_DATA: 'HEALTH_DATA',
  LEGAL_DATA: 'LEGAL_DATA',
  AUDIT_DATA: 'AUDIT_DATA',
  SECURITY_DATA: 'SECURITY_DATA',
} as const;

/**
 * Approval Types
 */
export const APPROVAL_TYPES = {
  AUTOMATIC: 'AUTOMATIC',
  MANAGER: 'MANAGER',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  C_LEVEL: 'C_LEVEL',
  BOARD: 'BOARD',
  EXTERNAL: 'EXTERNAL',
} as const;

/**
 * Time-based Restrictions
 */
export const TIME_RESTRICTIONS = {
  BUSINESS_HOURS_ONLY: 'BUSINESS_HOURS_ONLY',
  WEEKDAYS_ONLY: 'WEEKDAYS_ONLY',
  EMERGENCY_ONLY: 'EMERGENCY_ONLY',
  MAINTENANCE_WINDOW: 'MAINTENANCE_WINDOW',
} as const;

/**
 * Location Restrictions
 */
export const LOCATION_RESTRICTIONS = {
  OFFICE_ONLY: 'OFFICE_ONLY',
  VPN_REQUIRED: 'VPN_REQUIRED',
  GEO_RESTRICTED: 'GEO_RESTRICTED',
  IP_WHITELIST: 'IP_WHITELIST',
} as const;

/**
 * Cache Levels and TTL
 */
export const CACHE_LEVELS = {
  MEMORY: 'MEMORY',
  REDIS: 'REDIS',
  DATABASE: 'DATABASE',
} as const;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  EXTENDED: 3600, // 1 hour
  PERSISTENT: 86400, // 24 hours
} as const;

/**
 * Performance Thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  STEP_WARNING_MS: 50,
  STEP_ERROR_MS: 100,
  TOTAL_WARNING_MS: 200,
  TOTAL_ERROR_MS: 500,
  CACHE_HIT_RATE_MIN: 85,
  MEMORY_USAGE_MAX_MB: 100,
} as const;

/**
 * Audit Levels
 */
export const AUDIT_LEVELS = {
  NONE: 'NONE',
  BASIC: 'BASIC',
  DETAILED: 'DETAILED',
  COMPREHENSIVE: 'COMPREHENSIVE',
} as const;

/**
 * Compliance Frameworks
 */
export const COMPLIANCE_FRAMEWORKS = {
  GDPR: 'GDPR',
  HIPAA: 'HIPAA',
  SOX: 'SOX',
  PCI_DSS: 'PCI_DSS',
  ISO_27001: 'ISO_27001',
  SOC_2: 'SOC_2',
} as const;

/**
 * Error Types
 */
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  POLICY_ERROR: 'POLICY_ERROR',
} as const;

/**
 * Default Values
 */
export const DEFAULT_VALUES = {
  // Timeouts
  DEFAULT_STEP_TIMEOUT: 5000, // 5 seconds
  DEFAULT_TOTAL_TIMEOUT: 30000, // 30 seconds
  EMERGENCY_TIMEOUT: 1000, // 1 second

  // Retry settings
  DEFAULT_RETRY_COUNT: 3,
  DEFAULT_RETRY_DELAY: 1000, // 1 second

  // Cache settings
  DEFAULT_CACHE_TTL: 300, // 5 minutes
  DEFAULT_CACHE_SIZE: 1000,

  // Audit settings
  DEFAULT_AUDIT_RETENTION: 90, // 90 days
  DEFAULT_LOG_LEVEL: 'INFO',

  // Performance settings
  DEFAULT_MAX_CONCURRENT: 100,
  DEFAULT_QUEUE_SIZE: 1000,

  // Security settings
  DEFAULT_SESSION_TIMEOUT: 3600, // 1 hour
  DEFAULT_MAX_ATTEMPTS: 5,
  DEFAULT_LOCKOUT_DURATION: 300, // 5 minutes

  // Unknown values
  UNKNOWN_USER: 'unknown_user',
  UNKNOWN_RESOURCE: 'unknown_resource',
  UNKNOWN_ACTION: 'unknown_action',
  UNKNOWN_DEPARTMENT: 'unknown_department',
} as const;

/**
 * Validation Modes
 */
export const VALIDATION_MODES = {
  STRICT: 'STRICT', // All validations must pass
  PERMISSIVE: 'PERMISSIVE', // Allow with warnings
  AUDIT_ONLY: 'AUDIT_ONLY', // Log but don't enforce
  EMERGENCY: 'EMERGENCY', // Bypass non-critical checks
} as const;

/**
 * Execution Modes
 */
export const EXECUTION_MODES = {
  SYNC: 'SYNC', // Synchronous execution
  ASYNC: 'ASYNC', // Asynchronous execution
  BACKGROUND: 'BACKGROUND', // Background processing
} as const;

/**
 * Priority Levels
 */
export const PRIORITY_LEVELS = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

/**
 * Security Alert Types
 */
export const SECURITY_ALERT_TYPES = {
  PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
  COMPLIANCE_VIOLATION: 'COMPLIANCE_VIOLATION',
} as const;

/**
 * Monitoring Metrics
 */
export const MONITORING_METRICS = {
  PERMISSION_CHECKS_TOTAL: 'rbac_permission_checks_total',
  PERMISSION_CHECK_DURATION: 'rbac_permission_check_duration_seconds',
  PERMISSION_DENIALS_TOTAL: 'rbac_permission_denials_total',
  CACHE_HIT_RATE: 'rbac_cache_hit_rate',
  STEP_EXECUTION_TIME: 'rbac_step_execution_time_seconds',
  ERROR_RATE: 'rbac_error_rate',
  SECURITY_ALERTS_TOTAL: 'rbac_security_alerts_total',
} as const;

/**
 * Cache Key Prefixes
 */
export const CACHE_KEY_PREFIXES = {
  USER_CONTEXT: 'rbac:user:',
  RESOURCE_INFO: 'rbac:resource:',
  PERMISSION_TEMPLATE: 'rbac:template:',
  HIERARCHY_DATA: 'rbac:hierarchy:',
  POLICY_RESULT: 'rbac:policy:',
  PERMISSION_RESULT: 'rbac:permission:',
  DEPARTMENT_DATA: 'rbac:department:',
  AUDIT_DATA: 'rbac:audit:',
} as const;

/**
 * HTTP Headers for RBAC
 */
export const RBAC_HEADERS = {
  REQUEST_ID: 'X-RBAC-Request-ID',
  USER_ID: 'X-RBAC-User-ID',
  WORKSPACE_ID: 'X-RBAC-Workspace-ID',
  PERMISSION_CONTEXT: 'X-RBAC-Permission-Context',
  VALIDATION_MODE: 'X-RBAC-Validation-Mode',
  CACHE_CONTROL: 'X-RBAC-Cache-Control',
  AUDIT_LEVEL: 'X-RBAC-Audit-Level',
} as const;

/**
 * Event Types for Audit
 */
export const AUDIT_EVENT_TYPES = {
  PERMISSION_CHECK: 'PERMISSION_CHECK',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_ESCALATED: 'PERMISSION_ESCALATED',
  POLICY_APPLIED: 'POLICY_APPLIED',
  TEMPLATE_RESOLVED: 'TEMPLATE_RESOLVED',
  HIERARCHY_CHECK: 'HIERARCHY_CHECK',
  SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
  EMERGENCY_ACCESS: 'EMERGENCY_ACCESS',
  SYSTEM_OVERRIDE: 'SYSTEM_OVERRIDE',
} as const;

/**
 * Regex Patterns for Validation
 */
export const VALIDATION_PATTERNS = {
  USER_ID: /^[a-zA-Z0-9\-_]{8,}$/,
  WORKSPACE_ID: /^[a-zA-Z0-9\-_]{8,}$/,
  RESOURCE_NAME: /^[a-zA-Z][a-zA-Z0-9_]*$/,
  POLICY_NAME: /^[a-zA-Z][a-zA-Z0-9_\-\s]{1,100}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  IP_ADDRESS:
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
} as const;

/**
 * Configuration defaults
 */
export const ENTERPRISE_RBAC_CONFIG = {
  // Validation Mode
  // 'SIMPLIFIED' = 6-step validation (CRUD only: Pre-validation, User Context, Resource ID, Template Check, Action Validation, Final Decision)
  // 'FULL' = Full 15-step validation (Enterprise-grade with all features)
  VALIDATION_MODE: (process.env.RBAC_VALIDATION_MODE || 'SIMPLIFIED') as
    | 'SIMPLIFIED'
    | 'FULL',

  // Feature flags
  ENABLE_15_STEP_VALIDATION: true,
  ENABLE_HIERARCHY_VALIDATION: true,
  ENABLE_POLICY_ENGINE: true,
  ENABLE_DYNAMIC_CONDITIONS: true,
  ENABLE_SENSITIVE_DATA_CONTROLS: true,

  // Performance settings
  ENABLE_CACHING: true,
  ENABLE_PARALLEL_EXECUTION: true,
  ENABLE_EARLY_EXIT: true,
  ENABLE_STEP_OPTIMIZATION: true,

  // Security settings
  ENABLE_AUDIT_LOGGING: true,
  ENABLE_SECURITY_MONITORING: true,
  ENABLE_COMPLIANCE_CHECKS: true,
  ENABLE_THREAT_DETECTION: true,

  // Development settings
  ENABLE_DEBUG_MODE: false,
  ENABLE_PROFILING: false,
  ENABLE_METRICS: true,
  ENABLE_TRACING: false,
} as const;

/**
 * Performance and Timeout Configuration for each validation step
 */
export const STEP_PERFORMANCE_CONFIG = {
  // Step 1: Pre-validation
  [VALIDATION_STEPS.PRE_VALIDATION]: {
    maxExecutionTime: 5000, // 5 seconds
    estimatedExecutionTime: 100, // 100ms
    enableCaching: false,
    defaultMaxRequestAge: 300000, // 5 minutes
    retryAttempts: 0,
    priority: 1,
  },

  // Step 2: User Context Resolution
  [VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]: {
    maxExecutionTime: 3000, // 3 seconds
    estimatedExecutionTime: 150, // 150ms
    enableCaching: true,
    cacheExpirationTime: 60000, // 1 minute
    retryAttempts: 1,
    priority: 2,
  },

  // Step 3: Resource Identification
  [VALIDATION_STEPS.RESOURCE_IDENTIFICATION]: {
    maxExecutionTime: 2000, // 2 seconds
    estimatedExecutionTime: 80, // 80ms
    enableCaching: true,
    cacheExpirationTime: 120000, // 2 minutes
    retryAttempts: 1,
    priority: 3,
  },

  // Step 4: Permission Template Check
  [VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]: {
    maxExecutionTime: 4000, // 4 seconds
    estimatedExecutionTime: 200, // 200ms
    enableCaching: true,
    cacheExpirationTime: 300000, // 5 minutes
    retryAttempts: 2,
    priority: 4,
  },

  // Step 5: Action Permission Validation
  [VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION]: {
    maxExecutionTime: 3000, // 3 seconds
    estimatedExecutionTime: 120, // 120ms
    enableCaching: true,
    cacheExpirationTime: 180000, // 3 minutes
    retryAttempts: 1,
    priority: 5,
  },

  // Step 6: Resource Permission Check
  [VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK]: {
    maxExecutionTime: 5000, // 5 seconds
    estimatedExecutionTime: 250, // 250ms
    enableCaching: true,
    cacheExpirationTime: 300000, // 5 minutes
    retryAttempts: 2,
    priority: 6,
  },

  // Step 7: Hierarchy Validation
  [VALIDATION_STEPS.HIERARCHY_VALIDATION]: {
    maxExecutionTime: 6000, // 6 seconds
    estimatedExecutionTime: 300, // 300ms
    enableCaching: true,
    cacheExpirationTime: 600000, // 10 minutes
    retryAttempts: 2,
    priority: 7,
  },

  // Step 8: Data Access Policy Check
  [VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK]: {
    maxExecutionTime: 4000, // 4 seconds
    estimatedExecutionTime: 180, // 180ms
    enableCaching: true,
    cacheExpirationTime: 240000, // 4 minutes
    retryAttempts: 1,
    priority: 8,
  },

  // Step 9: Special Permissions
  [VALIDATION_STEPS.SPECIAL_PERMISSIONS]: {
    maxExecutionTime: 3000, // 3 seconds
    estimatedExecutionTime: 150, // 150ms
    enableCaching: false, // Special permissions should not be cached
    retryAttempts: 0,
    priority: 9,
  },

  // Step 10: Sensitive Data Checks
  [VALIDATION_STEPS.SENSITIVE_DATA_CHECKS]: {
    maxExecutionTime: 7000, // 7 seconds - longer for compliance checks
    estimatedExecutionTime: 400, // 400ms
    enableCaching: true,
    cacheExpirationTime: 900000, // 15 minutes
    retryAttempts: 3,
    priority: 10,
  },

  // Step 11: Department Restrictions
  [VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS]: {
    maxExecutionTime: 3000, // 3 seconds
    estimatedExecutionTime: 120, // 120ms
    enableCaching: true,
    cacheExpirationTime: 600000, // 10 minutes
    retryAttempts: 1,
    priority: 11,
  },

  // Step 12: Dynamic Conditions
  [VALIDATION_STEPS.DYNAMIC_CONDITIONS]: {
    maxExecutionTime: 8000, // 8 seconds - longest for complex conditions
    estimatedExecutionTime: 500, // 500ms
    enableCaching: false, // Dynamic conditions should not be cached
    retryAttempts: 2,
    priority: 12,
  },

  // Step 13: Cache & Performance
  [VALIDATION_STEPS.CACHE_PERFORMANCE]: {
    maxExecutionTime: 1000, // 1 second - fast cache operations
    estimatedExecutionTime: 50, // 50ms
    enableCaching: false, // Meta-step for cache management
    retryAttempts: 0,
    priority: 13,
  },

  // Step 14: Audit & Logging
  [VALIDATION_STEPS.AUDIT_LOGGING]: {
    maxExecutionTime: 2000, // 2 seconds
    estimatedExecutionTime: 100, // 100ms
    enableCaching: false, // Audit should not be cached
    retryAttempts: 3, // Important for compliance
    priority: 14,
  },

  // Step 15: Final Decision
  [VALIDATION_STEPS.FINAL_DECISION]: {
    maxExecutionTime: 1000, // 1 second - just decision logic
    estimatedExecutionTime: 30, // 30ms
    enableCaching: false, // Final decision should not be cached
    retryAttempts: 0,
    priority: 15,
  },
} as const;

/**
 * Global performance thresholds
 */
export const GLOBAL_PERFORMANCE_THRESHOLDS = {
  // Total validation time limits
  TOTAL_MAX_EXECUTION_TIME: 30000, // 30 seconds for all 15 steps
  CRITICAL_STEP_TIMEOUT: 10000, // 10 seconds for critical steps

  // Request age limits
  DEFAULT_MAX_REQUEST_AGE: 300000, // 5 minutes
  EMERGENCY_MAX_REQUEST_AGE: 600000, // 10 minutes for emergency access

  // Cache settings
  DEFAULT_CACHE_EXPIRATION: 300000, // 5 minutes
  LONG_CACHE_EXPIRATION: 3600000, // 1 hour
  SHORT_CACHE_EXPIRATION: 60000, // 1 minute

  // Retry settings
  DEFAULT_RETRY_ATTEMPTS: 1,
  CRITICAL_RETRY_ATTEMPTS: 3,
  NO_RETRY: 0,

  // Performance monitoring
  SLOW_STEP_THRESHOLD: 1000, // 1 second
  CRITICAL_SLOW_THRESHOLD: 5000, // 5 seconds

  // Parallel execution limits
  MAX_PARALLEL_STEPS: 3,
  MAX_CONCURRENT_VALIDATIONS: 10,
} as const;

export const INCOMPATIBLE_COMBINATIONS: Array<{
  resourceType: keyof typeof RESOURCE_TYPES;
  forbiddenActions: PermissionAction[];
  reason: string;
}> = [
  // System resources restrictions
  {
    resourceType: 'SYSTEM_CONFIG',
    forbiddenActions: [PermissionAction.DELETE],
    reason: 'System configuration cannot be deleted',
  },
  {
    resourceType: 'SYSTEM_CONFIG',
    forbiddenActions: [PermissionAction.ARCHIVE],
    reason: 'System configuration cannot be archived',
  },

  // Financial data restrictions
  {
    resourceType: 'FINANCIAL',
    forbiddenActions: [PermissionAction.DELETE],
    reason: 'Financial data cannot be deleted (only archived)',
  },

  // User management restrictions
  {
    resourceType: 'USER_MGMT',
    forbiddenActions: [PermissionAction.DELETE],
    reason: 'User data cannot be deleted (only deactivated)',
  },

  // Reporting restrictions
  {
    resourceType: 'REPORTING',
    forbiddenActions: [PermissionAction.UPDATE, PermissionAction.DELETE],
    reason: 'Reports are read-only resources',
  },
];
