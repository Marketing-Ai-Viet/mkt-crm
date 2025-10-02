/**
 * Cache Invalidation Events and Patterns
 * Defines when and how to invalidate RBAC cache based on data changes
 */

/**
 * Cache Invalidation Events
 * These events trigger automatic cache invalidation
 */
export enum CacheInvalidationEvent {
  // User/Member events
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
  USER_DELETED = 'user:deleted',
  USER_DEPARTMENT_CHANGED = 'user:department:changed',
  USER_ROLE_CHANGED = 'user:role:changed',

  // Permission Template events
  TEMPLATE_CREATED = 'template:created',
  TEMPLATE_UPDATED = 'template:updated',
  TEMPLATE_DELETED = 'template:deleted',
  TEMPLATE_ASSIGNED = 'template:assigned',
  TEMPLATE_UNASSIGNED = 'template:unassigned',

  // Permission Override events
  OVERRIDE_CREATED = 'override:created',
  OVERRIDE_UPDATED = 'override:updated',
  OVERRIDE_DELETED = 'override:deleted',
  OVERRIDE_EXPIRED = 'override:expired',

  // Policy events
  POLICY_CREATED = 'policy:created',
  POLICY_UPDATED = 'policy:updated',
  POLICY_DELETED = 'policy:deleted',
  POLICY_ACTIVATED = 'policy:activated',
  POLICY_DEACTIVATED = 'policy:deactivated',

  // Department/Hierarchy events
  DEPARTMENT_CREATED = 'department:created',
  DEPARTMENT_UPDATED = 'department:updated',
  DEPARTMENT_DELETED = 'department:deleted',
  HIERARCHY_CHANGED = 'hierarchy:changed',

  // Resource events
  RESOURCE_CREATED = 'resource:created',
  RESOURCE_UPDATED = 'resource:updated',
  RESOURCE_DELETED = 'resource:deleted',
  RESOURCE_OWNERSHIP_CHANGED = 'resource:ownership:changed',

  // System events
  WORKSPACE_SETTINGS_CHANGED = 'workspace:settings:changed',
  RBAC_CONFIG_CHANGED = 'rbac:config:changed',
  MANUAL_INVALIDATION = 'manual:invalidation',
}

/**
 * Cache Invalidation Patterns
 * Maps events to cache key patterns that should be invalidated
 */
export const CACHE_INVALIDATION_PATTERNS: Record<
  CacheInvalidationEvent,
  string[]
