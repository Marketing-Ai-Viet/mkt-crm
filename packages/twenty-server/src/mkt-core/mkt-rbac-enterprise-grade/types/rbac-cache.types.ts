/**
 * RBAC Cache Service Types
 *
 * Types cho cache operations, statistics và local cache management
 */

// ============================================
// CACHE STATS TYPES
// ============================================

/**
 * Cache statistics
 */
export type CacheStats = {
  localCacheSize: number;
  hits: number;
  misses: number;
  invalidations: number;
  workspaces: string[];
};

// ============================================
// LOCAL CACHE TYPES
// ============================================

/**
 * Local cache entry with timestamp
 */
export type LocalCacheEntry<T> = {
  data: T;
  timestamp: number;
};

// ============================================
// CACHE TTL TYPES
// ============================================

/**
 * Cache TTL configuration
 */
export type CacheTTLConfig = {
  USER_CONTEXT: number;
  PERMISSION_CHECK: number;
  PERMISSION_SUMMARY: number;
  DATA_FILTER: number;
};
