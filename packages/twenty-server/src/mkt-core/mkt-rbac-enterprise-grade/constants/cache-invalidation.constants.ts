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
    'rbac-seeder:user:context:*',
    'rbac-seeder:simplified:validation:*',
  ],
  [CacheInvalidationEvent.USER_UPDATED]: [
    'rbac-seeder:user:context:${userId}*',
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:permission:result:*:${workspaceMemberId}:*',
    'rbac-seeder:step:result:*:*:${workspaceMemberId}:*',
  ],
  [CacheInvalidationEvent.USER_DELETED]: [
    'rbac-seeder:user:context:${userId}*',
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:permission:result:*:${workspaceMemberId}:*',
  ],
  [CacheInvalidationEvent.USER_DEPARTMENT_CHANGED]: [
    'rbac-seeder:user:context:${userId}*',
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:department:restrictions:*',
    'rbac-seeder:step:result:2:*', // Step 2: User Context
    'rbac-seeder:step:result:11:*', // Step 11: Department Restrictions
  ],
  [CacheInvalidationEvent.USER_ROLE_CHANGED]: [
    'rbac-seeder:user:context:${userId}*',
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:template:permissions:*',
  ],

  // Permission Template events - invalidate template and validation caches
  [CacheInvalidationEvent.TEMPLATE_CREATED]: [
    'rbac-seeder:template:permissions:*',
    'rbac-seeder:simplified:validation:*',
  ],
  [CacheInvalidationEvent.TEMPLATE_UPDATED]: [
    'rbac-seeder:template:permissions:${templateId}*',
    'rbac-seeder:simplified:validation:*',
    'rbac-seeder:permission:result:*',
    'rbac-seeder:step:result:4:*', // Step 4: Template Check
    'rbac-seeder:action:validation:*',
  ],
  [CacheInvalidationEvent.TEMPLATE_DELETED]: [
    'rbac-seeder:template:permissions:${templateId}*',
    'rbac-seeder:simplified:validation:*',
    'rbac-seeder:permission:result:*',
  ],
  [CacheInvalidationEvent.TEMPLATE_ASSIGNED]: [
    'rbac-seeder:user:context:${userId}*',
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:template:permissions:${templateId}*',
    'rbac-seeder:step:result:2:*:${workspaceMemberId}:*', // Step 2: User Context
  ],
  [CacheInvalidationEvent.TEMPLATE_UNASSIGNED]: [
    'rbac-seeder:user:context:${userId}*',
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:template:permissions:${templateId}*',
  ],

  // Permission Override events
  [CacheInvalidationEvent.OVERRIDE_CREATED]: [
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:step:result:9:*', // Step 9: Special Permissions
  ],
  [CacheInvalidationEvent.OVERRIDE_UPDATED]: [
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:step:result:9:*',
  ],
  [CacheInvalidationEvent.OVERRIDE_DELETED]: [
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:step:result:9:*',
  ],
  [CacheInvalidationEvent.OVERRIDE_EXPIRED]: [
    'rbac-seeder:simplified:validation:*:${workspaceMemberId}:*',
    'rbac-seeder:step:result:9:*',
  ],

  // Policy events
  [CacheInvalidationEvent.POLICY_CREATED]: [
    'rbac-seeder:policy:results:*',
    'rbac-seeder:simplified:validation:*',
    'rbac-seeder:step:result:8:*', // Step 8: Policy Check
  ],
  [CacheInvalidationEvent.POLICY_UPDATED]: [
    'rbac-seeder:policy:results:${policyId}*',
    'rbac-seeder:simplified:validation:*',
    'rbac-seeder:step:result:8:*',
  ],
  [CacheInvalidationEvent.POLICY_DELETED]: [
    'rbac-seeder:policy:results:${policyId}*',
    'rbac-seeder:simplified:validation:*',
  ],
  [CacheInvalidationEvent.POLICY_ACTIVATED]: [
    'rbac-seeder:policy:results:${policyId}*',
    'rbac-seeder:simplified:validation:*',
  ],
  [CacheInvalidationEvent.POLICY_DEACTIVATED]: [
    'rbac-seeder:policy:results:${policyId}*',
    'rbac-seeder:simplified:validation:*',
  ],

  // Department/Hierarchy events
  [CacheInvalidationEvent.DEPARTMENT_CREATED]: [
    'rbac-seeder:department:restrictions:*',
    'rbac-seeder:hierarchy:cache:*',
  ],
  [CacheInvalidationEvent.DEPARTMENT_UPDATED]: [
    'rbac-seeder:department:restrictions:${departmentId}*',
    'rbac-seeder:hierarchy:cache:*',
    'rbac-seeder:step:result:11:*', // Step 11: Department Restrictions
  ],
  [CacheInvalidationEvent.DEPARTMENT_DELETED]: [
    'rbac-seeder:department:restrictions:${departmentId}*',
    'rbac-seeder:hierarchy:cache:*',
    'rbac-seeder:simplified:validation:*',
  ],
  [CacheInvalidationEvent.HIERARCHY_CHANGED]: [
    'rbac-seeder:hierarchy:cache:*',
    'rbac-seeder:step:result:7:*', // Step 7: Hierarchy Validation
    'rbac-seeder:simplified:validation:*',
  ],

  // Resource events
  [CacheInvalidationEvent.RESOURCE_CREATED]: [
    'rbac-seeder:resource:metadata:${resourceType}*',
  ],
  [CacheInvalidationEvent.RESOURCE_UPDATED]: [
    'rbac-seeder:resource:metadata:${resourceType}:${recordId}*',
    'rbac-seeder:simplified:validation:*:*:${resourceType}:*:${recordId}',
  ],
  [CacheInvalidationEvent.RESOURCE_DELETED]: [
    'rbac-seeder:resource:metadata:${resourceType}:${recordId}*',
    'rbac-seeder:simplified:validation:*:*:${resourceType}:*:${recordId}',
  ],
  [CacheInvalidationEvent.RESOURCE_OWNERSHIP_CHANGED]: [
    'rbac-seeder:resource:access:*:${resourceType}:${recordId}',
    'rbac-seeder:step:result:6:*', // Step 6: Resource Permission Check
  ],

  // System events
  [CacheInvalidationEvent.WORKSPACE_SETTINGS_CHANGED]: ['rbac-seeder:*'],
  [CacheInvalidationEvent.RBAC_CONFIG_CHANGED]: ['rbac-seeder:*'],
  [CacheInvalidationEvent.MANUAL_INVALIDATION]: ['rbac-seeder:*'],
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
