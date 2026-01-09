/**
 * RBAC Configuration Types
 *
 * Type definitions for RBAC module configuration
 */

/**
 * Cache warmer configuration
 */
export type RbacCacheWarmerConfig = {
  /** Whether cache warming is enabled */
  enabled: boolean;
  /** Whether to warm cache on application startup */
  warmOnStartup: boolean;
  /** Number of workspaces to warm concurrently */
  concurrency: number;
  /** Priority workspaces to warm first */
  priorityWorkspaces: string[];
};

/**
 * Policy sync configuration
 */
export type RbacSyncConfig = {
  /** Maximum retry attempts for sync operations */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelayMs: number;
  /** Debounce time for rapid sync requests */
  debounceMs: number;
  /** Maximum policies allowed per workspace */
  maxPoliciesPerWorkspace: number;
};

/**
 * Enforcer configuration
 */
export type RbacEnforcerConfig = {
  /** Fail closed (deny) on errors */
  failClosed: boolean;
  /** Enable enforcer caching */
  cacheEnabled: boolean;
  /** Maximum number of enforcers to keep in memory */
  maxEnforcersInMemory: number;
  /** Enforcer TTL in milliseconds */
  enforcerTtlMs: number;
};

/**
 * Pub/Sub configuration for cross-region invalidation
 */
export type RbacPubSubConfig = {
  /** Enable cross-region invalidation (default: true if Redis available) */
  enabled: boolean;
  /** Fallback reload interval in ms (default: 3600000 - 1 hour) */
  fallbackReloadIntervalMs: number;
  /** Debounce time for invalidation events in ms (default: 100) */
  debounceMs: number;
  /** Max message age before ignored in ms (default: 300000 - 5 minutes) */
  maxMessageAgeMs: number;
  /** Reconnect delay in ms (default: 1000) */
  reconnectDelayMs: number;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts: number;
};

/**
 * Pub/sub service status
 */
export type RbacPubSubServiceStatus = {
  enabled: boolean;
  connected: boolean;
  instanceId: string;
  pendingInvalidations: number;
  subscribedChannels?: string[];
};

/**
 * Complete RBAC module configuration
 */
export type CasbinRbacConfig = {
  cacheWarmer: RbacCacheWarmerConfig;
  sync: RbacSyncConfig;
  enforcer: RbacEnforcerConfig;
  pubsub: RbacPubSubConfig;
};
