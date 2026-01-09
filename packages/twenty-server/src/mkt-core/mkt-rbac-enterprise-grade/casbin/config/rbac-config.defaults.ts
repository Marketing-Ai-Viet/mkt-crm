/**
 * RBAC Configuration Defaults
 *
 * Default values for RBAC module configuration
 */

import { CASBIN_CACHE_TTL } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/casbin-cache-keys.constant';

// Re-export pub/sub constants from infrastructure (single source of truth)
export {
  RBAC_MESSAGE_TYPES,
  RBAC_PUBSUB_CHANNELS,
  RBAC_PUBSUB_DEFAULTS,
  RBAC_PUBSUB_ENV,
  type RbacMessageType,
  type RbacPubSubChannel,
} from 'src/mkt-core/infrastructure/redis/constants/pubsub.constant';

/**
 * Cache warmer defaults
 */
export const RBAC_CACHE_WARMER_DEFAULTS = {
  /** Cache warming enabled by default */
  ENABLED: true,
  /** Warm cache on application startup */
  WARM_ON_STARTUP: true,
  /** Number of workspaces to warm concurrently */
  CONCURRENCY: 5,
} as const;

/**
 * Policy sync defaults
 */
export const RBAC_SYNC_DEFAULTS = {
  /** Maximum retry attempts for sync operations */
  MAX_RETRIES: 3,
  /** Delay between retries in milliseconds */
  RETRY_DELAY_MS: 1000,
  /** Debounce time for rapid sync requests */
  DEBOUNCE_MS: 500,
  /** Maximum policies allowed per workspace */
  MAX_POLICIES_PER_WORKSPACE: 10000,
} as const;

/**
 * Enforcer defaults
 */
export const RBAC_ENFORCER_DEFAULTS = {
  /** Fail closed (deny) on errors */
  FAIL_CLOSED: true,
  /** Enable enforcer caching */
  CACHE_ENABLED: true,
  /** Maximum number of enforcers to keep in memory */
  MAX_ENFORCERS_IN_MEMORY: 100,
  /** Enforcer TTL in milliseconds */
  ENFORCER_TTL_MS: CASBIN_CACHE_TTL.ENFORCER * 1000,
} as const;
