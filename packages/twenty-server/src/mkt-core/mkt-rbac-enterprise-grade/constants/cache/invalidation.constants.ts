/**
 * Cache Invalidation Events and Patterns
 * Defines when and how to invalidate RBAC cache based on data changes
 */

// ============================================================================
// Constants & Builders
// ============================================================================

/**
 * Cache key prefix
 */
const CACHE_PREFIX = 'rbac-seeder' as const;

/**
 * Entity types for cache events
 */
const CACHE_ENTITY = {
  USER: 'user',
  TEMPLATE: 'template',
  OVERRIDE: 'override',
  POLICY: 'policy',
  DEPARTMENT: 'department',
  HIERARCHY: 'hierarchy',
  RESOURCE: 'resource',
  WORKSPACE: 'workspace',
  RBAC: 'rbac',
  MANUAL: 'manual',
} as const;

/**
 * Actions for cache events
 */
const CACHE_ACTION = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  CHANGED: 'changed',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  EXPIRED: 'expired',
  ACTIVATED: 'activated',
  DEACTIVATED: 'deactivated',
  INVALIDATION: 'invalidation',
} as const;

/**
 * Cache key segments for pattern building
 */
const CACHE_SEGMENT = {
  USER_CONTEXT: 'user:context',
  SIMPLIFIED_VALIDATION: 'simplified:validation',
  PERMISSION_RESULT: 'permission:result',
  STEP_RESULT: 'step:result',
  TEMPLATE_PERMISSIONS: 'template:permissions',
  DEPARTMENT_RESTRICTIONS: 'department:restrictions',
  ACTION_VALIDATION: 'action:validation',
  POLICY_RESULTS: 'policy:results',
  HIERARCHY_CACHE: 'hierarchy:cache',
  RESOURCE_METADATA: 'resource:metadata',
  RESOURCE_ACCESS: 'resource:access',
} as const;

/**
 * Validation step numbers for cache invalidation
 */
const VALIDATION_STEP = {
  USER_CONTEXT: 2,
  RESOURCE_PERMISSION: 6,
  HIERARCHY_VALIDATION: 7,
  POLICY_CHECK: 8,
  SPECIAL_PERMISSIONS: 9,
  DEPARTMENT_RESTRICTIONS: 11,
} as const;

type CacheEntityType = (typeof CACHE_ENTITY)[keyof typeof CACHE_ENTITY];

type CacheActionType = (typeof CACHE_ACTION)[keyof typeof CACHE_ACTION];

/**
 * Build event name from entity and action
 */
const BUILD_EVENT = (
  entity: CacheEntityType,
  action: CacheActionType,
  subEntity?: string,
): string => {
  if (subEntity) {
    return `${entity}:${subEntity}:${action}`;
  }

  return `${entity}:${action}`;
};

/**
 * Build cache key pattern
 */
const BUILD_PATTERN = (...segments: (string | number)[]): string => {
  return `${CACHE_PREFIX}:${segments.join(':')}`;
};

/**
 * Build step result pattern
 */
const BUILD_STEP_PATTERN = (step: number, suffix = '*'): string => {
  return BUILD_PATTERN(CACHE_SEGMENT.STEP_RESULT, step, suffix);
};

/**
 * Build pattern with variable placeholder
 */
const BUILD_PATTERN_WITH_VAR = (
  segment: string,
  varName: string,
  suffix = '*',
): string => {
  return BUILD_PATTERN(segment, `\${${varName}}${suffix}`);
};

/**
 * Build all patterns wildcard
 */
const BUILD_WILDCARD = (): string => `${CACHE_PREFIX}:*`;

// ============================================================================
// Cache Invalidation Events Enum
// ============================================================================

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

// ============================================================================
// Event Builder (for dynamic event creation)
// ============================================================================

/**
 * Event builder for creating cache invalidation event names dynamically
 */
