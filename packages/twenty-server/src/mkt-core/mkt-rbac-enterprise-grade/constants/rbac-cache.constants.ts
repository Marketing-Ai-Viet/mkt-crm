import { VALIDATION_STEPS } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';

/**
 * Cache key patterns for RBAC system
 */
export const RBAC_CACHE_KEYS = {
  PERMISSION_RESULT: 'rbac:permission:result',
  USER_CONTEXT: 'rbac:user:context',
  TEMPLATE_PERMISSIONS: 'rbac:template:permissions',
  RESOURCE_ACCESS: 'rbac:resource:access',
  HIERARCHY_CACHE: 'rbac:hierarchy:cache',
  POLICY_RESULTS: 'rbac:policy:results',
  DEPARTMENT_RESTRICTIONS: 'rbac:department:restrictions',
  SENSITIVE_DATA_ACCESS: 'rbac:sensitive:access',
  DYNAMIC_CONDITIONS: 'rbac:dynamic:conditions',
  PERFORMANCE_METRICS: 'rbac:performance:metrics',

  // Simplified 6-step validation cache keys
  STEP_RESULT: 'rbac:step:result', // Cache individual step results
  SIMPLIFIED_VALIDATION: 'rbac:simplified:validation', // Cache full simplified validation
  RESOURCE_METADATA: 'rbac:resource:metadata', // Cache resource metadata
  ACTION_VALIDATION: 'rbac:action:validation', // Cache action validation

  // Config tables cache keys (static/rarely-changed data)
  CONFIG_PRIORITY: 'rbac:config:priority', // Permission priority configs
  CONFIG_ACTIONS: 'rbac:config:actions', // Permission actions
  CONFIG_RESOURCES: 'rbac:config:resources', // Permission resources
  CONFIG_CONTEXTS: 'rbac:config:contexts', // Permission contexts
} as const;

/**
 * TTL configurations for different cache types (in milliseconds)
 */
export const RBAC_CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes - for dynamic data
  MEDIUM: 30 * 60 * 1000, // 30 minutes - for user contexts
  LONG: 2 * 60 * 60 * 1000, // 2 hours - for permission templates
  EXTENDED: 24 * 60 * 60 * 1000, // 24 hours - for system configurations
  PERFORMANCE: 60 * 1000, // 1 minute - for performance metrics

  // Simplified 6-step validation TTLs (optimized for performance)
  SIMPLIFIED_RESULT: 10 * 60 * 1000, // 10 minutes - full simplified validation result
  STEP_RESULT: 15 * 60 * 1000, // 15 minutes - individual step results
  RESOURCE_META: 30 * 60 * 1000, // 30 minutes - resource metadata (stable)
  ACTION_CHECK: 20 * 60 * 1000, // 20 minutes - action validation

  // Config tables TTLs (static/rarely-changed data)
  CONFIG_PRIORITY: 6 * 60 * 60 * 1000, // 6 hours - priority configs
  CONFIG_ACTIONS: 24 * 60 * 60 * 1000, // 24 hours - actions (very stable)
  CONFIG_RESOURCES: 24 * 60 * 60 * 1000, // 24 hours - resources (very stable)
  CONFIG_CONTEXTS: 12 * 60 * 60 * 1000, // 12 hours - contexts (moderately stable)
} as const;

/**
 * Cache cleanup and monitoring intervals (in milliseconds)
 */
export const RBAC_CACHE_INTERVALS = {
  PERFORMANCE_MONITORING: 5 * 60 * 1000, // 5 minutes
  CLEANUP: 10 * 60 * 1000, // 10 minutes
  ACCESS_TRACKING_RETENTION: 24 * 60 * 60 * 1000, // 24 hours
  METRICS_RESET: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/**
 * Cache optimization strategies
 */
export enum CacheOptimizationStrategy {
  CONSERVATIVE = 'CONSERVATIVE',
  BALANCED = 'BALANCED',
  AGGRESSIVE = 'AGGRESSIVE',
  ADAPTIVE = 'ADAPTIVE',
}

/**
 * Decision weights for different validation steps
 * Higher weight = more important in final decision
 *
 * CRM Business Context:
 * - Customer/Contact/Company data: High sensitivity
 * - Sales/Opportunity data: Medium-High sensitivity
 * - Tasks/Activities: Medium sensitivity
 * - Template & Action validation are CORE (always required in both modes)
 */
export const STEP_WEIGHTS = {
  // SIMPLIFIED MODE - Core 6 steps (always active)
  [VALIDATION_STEPS.PRE_VALIDATION]: 100, // Critical - blocks everything if fails
  [VALIDATION_STEPS.USER_CONTEXT_RESOLUTION]: 95, // Essential - must know who is acting
  [VALIDATION_STEPS.RESOURCE_IDENTIFICATION]: 90, // Essential - must know what resource
  [VALIDATION_STEPS.PERMISSION_TEMPLATE_CHECK]: 85, // Core - template-based permissions
  [VALIDATION_STEPS.ACTION_PERMISSION_VALIDATION]: 85, // Core - CRUD action validation

  // FULL MODE - Additional 8 steps (enterprise features)
  [VALIDATION_STEPS.RESOURCE_PERMISSION_CHECK]: 75, // Resource-specific permissions
  [VALIDATION_STEPS.HIERARCHY_VALIDATION]: 70, // Organizational hierarchy (Manager → Team Lead → Staff)
  [VALIDATION_STEPS.DATA_ACCESS_POLICY_CHECK]: 65, // Data access policies
  [VALIDATION_STEPS.SPECIAL_PERMISSIONS]: 60, // Override mechanisms (Admin, Support)
  [VALIDATION_STEPS.SENSITIVE_DATA_CHECKS]: 80, // Critical for CRM (customer PII, financial)
  [VALIDATION_STEPS.DEPARTMENT_RESTRICTIONS]: 55, // Departmental boundaries (Sales, Marketing, CS)
  [VALIDATION_STEPS.DYNAMIC_CONDITIONS]: 50, // Time/Location restrictions
  [VALIDATION_STEPS.CACHE_PERFORMANCE]: 20, // Performance optimization
  [VALIDATION_STEPS.AUDIT_LOGGING]: 30, // Logging and monitoring
} as const;

/**
 * Final decision outcomes
 */
export enum FinalDecision {
  GRANT = 'GRANT',
  DENY = 'DENY',
  CONDITIONAL_GRANT = 'CONDITIONAL_GRANT',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  ESCALATE = 'ESCALATE',
  ERROR = 'ERROR',
}

/**
 * Decision confidence levels
 */
export enum ConfidenceLevel {
  VERY_LOW = 'VERY_LOW', // 0-20%
  LOW = 'LOW', // 21-40%
  MEDIUM = 'MEDIUM', // 41-60%
  HIGH = 'HIGH', // 61-80%
  VERY_HIGH = 'VERY_HIGH', // 81-100%
}
