/**
 * Cache key patterns cho Casbin RBAC
 *
 * Sử dụng cho Redis caching
 */
export const CASBIN_CACHE_KEYS = {
  // ===== Enforcer Cache =====
  /**
   * Cache key cho enforcer per workspace
   * Format: rbac-seeder:enforcer:{workspaceId}
   */
  ENFORCER: (workspaceId: string) => `rbac:enforcer:${workspaceId}` as const,

  // ===== Policy Cache =====
  /**
   * Policy version cache
   * Format: rbac-seeder:policy:version:{workspaceId}
   */
  POLICY_VERSION: (workspaceId: string) =>
    `rbac:policy:version:${workspaceId}` as const,

  /**
   * Policy hash cho idempotency check
   * Format: rbac-seeder:policy:hash:{workspaceId}
   */
  POLICY_HASH: (workspaceId: string) =>
    `rbac:policy:hash:${workspaceId}` as const,

  // ===== Department Hierarchy Cache =====
  /**
   * Department ancestors cache
   * Format: rbac-seeder:dept:ancestors:{deptId}
   */
  DEPT_ANCESTORS: (deptId: string) => `rbac:dept:ancestors:${deptId}` as const,

  /**
   * Department descendants cache
   * Format: rbac-seeder:dept:descendants:{deptId}
   */
  DEPT_DESCENDANTS: (deptId: string) =>
    `rbac:dept:descendants:${deptId}` as const,

  /**
   * Department tree cache
   * Format: rbac-seeder:dept:tree:{workspaceId}
   */
  DEPT_TREE: (workspaceId: string) => `rbac:dept:tree:${workspaceId}` as const,

  // ===== User Cache =====
  /**
   * User roles cache per workspace
   * Format: rbac-seeder:user:roles:{workspaceId}:{userId}
   */
  USER_ROLES: (workspaceId: string, userId: string) =>
    `rbac:user:roles:${workspaceId}:${userId}` as const,

  /**
   * User permissions cache per workspace
   * Format: rbac-seeder:user:permissions:{workspaceId}:{userId}
   */
  USER_PERMISSIONS: (workspaceId: string, userId: string) =>
    `rbac:user:permissions:${workspaceId}:${userId}` as const,

  /**
   * User temporary permissions cache
   * Format: rbac-seeder:user:temp:{workspaceId}:{userId}
   */
  USER_TEMP_PERMISSIONS: (workspaceId: string, userId: string) =>
    `rbac:user:temp:${workspaceId}:${userId}` as const,

  // ===== Template Cache =====
  /**
   * Permission template cache
   * Format: rbac-seeder:template:{templateId}
   */
  TEMPLATE: (templateId: string) => `rbac:template:${templateId}` as const,

  /**
   * All templates for workspace
   * Format: rbac-seeder:templates:{workspaceId}
   */
  TEMPLATES_BY_WORKSPACE: (workspaceId: string) =>
    `rbac:templates:${workspaceId}` as const,

  // ===== Sync Lock =====
  /**
   * Sync lock để prevent concurrent syncs
   * Format: rbac-seeder:sync:lock:{workspaceId}
   */
  SYNC_LOCK: (workspaceId: string) => `rbac:sync:lock:${workspaceId}` as const,
} as const;

/**
 * Cache TTL configurations (in seconds)
 */
export const CASBIN_CACHE_TTL = {
  // Enforcer cache: 1 hour
  ENFORCER: 3600,

  // Policy version: 24 hours
  POLICY_VERSION: 86400,

  // Department hierarchy: 1 hour
  DEPT_HIERARCHY: 3600,

  // User roles: 15 minutes
  USER_ROLES: 900,

  // User permissions: 5 minutes
  USER_PERMISSIONS: 300,

  // Template: 30 minutes
  TEMPLATE: 1800,

  // Sync lock: 5 minutes (auto-expire)
  SYNC_LOCK: 300,
} as const;