export const CACHE_EVENT_BUILDER = {
  entity: CACHE_ENTITY,
  action: CACHE_ACTION,

  /**
   * Build a custom event name
   */
  build: BUILD_EVENT,

  /**
   * Pre-built event builders by entity
   */
  user: {
    created: () => BUILD_EVENT(CACHE_ENTITY.USER, CACHE_ACTION.CREATED),
    updated: () => BUILD_EVENT(CACHE_ENTITY.USER, CACHE_ACTION.UPDATED),
    deleted: () => BUILD_EVENT(CACHE_ENTITY.USER, CACHE_ACTION.DELETED),
    departmentChanged: () =>
      BUILD_EVENT(CACHE_ENTITY.USER, CACHE_ACTION.CHANGED, 'department'),
    roleChanged: () =>
      BUILD_EVENT(CACHE_ENTITY.USER, CACHE_ACTION.CHANGED, 'role'),
  },

  template: {
    created: () => BUILD_EVENT(CACHE_ENTITY.TEMPLATE, CACHE_ACTION.CREATED),
    updated: () => BUILD_EVENT(CACHE_ENTITY.TEMPLATE, CACHE_ACTION.UPDATED),
    deleted: () => BUILD_EVENT(CACHE_ENTITY.TEMPLATE, CACHE_ACTION.DELETED),
    assigned: () => BUILD_EVENT(CACHE_ENTITY.TEMPLATE, CACHE_ACTION.ASSIGNED),
    unassigned: () =>
      BUILD_EVENT(CACHE_ENTITY.TEMPLATE, CACHE_ACTION.UNASSIGNED),
  },

  override: {
    created: () => BUILD_EVENT(CACHE_ENTITY.OVERRIDE, CACHE_ACTION.CREATED),
    updated: () => BUILD_EVENT(CACHE_ENTITY.OVERRIDE, CACHE_ACTION.UPDATED),
    deleted: () => BUILD_EVENT(CACHE_ENTITY.OVERRIDE, CACHE_ACTION.DELETED),
    expired: () => BUILD_EVENT(CACHE_ENTITY.OVERRIDE, CACHE_ACTION.EXPIRED),
  },

  policy: {
    created: () => BUILD_EVENT(CACHE_ENTITY.POLICY, CACHE_ACTION.CREATED),
    updated: () => BUILD_EVENT(CACHE_ENTITY.POLICY, CACHE_ACTION.UPDATED),
    deleted: () => BUILD_EVENT(CACHE_ENTITY.POLICY, CACHE_ACTION.DELETED),
    activated: () => BUILD_EVENT(CACHE_ENTITY.POLICY, CACHE_ACTION.ACTIVATED),
    deactivated: () =>
      BUILD_EVENT(CACHE_ENTITY.POLICY, CACHE_ACTION.DEACTIVATED),
  },

  department: {
    created: () => BUILD_EVENT(CACHE_ENTITY.DEPARTMENT, CACHE_ACTION.CREATED),
    updated: () => BUILD_EVENT(CACHE_ENTITY.DEPARTMENT, CACHE_ACTION.UPDATED),
    deleted: () => BUILD_EVENT(CACHE_ENTITY.DEPARTMENT, CACHE_ACTION.DELETED),
  },

  hierarchy: {
    changed: () => BUILD_EVENT(CACHE_ENTITY.HIERARCHY, CACHE_ACTION.CHANGED),
  },

  resource: {
    created: () => BUILD_EVENT(CACHE_ENTITY.RESOURCE, CACHE_ACTION.CREATED),
    updated: () => BUILD_EVENT(CACHE_ENTITY.RESOURCE, CACHE_ACTION.UPDATED),
    deleted: () => BUILD_EVENT(CACHE_ENTITY.RESOURCE, CACHE_ACTION.DELETED),
    ownershipChanged: () =>
      BUILD_EVENT(CACHE_ENTITY.RESOURCE, CACHE_ACTION.CHANGED, 'ownership'),
  },

  system: {
    workspaceSettingsChanged: () =>
      BUILD_EVENT(CACHE_ENTITY.WORKSPACE, CACHE_ACTION.CHANGED, 'settings'),
    rbacConfigChanged: () =>
      BUILD_EVENT(CACHE_ENTITY.RBAC, CACHE_ACTION.CHANGED, 'config'),
    manualInvalidation: () =>
      BUILD_EVENT(CACHE_ENTITY.MANUAL, CACHE_ACTION.INVALIDATION),
  },
} as const;

// ============================================================================
// Cache Pattern Builder
// ============================================================================

/**
 * Pattern builder for creating cache key patterns dynamically
 */
export const CACHE_PATTERN_BUILDER = {
  segment: CACHE_SEGMENT,
  step: VALIDATION_STEP,

  /**
   * Build a pattern with prefix
   */
  pattern: BUILD_PATTERN,

  /**
   * Build step result pattern
   */
  stepPattern: BUILD_STEP_PATTERN,

  /**
   * Build pattern with variable
   */
  withVar: BUILD_PATTERN_WITH_VAR,

  /**
   * Build wildcard pattern (invalidate all)
   */
  wildcard: BUILD_WILDCARD,

  /**
   * Common patterns
   */
  common: {
    userContext: (varName = '*') =>
      BUILD_PATTERN(CACHE_SEGMENT.USER_CONTEXT, varName),
    simplifiedValidation: (...parts: string[]) =>
      BUILD_PATTERN(CACHE_SEGMENT.SIMPLIFIED_VALIDATION, ...parts),
    permissionResult: (...parts: string[]) =>
      BUILD_PATTERN(CACHE_SEGMENT.PERMISSION_RESULT, ...parts),
    templatePermissions: (varName = '*') =>
      BUILD_PATTERN(CACHE_SEGMENT.TEMPLATE_PERMISSIONS, varName),
    departmentRestrictions: (varName = '*') =>
      BUILD_PATTERN(CACHE_SEGMENT.DEPARTMENT_RESTRICTIONS, varName),
    policyResults: (varName = '*') =>
      BUILD_PATTERN(CACHE_SEGMENT.POLICY_RESULTS, varName),
    hierarchyCache: () => BUILD_PATTERN(CACHE_SEGMENT.HIERARCHY_CACHE, '*'),
    resourceMetadata: (...parts: string[]) =>
      BUILD_PATTERN(CACHE_SEGMENT.RESOURCE_METADATA, ...parts),
    resourceAccess: (...parts: string[]) =>
      BUILD_PATTERN(CACHE_SEGMENT.RESOURCE_ACCESS, ...parts),
    actionValidation: () => BUILD_PATTERN(CACHE_SEGMENT.ACTION_VALIDATION, '*'),
  },
} as const;

