/**
 * TTL Getter Utilities
 *
 * Helper functions to get TTL values from the centralized configuration.
 */

import {
  CACHE_TTL,
  MKT_CACHE_TTL_CONFIG,
} from 'src/mkt-core/infrastructure/redis/constants/cache-ttl.constant';

/**
 * Get TTL for a cache prefix (in seconds)
 *
 * @param prefix - Cache key prefix
 * @param fallback - Fallback TTL if not configured (default: 5 min)
 * @returns TTL in seconds
 *
 * @example
 * const ttl = getTTL(LICENSE_CACHE_PREFIX.DATA); // 1800
 * const ttlMs = getTTL(LICENSE_CACHE_PREFIX.DATA) * 1000; // 1800000
 */
export const getTTL = (prefix: string, fallback = CACHE_TTL.SHORT): number => {
  return MKT_CACHE_TTL_CONFIG[prefix] ?? fallback;
};

/**
 * Get TTL in milliseconds
 *
 * @param prefix - Cache key prefix
 * @param fallback - Fallback TTL in seconds (default: 5 min)
 * @returns TTL in milliseconds
 */
export const getTTLMs = (
  prefix: string,
  fallback = CACHE_TTL.SHORT,
): number => {
  return getTTL(prefix, fallback) * 1000;
};