> = {
  // User events - invalidate user-specific caches
  [CacheInvalidationEvent.USER_CREATED]: [
    'rbac:user:context:*',
    'rbac:simplified:validation:*',
  ],
  [CacheInvalidationEvent.USER_UPDATED]: [
    'rbac:user:context:${userId}*',
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:permission:result:*:${workspaceMemberId}:*',
    'rbac:step:result:*:*:${workspaceMemberId}:*',
  ],
  [CacheInvalidationEvent.USER_DELETED]: [
    'rbac:user:context:${userId}*',
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:permission:result:*:${workspaceMemberId}:*',
  ],
  [CacheInvalidationEvent.USER_DEPARTMENT_CHANGED]: [
    'rbac:user:context:${userId}*',
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:department:restrictions:*',
    'rbac:step:result:2:*', // Step 2: User Context
    'rbac:step:result:11:*', // Step 11: Department Restrictions
  ],
  [CacheInvalidationEvent.USER_ROLE_CHANGED]: [
    'rbac:user:context:${userId}*',
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:template:permissions:*',
  ],

  // Permission Template events - invalidate template and validation caches
  [CacheInvalidationEvent.TEMPLATE_CREATED]: [
    'rbac:template:permissions:*',
    'rbac:simplified:validation:*',
  ],
  [CacheInvalidationEvent.TEMPLATE_UPDATED]: [
    'rbac:template:permissions:${templateId}*',
    'rbac:simplified:validation:*',
    'rbac:permission:result:*',
    'rbac:step:result:4:*', // Step 4: Template Check
    'rbac:action:validation:*',
  ],
  [CacheInvalidationEvent.TEMPLATE_DELETED]: [
    'rbac:template:permissions:${templateId}*',
    'rbac:simplified:validation:*',
    'rbac:permission:result:*',
  ],
  [CacheInvalidationEvent.TEMPLATE_ASSIGNED]: [
    'rbac:user:context:${userId}*',
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:template:permissions:${templateId}*',
    'rbac:step:result:2:*:${workspaceMemberId}:*', // Step 2: User Context
  ],
  [CacheInvalidationEvent.TEMPLATE_UNASSIGNED]: [
    'rbac:user:context:${userId}*',
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:template:permissions:${templateId}*',
  ],

  // Permission Override events
  [CacheInvalidationEvent.OVERRIDE_CREATED]: [
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:step:result:9:*', // Step 9: Special Permissions
  ],
  [CacheInvalidationEvent.OVERRIDE_UPDATED]: [
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:step:result:9:*',
  ],
  [CacheInvalidationEvent.OVERRIDE_DELETED]: [
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:step:result:9:*',
  ],
  [CacheInvalidationEvent.OVERRIDE_EXPIRED]: [
    'rbac:simplified:validation:*:${workspaceMemberId}:*',
    'rbac:step:result:9:*',
  ],

  // Policy events
  [CacheInvalidationEvent.POLICY_CREATED]: [
    'rbac:policy:results:*',
    'rbac:simplified:validation:*',
    'rbac:step:result:8:*', // Step 8: Policy Check
  ],
  [CacheInvalidationEvent.POLICY_UPDATED]: [
    'rbac:policy:results:${policyId}*',
    'rbac:simplified:validation:*',
    'rbac:step:result:8:*',
  ],
  [CacheInvalidationEvent.POLICY_DELETED]: [
    'rbac:policy:results:${policyId}*',
    'rbac:simplified:validation:*',
  ],
  [CacheInvalidationEvent.POLICY_ACTIVATED]: [
    'rbac:policy:results:${policyId}*',
    'rbac:simplified:validation:*',
  ],
  [CacheInvalidationEvent.POLICY_DEACTIVATED]: [
    'rbac:policy:results:${policyId}*',
    'rbac:simplified:validation:*',
  ],

  // Department/Hierarchy events
  [CacheInvalidationEvent.DEPARTMENT_CREATED]: [
    'rbac:department:restrictions:*',
    'rbac:hierarchy:cache:*',
  ],
  [CacheInvalidationEvent.DEPARTMENT_UPDATED]: [
    'rbac:department:restrictions:${departmentId}*',
    'rbac:hierarchy:cache:*',
    'rbac:step:result:11:*', // Step 11: Department Restrictions
  ],
  [CacheInvalidationEvent.DEPARTMENT_DELETED]: [
    'rbac:department:restrictions:${departmentId}*',
    'rbac:hierarchy:cache:*',
    'rbac:simplified:validation:*',
  ],
  [CacheInvalidationEvent.HIERARCHY_CHANGED]: [
    'rbac:hierarchy:cache:*',
    'rbac:step:result:7:*', // Step 7: Hierarchy Validation
    'rbac:simplified:validation:*',
  ],

  // Resource events
  [CacheInvalidationEvent.RESOURCE_CREATED]: [
    'rbac:resource:metadata:${resourceType}*',
  ],
  [CacheInvalidationEvent.RESOURCE_UPDATED]: [
    'rbac:resource:metadata:${resourceType}:${recordId}*',
    'rbac:simplified:validation:*:*:${resourceType}:*:${recordId}',
  ],
  [CacheInvalidationEvent.RESOURCE_DELETED]: [
    'rbac:resource:metadata:${resourceType}:${recordId}*',
    'rbac:simplified:validation:*:*:${resourceType}:*:${recordId}',
  ],
  [CacheInvalidationEvent.RESOURCE_OWNERSHIP_CHANGED]: [
    'rbac:resource:access:*:${resourceType}:${recordId}',
    'rbac:step:result:6:*', // Step 6: Resource Permission Check
  ],

  // System events
  [CacheInvalidationEvent.WORKSPACE_SETTINGS_CHANGED]: ['rbac:*'],
  [CacheInvalidationEvent.RBAC_CONFIG_CHANGED]: ['rbac:*'],
  [CacheInvalidationEvent.MANUAL_INVALIDATION]: ['rbac:*'],
};

