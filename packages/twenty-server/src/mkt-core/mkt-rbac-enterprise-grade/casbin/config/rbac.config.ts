import { registerAs } from '@nestjs/config';

import {
  RBAC_CACHE_WARMER_DEFAULTS,
  RBAC_ENFORCER_DEFAULTS,
  RBAC_PUBSUB_DEFAULTS,
  RBAC_PUBSUB_ENV,
  RBAC_SYNC_DEFAULTS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config/rbac-config.defaults';
import {
  CasbinRbacConfig,
  RbacCacheWarmerConfig,
  RbacEnforcerConfig,
  RbacPubSubConfig,
  RbacSyncConfig,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/config/rbac-config.types';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  return isNaN(parsed) ? defaultValue : parsed;
};

const getEnvStringArray = (key: string, defaultValue: string[]): string[] => {
  const value = process.env[key];

  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  return value.split(',').map((s) => s.trim());
};

// ============================================
// CONFIG BUILDERS
// ============================================

const buildCacheWarmerConfig = (): RbacCacheWarmerConfig => ({
  enabled: getEnvBoolean(
    'RBAC_CACHE_WARM_ENABLED',
    RBAC_CACHE_WARMER_DEFAULTS.ENABLED,
  ),
  warmOnStartup: getEnvBoolean(
    'RBAC_CACHE_WARM_ON_STARTUP',
    RBAC_CACHE_WARMER_DEFAULTS.WARM_ON_STARTUP,
  ),
  concurrency: getEnvNumber(
    'RBAC_CACHE_WARM_CONCURRENCY',
    RBAC_CACHE_WARMER_DEFAULTS.CONCURRENCY,
  ),
  priorityWorkspaces: getEnvStringArray('RBAC_PRIORITY_WORKSPACES', []),
});

const buildSyncConfig = (): RbacSyncConfig => ({
  maxRetries: getEnvNumber(
    'RBAC_SYNC_MAX_RETRIES',
    RBAC_SYNC_DEFAULTS.MAX_RETRIES,
  ),
  retryDelayMs: getEnvNumber(
    'RBAC_SYNC_RETRY_DELAY_MS',
    RBAC_SYNC_DEFAULTS.RETRY_DELAY_MS,
  ),
  debounceMs: getEnvNumber(
    'RBAC_SYNC_DEBOUNCE_MS',
    RBAC_SYNC_DEFAULTS.DEBOUNCE_MS,
  ),
  maxPoliciesPerWorkspace: getEnvNumber(
    'RBAC_MAX_POLICIES_PER_WORKSPACE',
    RBAC_SYNC_DEFAULTS.MAX_POLICIES_PER_WORKSPACE,
  ),
});

const buildEnforcerConfig = (): RbacEnforcerConfig => ({
  failClosed: getEnvBoolean(
    'RBAC_FAIL_CLOSED',
    RBAC_ENFORCER_DEFAULTS.FAIL_CLOSED,
  ),
  cacheEnabled: getEnvBoolean(
    'RBAC_CACHE_ENABLED',
    RBAC_ENFORCER_DEFAULTS.CACHE_ENABLED,
  ),
  maxEnforcersInMemory: getEnvNumber(
    'RBAC_MAX_ENFORCERS_IN_MEMORY',
    RBAC_ENFORCER_DEFAULTS.MAX_ENFORCERS_IN_MEMORY,
  ),
  enforcerTtlMs: getEnvNumber(
    'RBAC_ENFORCER_TTL_MS',
    RBAC_ENFORCER_DEFAULTS.ENFORCER_TTL_MS,
  ),
});

const buildPubSubConfig = (): RbacPubSubConfig => ({
  enabled: getEnvBoolean(
    RBAC_PUBSUB_ENV.MULTI_REGION_ENABLED,
    RBAC_PUBSUB_DEFAULTS.ENABLED,
  ),
  fallbackReloadIntervalMs: getEnvNumber(
    RBAC_PUBSUB_ENV.FALLBACK_RELOAD_INTERVAL_MS,
    RBAC_PUBSUB_DEFAULTS.FALLBACK_RELOAD_INTERVAL_MS,
  ),
  debounceMs: getEnvNumber(
    RBAC_PUBSUB_ENV.INVALIDATION_DEBOUNCE_MS,
    RBAC_PUBSUB_DEFAULTS.DEBOUNCE_MS,
  ),
  maxMessageAgeMs: getEnvNumber(
    'RBAC_PUBSUB_MAX_MESSAGE_AGE_MS',
    RBAC_PUBSUB_DEFAULTS.MAX_MESSAGE_AGE_MS,
  ),
  reconnectDelayMs: getEnvNumber(
    'RBAC_PUBSUB_RECONNECT_DELAY_MS',
    RBAC_PUBSUB_DEFAULTS.RECONNECT_DELAY_MS,
  ),
  maxReconnectAttempts: getEnvNumber(
    'RBAC_PUBSUB_MAX_RECONNECT_ATTEMPTS',
    RBAC_PUBSUB_DEFAULTS.MAX_RECONNECT_ATTEMPTS,
  ),
});

// ============================================
// MAIN CONFIG
// ============================================

/**
 * RBAC module configuration
 *
 * Registered with NestJS ConfigModule as 'rbac'
 *
 * Environment variables:
 * - RBAC_CACHE_WARM_ENABLED: Enable cache warming (default: true)
 * - RBAC_CACHE_WARM_ON_STARTUP: Warm cache on startup (default: true)
 * - RBAC_CACHE_WARM_CONCURRENCY: Concurrent workspace warming (default: 5)
 * - RBAC_PRIORITY_WORKSPACES: Comma-separated workspace IDs to prioritize
 * - RBAC_SYNC_MAX_RETRIES: Max sync retry attempts (default: 3)
 * - RBAC_SYNC_RETRY_DELAY_MS: Delay between retries (default: 1000)
 * - RBAC_SYNC_DEBOUNCE_MS: Debounce time for sync (default: 500)
 * - RBAC_MAX_POLICIES_PER_WORKSPACE: Max policies per workspace (default: 10000)
 * - RBAC_FAIL_CLOSED: Deny on error (default: true)
 * - RBAC_CACHE_ENABLED: Enable enforcer caching (default: true)
 * - RBAC_MAX_ENFORCERS_IN_MEMORY: Max enforcers in memory (default: 100)
 * - RBAC_ENFORCER_TTL_MS: Enforcer TTL in ms (default: 3600000)
 * - RBAC_MULTI_REGION_ENABLED: Enable cross-region invalidation (default: true)
 * - RBAC_FALLBACK_RELOAD_INTERVAL_MS: Fallback reload interval (default: 3600000)
 * - RBAC_INVALIDATION_DEBOUNCE_MS: Invalidation debounce time (default: 100)
 * - RBAC_PUBSUB_MAX_MESSAGE_AGE_MS: Max message age (default: 300000)
 * - RBAC_PUBSUB_RECONNECT_DELAY_MS: Reconnect delay (default: 1000)
 * - RBAC_PUBSUB_MAX_RECONNECT_ATTEMPTS: Max reconnect attempts (default: 10)
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(rbacConfig.KEY)
 *   private readonly config: CasbinRbacConfig,
 * ) {}
 *
 * // Access config
 * const enabled = this.config.cacheWarmer.enabled;
 * const maxRetries = this.config.sync.maxRetries;
 * const pubsubEnabled = this.config.pubsub.enabled;
 * ```
 */
export const rbacConfig = registerAs(
  'rbac',
  (): CasbinRbacConfig => ({
    cacheWarmer: buildCacheWarmerConfig(),
    sync: buildSyncConfig(),
    enforcer: buildEnforcerConfig(),
    pubsub: buildPubSubConfig(),
  }),
);

/**
 * Config key for injection
 */
export const RBAC_CONFIG_KEY = rbacConfig.KEY;
