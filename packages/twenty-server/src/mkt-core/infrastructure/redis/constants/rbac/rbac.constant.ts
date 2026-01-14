/**
 * RBAC Redis Constants
 *
 * Centralized constants for RBAC cache keys, metrics, and sync operations.
 */

// ============================================
// METRICS CONSTANTS
// ============================================

/**
 * RBAC metrics cache key
 */
export const RBAC_METRICS_KEY = 'rbac-seeder:metrics:checks';

/**
 * Metrics retention time in milliseconds (1 hour)
 */
export const RBAC_METRICS_RETENTION_MS = 3600000;

/**
 * Maximum number of metrics entries to retain
 */
export const RBAC_MAX_METRICS_ENTRIES = 10000;

/**
 * All metrics constants grouped
 */
export const RBAC_METRICS = {
  KEY: RBAC_METRICS_KEY,
  RETENTION_MS: RBAC_METRICS_RETENTION_MS,
  MAX_ENTRIES: RBAC_MAX_METRICS_ENTRIES,
} as const;

// ============================================
// POLICY VERSION / SYNC CONSTANTS
// ============================================

/**
 * Dead letter queue key for failed syncs
 */
export const RBAC_DEAD_LETTER_KEY = 'rbac-seeder:sync:dead_letter';

/**
 * Dead letter TTL in seconds (7 days)
 */
export const RBAC_DEAD_LETTER_TTL = 86400 * 7;

/**
 * Policy version cache key prefix
 */
export const RBAC_POLICY_VERSION_KEY = 'rbac:policy:version';

/**
 * Policy hash cache key prefix
 */
export const RBAC_POLICY_HASH_KEY = 'rbac:policy:hash';

/**
 * All policy version/sync constants grouped
 */
export const RBAC_SYNC = {
  DEAD_LETTER_KEY: RBAC_DEAD_LETTER_KEY,
  DEAD_LETTER_TTL: RBAC_DEAD_LETTER_TTL,
  POLICY_VERSION_KEY: RBAC_POLICY_VERSION_KEY,
  POLICY_HASH_KEY: RBAC_POLICY_HASH_KEY,
} as const;