// Shorthand alias
const P = CACHE_PATTERN_BUILDER;

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
    P.common.userContext(),
    P.common.simplifiedValidation('*'),
  ],
  [CacheInvalidationEvent.USER_UPDATED]: [
    P.common.userContext('${userId}*'),
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.common.permissionResult('*', '${workspaceMemberId}', '*'),
    P.pattern(CACHE_SEGMENT.STEP_RESULT, '*', '*', '${workspaceMemberId}', '*'),
  ],
  [CacheInvalidationEvent.USER_DELETED]: [
    P.common.userContext('${userId}*'),
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.common.permissionResult('*', '${workspaceMemberId}', '*'),
  ],
  [CacheInvalidationEvent.USER_DEPARTMENT_CHANGED]: [
    P.common.userContext('${userId}*'),
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.common.departmentRestrictions(),
    P.stepPattern(VALIDATION_STEP.USER_CONTEXT), // Step 2: User Context
    P.stepPattern(VALIDATION_STEP.DEPARTMENT_RESTRICTIONS), // Step 11: Department Restrictions
  ],
  [CacheInvalidationEvent.USER_ROLE_CHANGED]: [
    P.common.userContext('${userId}*'),
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.common.templatePermissions(),
  ],

  // Permission Template events - invalidate template and validation caches
  [CacheInvalidationEvent.TEMPLATE_CREATED]: [
    P.common.templatePermissions(),
    P.common.simplifiedValidation('*'),
  ],
  [CacheInvalidationEvent.TEMPLATE_UPDATED]: [
    P.common.templatePermissions('${templateId}*'),
    P.common.simplifiedValidation('*'),
    P.common.permissionResult('*'),
    P.stepPattern(4), // Step 4: Template Check
    P.common.actionValidation(),
  ],
  [CacheInvalidationEvent.TEMPLATE_DELETED]: [
    P.common.templatePermissions('${templateId}*'),
    P.common.simplifiedValidation('*'),
    P.common.permissionResult('*'),
  ],
  [CacheInvalidationEvent.TEMPLATE_ASSIGNED]: [
    P.common.userContext('${userId}*'),
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.common.templatePermissions('${templateId}*'),
    P.pattern(
      CACHE_SEGMENT.STEP_RESULT,
      VALIDATION_STEP.USER_CONTEXT,
      '*',
      '${workspaceMemberId}',
      '*',
    ), // Step 2: User Context
  ],
  [CacheInvalidationEvent.TEMPLATE_UNASSIGNED]: [
    P.common.userContext('${userId}*'),
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.common.templatePermissions('${templateId}*'),
  ],

  // Permission Override events
  [CacheInvalidationEvent.OVERRIDE_CREATED]: [
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.stepPattern(VALIDATION_STEP.SPECIAL_PERMISSIONS), // Step 9: Special Permissions
  ],
  [CacheInvalidationEvent.OVERRIDE_UPDATED]: [
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.stepPattern(VALIDATION_STEP.SPECIAL_PERMISSIONS),
  ],
  [CacheInvalidationEvent.OVERRIDE_DELETED]: [
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.stepPattern(VALIDATION_STEP.SPECIAL_PERMISSIONS),
  ],
  [CacheInvalidationEvent.OVERRIDE_EXPIRED]: [
    P.common.simplifiedValidation('*', '${workspaceMemberId}', '*'),
    P.stepPattern(VALIDATION_STEP.SPECIAL_PERMISSIONS),
  ],

  // Policy events
  [CacheInvalidationEvent.POLICY_CREATED]: [
    P.common.policyResults(),
    P.common.simplifiedValidation('*'),
    P.stepPattern(VALIDATION_STEP.POLICY_CHECK), // Step 8: Policy Check
  ],
  [CacheInvalidationEvent.POLICY_UPDATED]: [
    P.common.policyResults('${policyId}*'),
    P.common.simplifiedValidation('*'),
    P.stepPattern(VALIDATION_STEP.POLICY_CHECK),
  ],
  [CacheInvalidationEvent.POLICY_DELETED]: [
    P.common.policyResults('${policyId}*'),
    P.common.simplifiedValidation('*'),
  ],
  [CacheInvalidationEvent.POLICY_ACTIVATED]: [
    P.common.policyResults('${policyId}*'),
    P.common.simplifiedValidation('*'),
  ],
  [CacheInvalidationEvent.POLICY_DEACTIVATED]: [
    P.common.policyResults('${policyId}*'),
    P.common.simplifiedValidation('*'),
  ],

  // Department/Hierarchy events
  [CacheInvalidationEvent.DEPARTMENT_CREATED]: [
    P.common.departmentRestrictions(),
    P.common.hierarchyCache(),
  ],
  [CacheInvalidationEvent.DEPARTMENT_UPDATED]: [
    P.common.departmentRestrictions('${departmentId}*'),
    P.common.hierarchyCache(),
    P.stepPattern(VALIDATION_STEP.DEPARTMENT_RESTRICTIONS), // Step 11: Department Restrictions
  ],
  [CacheInvalidationEvent.DEPARTMENT_DELETED]: [
    P.common.departmentRestrictions('${departmentId}*'),
    P.common.hierarchyCache(),
    P.common.simplifiedValidation('*'),
  ],
  [CacheInvalidationEvent.HIERARCHY_CHANGED]: [
    P.common.hierarchyCache(),
    P.stepPattern(VALIDATION_STEP.HIERARCHY_VALIDATION), // Step 7: Hierarchy Validation
    P.common.simplifiedValidation('*'),
  ],

  // Resource events
  [CacheInvalidationEvent.RESOURCE_CREATED]: [
    P.common.resourceMetadata('${resourceType}*'),
  ],
  [CacheInvalidationEvent.RESOURCE_UPDATED]: [
    P.common.resourceMetadata('${resourceType}', '${recordId}*'),
    P.common.simplifiedValidation(
      '*',
      '*',
      '${resourceType}',
      '*',
      '${recordId}',
    ),
  ],
  [CacheInvalidationEvent.RESOURCE_DELETED]: [
    P.common.resourceMetadata('${resourceType}', '${recordId}*'),
    P.common.simplifiedValidation(
      '*',
      '*',
      '${resourceType}',
      '*',
      '${recordId}',
    ),
  ],
  [CacheInvalidationEvent.RESOURCE_OWNERSHIP_CHANGED]: [
    P.common.resourceAccess('*', '${resourceType}', '${recordId}'),
    P.stepPattern(VALIDATION_STEP.RESOURCE_PERMISSION), // Step 6: Resource Permission Check
  ],

  // System events
  [CacheInvalidationEvent.WORKSPACE_SETTINGS_CHANGED]: [P.wildcard()],
  [CacheInvalidationEvent.RBAC_CONFIG_CHANGED]: [P.wildcard()],
  [CacheInvalidationEvent.MANUAL_INVALIDATION]: [P.wildcard()],
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

