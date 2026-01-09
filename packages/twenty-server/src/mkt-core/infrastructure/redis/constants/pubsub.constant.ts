/**
 * Centralized Pub/Sub Constants
 *
 * Single source of truth for all mkt-core pub/sub configuration.
 *
 * Includes:
 * - Channel names
 * - Default configuration values
 * - Environment variable names
 * - Message types
 */

// ============================================
// RBAC PUB/SUB CHANNELS
// ============================================

/**
 * RBAC-specific pub/sub channels
 */
export const RBAC_PUBSUB_CHANNELS = {
  /** Policy invalidation channel */
  POLICY_INVALIDATION: 'mkt:pubsub:rbac:policy:invalidation',
  /** Policy sync notification */
  POLICY_SYNC: 'mkt:pubsub:rbac:policy:sync',
  /** Role change notification */
  ROLE_CHANGE: 'mkt:pubsub:rbac:role:change',
  /** Permission template change */
  TEMPLATE_CHANGE: 'mkt:pubsub:rbac:template:change',
  /** User permission change */
  USER_PERMISSION_CHANGE: 'mkt:pubsub:rbac:user:permission:change',
} as const;

export type RbacPubSubChannel =
  (typeof RBAC_PUBSUB_CHANNELS)[keyof typeof RBAC_PUBSUB_CHANNELS];

// ============================================
// RBAC PUB/SUB DEFAULTS
// ============================================

/**
 * Default configuration values for RBAC pub/sub
 */
export const RBAC_PUBSUB_DEFAULTS = {
  /** Enable multi-region invalidation via Redis Pub/Sub */
  ENABLED: true,
  /** Default debounce time in ms for invalidation events */
  DEBOUNCE_MS: 100,
  /** Default fallback reload interval in ms (1 hour) */
  FALLBACK_RELOAD_INTERVAL_MS: 3600000,
  /** Max message age before ignored (5 minutes) */
  MAX_MESSAGE_AGE_MS: 300000,
  /** Reconnect delay in ms */
  RECONNECT_DELAY_MS: 1000,
  /** Max reconnect attempts */
  MAX_RECONNECT_ATTEMPTS: 10,
} as const;

// ============================================
// RBAC PUB/SUB ENVIRONMENT VARIABLES
// ============================================

/**
 * Environment variable names for RBAC pub/sub configuration
 */
export const RBAC_PUBSUB_ENV = {
  /** Enable multi-region mode */
  MULTI_REGION_ENABLED: 'RBAC_MULTI_REGION_ENABLED',
  /** Fallback reload interval */
  FALLBACK_RELOAD_INTERVAL_MS: 'RBAC_FALLBACK_RELOAD_INTERVAL_MS',
  /** Invalidation debounce time */
  INVALIDATION_DEBOUNCE_MS: 'RBAC_INVALIDATION_DEBOUNCE_MS',
  /** Max message age */
  MAX_MESSAGE_AGE_MS: 'RBAC_PUBSUB_MAX_MESSAGE_AGE_MS',
  /** Reconnect delay */
  RECONNECT_DELAY_MS: 'RBAC_PUBSUB_RECONNECT_DELAY_MS',
  /** Max reconnect attempts */
  MAX_RECONNECT_ATTEMPTS: 'RBAC_PUBSUB_MAX_RECONNECT_ATTEMPTS',
} as const;

// ============================================
// RBAC PUB/SUB MESSAGE TYPES
// ============================================

/**
 * RBAC pub/sub message types
 */
export const RBAC_MESSAGE_TYPES = {
  /** Single workspace invalidation */
  INVALIDATE_WORKSPACE: 'invalidate_workspace',
  /** Full reload all workspaces */
  FULL_RELOAD: 'full_reload',
  /** Policy sync completed */
  SYNC_COMPLETED: 'sync_completed',
  /** Role assignment changed */
  ROLE_CHANGED: 'role_changed',
  /** Permission template updated */
  TEMPLATE_UPDATED: 'template_updated',
} as const;

export type RbacMessageType =
  (typeof RBAC_MESSAGE_TYPES)[keyof typeof RBAC_MESSAGE_TYPES];

// ============================================
// COMBINED RBAC PUBSUB CONFIG
// ============================================

/**
 * All RBAC pub/sub configuration
 */
export const RBAC_PUBSUB = {
  CHANNELS: RBAC_PUBSUB_CHANNELS,
  DEFAULTS: RBAC_PUBSUB_DEFAULTS,
  ENV: RBAC_PUBSUB_ENV,
  MESSAGE_TYPES: RBAC_MESSAGE_TYPES,
} as const;
