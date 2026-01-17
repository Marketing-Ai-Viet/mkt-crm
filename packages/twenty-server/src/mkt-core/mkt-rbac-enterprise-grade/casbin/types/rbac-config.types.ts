/**
 * RBAC Configuration types
 *
 * Casbin-only RBAC engine configuration.
 */

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