// ============================================================================
// Invalidation Strategy Configuration
// ============================================================================

/**
 * Time constants (in milliseconds)
 */
const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
} as const;

/**
 * Default TTL values for different validation modes
 */
const INVALIDATION_TTL = {
  SIMPLIFIED: 10 * TIME_MS.MINUTE, // 10 minutes
  FULL: 30 * TIME_MS.MINUTE, // 30 minutes
} as const;

/**
 * Delay values for batching
 */
const INVALIDATION_DELAY = {
  IMMEDIATE: 0,
  BATCH: 1 * TIME_MS.SECOND, // 1 second
} as const;

/**
 * Invalidation Strategy per Validation Mode
 */
export const INVALIDATION_STRATEGY = {
  SIMPLIFIED: {
    // For SIMPLIFIED mode, invalidate more aggressively for consistency
    defaultTTL: INVALIDATION_TTL.SIMPLIFIED,
    invalidateOnWrite: true,
    batchInvalidation: true,
    delayMs: INVALIDATION_DELAY.IMMEDIATE,
  },
  FULL: {
    // For FULL mode, can use longer TTL and batch invalidation
    defaultTTL: INVALIDATION_TTL.FULL,
    invalidateOnWrite: true,
    batchInvalidation: true,
    delayMs: INVALIDATION_DELAY.BATCH,
  },
} as const;

// ============================================================================
// Exports for external use
// ============================================================================

export {
  CACHE_PREFIX,
  CACHE_ENTITY,
  CACHE_ACTION,
  CACHE_SEGMENT,
  VALIDATION_STEP,
  TIME_MS,
  INVALIDATION_TTL,
  INVALIDATION_DELAY,
};
