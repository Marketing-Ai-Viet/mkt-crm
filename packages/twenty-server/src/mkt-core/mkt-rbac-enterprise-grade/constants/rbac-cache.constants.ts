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
