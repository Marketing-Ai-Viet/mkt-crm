/**
 * RBAC Configuration types
 */

/**
 * RBAC Engine mode
 * - legacy: Use existing 15-step validation (default)
 * - casbin: Use Casbin enforcer only
 * - shadow: Run both, log discrepancies, use legacy result
 * - shadow_casbin: Run both, log discrepancies, use casbin result
 */
export type RbacEngineMode = 'legacy' | 'casbin' | 'shadow' | 'shadow_casbin';

/**
 * Shadow mode configuration
 */
export type ShadowModeConfig = {
  /**
   * Enable shadow mode comparison
   */
  enabled: boolean;

  /**
   * Log discrepancies between legacy and casbin
   */
  logDiscrepancies: boolean;

  /**
   * Send alert on discrepancy
   */
  alertOnDiscrepancy: boolean;

  /**
   * Sample rate for shadow checks (0.0 - 1.0)
   */
  sampleRate: number;
};

/**
 * Main RBAC Configuration
 */
export type RbacConfig = {
  /**
   * Engine mode
   */
  engine: RbacEngineMode;

  /**
   * List of resolvers enabled for Casbin (for gradual rollout)
   */
  enabledResolvers: string[];

  /**
   * Shadow mode configuration
   */
  shadowMode: ShadowModeConfig;

  /**
   * Fail-closed on error (deny if enforcement fails)
   */
  failClosed: boolean;
};

/**
 * Cache configuration for Casbin
 */
export type CasbinCacheConfig = {
  /**
   * Enable in-memory caching
   */
  enableCache: boolean;

  /**
   * Policy reload interval (ms) as fallback if watcher misses
   */
  policyReloadIntervalMs: number;

  /**
   * Warm cache on application startup
   */
  warmOnStartup: boolean;

  /**
   * Warm cache on deployment
   */
  warmOnDeploy: boolean;

  /**
   * Maximum policies per workspace
   */
  maxPoliciesPerWorkspace: number;

  /**
   * Maximum cache size in MB
   */
  maxCacheSizeMb: number;

  /**
   * P95 latency target in ms
   */
  p95LatencyTargetMs: number;

  /**
   * P99 latency target in ms
   */
  p99LatencyTargetMs: number;
};

/**
 * Watcher configuration
 */
export type WatcherConfig = {
  /**
   * PostgreSQL connection string for NOTIFY
   */
  connectionString: string;

  /**
   * Channel name for NOTIFY
   */
  channel: string;

  /**
   * Maximum reconnect attempts
   */
  maxReconnectAttempts: number;

  /**
   * Base delay for reconnect (ms)
   */
  baseDelayMs: number;
};

/**
 * Sync configuration
 */
export type SyncConfig = {
  /**
   * Debounce time for sync (ms)
   */
  debounceMs: number;

  /**
   * Maximum retries for failed sync
   */
  maxRetries: number;

  /**
   * Enable scheduled full resync
   */
  enableScheduledResync: boolean;

  /**
   * Cron expression for scheduled resync
   */
  scheduledResyncCron: string;
};

/**
 * Complete Casbin module configuration
 */
export type CasbinModuleConfig = {
  rbac: RbacConfig;
  cache: CasbinCacheConfig;
  watcher: WatcherConfig;
  sync: SyncConfig;
};
