/**
 * Casbin Cache Key Patterns and TTL Configurations
 *
 * Centralized constants for Casbin RBAC caching in Redis.
 * Used by: CasbinEnforcerService, PolicyVersionRepository, RbacCacheService,
 * DepartmentTreeService, RoleInheritanceCacheService
 */

// ============================================
// CACHE KEY PATTERNS
// ============================================

/**
 * Cache key patterns for Casbin RBAC
 *
 * Consistent key naming convention: rbac:{domain}:{identifier}
 */
export const CASBIN_CACHE_KEYS = {
  // ===== Enforcer Cache =====
  /**
   * Cache key for enforcer per workspace
   * Format: rbac:enforcer:{workspaceId}
   */
  ENFORCER: (workspaceId: string) => `rbac:enforcer:${workspaceId}` as const,

  // ===== Policy Cache =====
  /**
   * Policy version cache
   * Format: rbac:policy:version:{workspaceId}
   */
  POLICY_VERSION: (workspaceId: string) =>
    `rbac:policy:version:${workspaceId}` as const,

  /**
   * Policy hash for idempotency check
   * Format: rbac:policy:hash:{workspaceId}
   */
  POLICY_HASH: (workspaceId: string) =>
    `rbac:policy:hash:${workspaceId}` as const,

  // ===== Department Hierarchy Cache =====
  /**
   * Department ancestors cache
   * Format: rbac:dept:ancestors:{deptId}
   */
  DEPT_ANCESTORS: (deptId: string) => `rbac:dept:ancestors:${deptId}` as const,

  /**
   * Department descendants cache
   * Format: rbac:dept:descendants:{deptId}
   */
  DEPT_DESCENDANTS: (deptId: string) =>
    `rbac:dept:descendants:${deptId}` as const,

  /**
   * Department tree cache
   * Format: rbac:dept:tree:{workspaceId}
   */
  DEPT_TREE: (workspaceId: string) => `rbac:dept:tree:${workspaceId}` as const,

  // ===== User Cache =====
  /**
   * User roles cache per workspace
   * Format: rbac:user:roles:{workspaceId}:{userId}
   */
  USER_ROLES: (workspaceId: string, userId: string) =>
    `rbac:user:roles:${workspaceId}:${userId}` as const,

  /**
   * User permissions cache per workspace
   * Format: rbac:user:permissions:{workspaceId}:{userId}
   */
  USER_PERMISSIONS: (workspaceId: string, userId: string) =>
    `rbac:user:permissions:${workspaceId}:${userId}` as const,

  /**
   * User temporary permissions cache
   * Format: rbac:user:temp:{workspaceId}:{userId}
   */
  USER_TEMP_PERMISSIONS: (workspaceId: string, userId: string) =>
    `rbac:user:temp:${workspaceId}:${userId}` as const,

  // ===== Role Inheritance Cache =====
  /**
   * Role inheritance graph cache per workspace
   * Format: rbac:inheritance:{workspaceId}
   */
  ROLE_INHERITANCE: (workspaceId: string) =>
    `rbac:inheritance:${workspaceId}` as const,

  /**
   * User effective roles cache (includes inherited roles)
   * Format: rbac:effective:roles:{workspaceId}:{userId}
   */
  USER_EFFECTIVE_ROLES: (workspaceId: string, userId: string) =>
    `rbac:effective:roles:${workspaceId}:${userId}` as const,

  // ===== Template Cache =====
  /**
   * Permission template cache
   * Format: rbac:template:{templateId}
   */
  TEMPLATE: (templateId: string) => `rbac:template:${templateId}` as const,

  /**
   * All templates for workspace
   * Format: rbac:templates:{workspaceId}
   */
  TEMPLATES_BY_WORKSPACE: (workspaceId: string) =>
    `rbac:templates:${workspaceId}` as const,

  // ===== Sync Lock =====
  /**
   * Sync lock to prevent concurrent syncs
   * Format: rbac:sync:lock:{workspaceId}
   */
  SYNC_LOCK: (workspaceId: string) => `rbac:sync:lock:${workspaceId}` as const,

  // ===== User Context Cache =====
  /**
   * User context cache
   * Format: rbac:context:{workspaceId}:{userId}
   */
  USER_CONTEXT: (workspaceId: string, userId: string) =>
    `rbac:context:${workspaceId}:${userId}` as const,

  /**
   * Permission check result cache
   * Format: rbac:check:{workspaceId}:{userId}:{resource}:{action}
   */
  PERMISSION_CHECK: (
    workspaceId: string,
    userId: string,
    resource: string,
    action: string,
  ) => `rbac:check:${workspaceId}:${userId}:${resource}:${action}` as const,

  /**
   * Permission summary cache
   * Format: rbac:summary:{workspaceId}:{userId}
   */
  PERMISSION_SUMMARY: (workspaceId: string, userId: string) =>
    `rbac:summary:${workspaceId}:${userId}` as const,

  /**
   * Data filter cache per resource
   * Format: rbac:filter:{workspaceId}:{userId}:{resource}
   */
  DATA_FILTER: (workspaceId: string, userId: string, resource: string) =>
    `rbac:filter:${workspaceId}:${userId}:${resource}` as const,
} as const;