/**
 * Invalidation Scope
 * Defines the scope of cache invalidation
 */
export enum InvalidationScope {
  USER = 'USER', // Invalidate only user-specific cache
  WORKSPACE = 'WORKSPACE', // Invalidate workspace-wide cache
  GLOBAL = 'GLOBAL', // Invalidate all RBAC cache
  SELECTIVE = 'SELECTIVE', // Invalidate specific patterns only
}

/**
 * Invalidation Priority
 * Higher priority invalidations are processed first
 */
export enum InvalidationPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Event to Priority mapping
 */
export const EVENT_PRIORITY_MAP: Record<
  CacheInvalidationEvent,
  InvalidationPriority
> = {
  // Critical - immediate invalidation required
  [CacheInvalidationEvent.RBAC_CONFIG_CHANGED]: InvalidationPriority.CRITICAL,
  [CacheInvalidationEvent.WORKSPACE_SETTINGS_CHANGED]:
    InvalidationPriority.CRITICAL,

  // High - affects permissions
  [CacheInvalidationEvent.TEMPLATE_UPDATED]: InvalidationPriority.HIGH,
  [CacheInvalidationEvent.TEMPLATE_ASSIGNED]: InvalidationPriority.HIGH,
  [CacheInvalidationEvent.POLICY_UPDATED]: InvalidationPriority.HIGH,
  [CacheInvalidationEvent.USER_ROLE_CHANGED]: InvalidationPriority.HIGH,
  [CacheInvalidationEvent.OVERRIDE_CREATED]: InvalidationPriority.HIGH,

  // Medium - context changes
  [CacheInvalidationEvent.USER_UPDATED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.USER_DEPARTMENT_CHANGED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.DEPARTMENT_UPDATED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.HIERARCHY_CHANGED]: InvalidationPriority.MEDIUM,

  // Low - new entities or deletions
  [CacheInvalidationEvent.USER_CREATED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.TEMPLATE_CREATED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.POLICY_CREATED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.DEPARTMENT_CREATED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.RESOURCE_CREATED]: InvalidationPriority.LOW,

  [CacheInvalidationEvent.USER_DELETED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.TEMPLATE_DELETED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.POLICY_DELETED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.DEPARTMENT_DELETED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.RESOURCE_DELETED]: InvalidationPriority.LOW,

  [CacheInvalidationEvent.TEMPLATE_UNASSIGNED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.OVERRIDE_UPDATED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.OVERRIDE_DELETED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.OVERRIDE_EXPIRED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.POLICY_ACTIVATED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.POLICY_DEACTIVATED]: InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.RESOURCE_UPDATED]: InvalidationPriority.LOW,
  [CacheInvalidationEvent.RESOURCE_OWNERSHIP_CHANGED]:
    InvalidationPriority.MEDIUM,
  [CacheInvalidationEvent.MANUAL_INVALIDATION]: InvalidationPriority.CRITICAL,
};

/**
 * Invalidation Strategy per Validation Mode
 */
export const INVALIDATION_STRATEGY = {
  SIMPLIFIED: {
    // For SIMPLIFIED mode, invalidate more aggressively for consistency
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    invalidateOnWrite: true,
    batchInvalidation: true,
    delayMs: 0, // Immediate
  },
  FULL: {
    // For FULL mode, can use longer TTL and batch invalidation
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    invalidateOnWrite: true,
    batchInvalidation: true,
    delayMs: 1000, // 1 second delay for batching
  },
} as const;