// ============================================
// CACHE TTL CONFIGURATIONS
// ============================================

/**
 * Cache TTL configurations (in seconds)
 *
 * Tiered caching strategy:
 * - Static data (templates, configs): 30min - 24h
 * - Semi-static data (roles, policies): 15min - 1h
 * - Dynamic data (permissions, contexts): 5min - 15min
 * - Locks: 5min (auto-expire safety)
 */
export const CASBIN_CACHE_TTL = {
  // ===== Enforcer (1 hour) =====
  // Enforcer instance is expensive to create, cache longer
  ENFORCER: 3600,

  // ===== Policy Version (24 hours) =====
  // Policy versions change infrequently
  POLICY_VERSION: 86400,

  // ===== Department Hierarchy (1 hour) =====
  // Org structure changes rarely
  DEPT_HIERARCHY: 3600,

  // ===== Role Inheritance Graph (24 hours) =====
  // Role inheritance is very stable
  ROLE_INHERITANCE: 86400,

  // ===== User Effective Roles (15 minutes) =====
  // User role assignments may change
  USER_EFFECTIVE_ROLES: 900,

  // ===== User Roles (15 minutes) =====
  // User role assignments may change
  USER_ROLES: 900,

  // ===== User Permissions (5 minutes) =====
  // Permission checks should be fresh
  USER_PERMISSIONS: 300,

  // ===== Template (30 minutes) =====
  // Permission templates are relatively stable
  TEMPLATE: 1800,

  // ===== Sync Lock (5 minutes) =====
  // Auto-expire for safety in case of crashes
  SYNC_LOCK: 300,

  // ===== User Context (15 minutes) =====
  // User context includes department, level info
  USER_CONTEXT: 900,

  // ===== Permission Check (5 minutes) =====
  // Individual permission check results
  PERMISSION_CHECK: 300,

  // ===== Permission Summary (10 minutes) =====
  // User's full permission summary
  PERMISSION_SUMMARY: 600,

  // ===== Data Filter (10 minutes) =====
  // Data filter conditions
  DATA_FILTER: 600,
} as const;

// ============================================
// CACHE TTL CONFIGURATIONS (in milliseconds)
// ============================================

/**
 * Cache TTL configurations in milliseconds
 *
 * For use cases requiring milliseconds (e.g., setInterval, setTimeout, in-memory caches)
 */
export const CASBIN_CACHE_TTL_MS = {
  // ===== Department Tree (1 hour) =====
  // Tree structure cached in Redis
  DEPT_TREE: CASBIN_CACHE_TTL.DEPT_HIERARCHY * 1000,

  // ===== Local In-Memory Cache (5 minutes) =====
  // Short-lived local cache for hot data (ancestors, descendants)
  LOCAL_CACHE: 5 * 60 * 1000,

  // ===== Enforcer (1 hour) =====
  // Enforcer instance TTL in memory
  ENFORCER: CASBIN_CACHE_TTL.ENFORCER * 1000,

  // ===== User Context (15 minutes) =====
  // User context TTL
  USER_CONTEXT: CASBIN_CACHE_TTL.USER_CONTEXT * 1000,

  // ===== Permission Check (5 minutes) =====
  // Permission check result TTL
  PERMISSION_CHECK: CASBIN_CACHE_TTL.PERMISSION_CHECK * 1000,
} as const;

// ============================================
// TYPE EXPORTS
// ============================================

export type CasbinCacheKey = keyof typeof CASBIN_CACHE_KEYS;
export type CasbinCacheTTL = keyof typeof CASBIN_CACHE_TTL;
export type CasbinCacheTTLMs = keyof typeof CASBIN_CACHE_TTL_MS;
