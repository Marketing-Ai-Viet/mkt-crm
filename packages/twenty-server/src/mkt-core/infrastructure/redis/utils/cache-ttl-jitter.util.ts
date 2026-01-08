import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * TTL Jitter Utilities
 *
 * Prevents "thundering herd" problem by adding randomness to TTL values.
 * When many cache entries expire at the same time, they all try to refresh
 * simultaneously, causing a spike in database load.
 *
 * Solution: Add jitter (random variation) to TTL so entries expire at different times.
 *
 * @example
 * // Base TTL: 1800 seconds (30 min)
 * // With 10% jitter: 1620-1980 seconds (27-33 min)
 * const ttl = withJitter(1800, 0.1);
 */

/**
 * Default jitter percentage (10%)
 */
const DEFAULT_JITTER_PERCENT = 0.1;

/**
 * Maximum jitter percentage allowed (50%)
 */
const MAX_JITTER_PERCENT = 0.5;

/**
 * Minimum TTL value (1 second)
 */
const MIN_TTL = 1;

/**
 * Add jitter to a TTL value
 *
 * @param baseTtl - Base TTL in seconds
 * @param jitterPercent - Jitter percentage (0-0.5, default: 0.1)
 * @returns TTL with random jitter applied
 *
 * @example
 * withJitter(1800);       // 1620-1980 (10% jitter)
 * withJitter(1800, 0.2);  // 1440-2160 (20% jitter)
 * withJitter(60, 0.1);    // 54-66 (10% jitter)
 */
export const withJitter = (
  baseTtl: number,
  jitterPercent = DEFAULT_JITTER_PERCENT,
): number => {
  if (baseTtl <= 0) {
    return MIN_TTL;
  }

  // Clamp jitter percent to valid range
  const clampedJitter = Math.min(
    Math.max(0, jitterPercent),
    MAX_JITTER_PERCENT,
  );

  // Calculate jitter range
  const jitterRange = baseTtl * clampedJitter;

  // Generate random offset between -jitterRange and +jitterRange
  const offset = (Math.random() * 2 - 1) * jitterRange;

  // Apply jitter and ensure minimum TTL
  return Math.max(MIN_TTL, Math.round(baseTtl + offset));
};

/**
 * Add jitter to TTL in milliseconds
 *
 * @param baseTtlMs - Base TTL in milliseconds
 * @param jitterPercent - Jitter percentage (0-0.5, default: 0.1)
 * @returns TTL in milliseconds with jitter applied
 */
export const withJitterMs = (
  baseTtlMs: number,
  jitterPercent = DEFAULT_JITTER_PERCENT,
): number => {
  return withJitter(baseTtlMs / 1000, jitterPercent) * 1000;
};

/**
 * TTL jitter configuration options
 */
export type JitterOptions = {
  /** Enable/disable jitter (default: true) */
  enabled?: boolean;
  /** Jitter percentage (0-0.5, default: 0.1) */
  percent?: number;
};

/**
 * Apply jitter based on configuration
 *
 * @param baseTtl - Base TTL in seconds
 * @param options - Jitter options
 * @returns TTL with optional jitter applied
 *
 * @example
 * applyJitter(1800, { enabled: true, percent: 0.15 });  // With 15% jitter
 * applyJitter(1800, { enabled: false });                // No jitter, returns 1800
 */
export const applyJitter = (
  baseTtl: number,
  options?: JitterOptions,
): number => {
  const enabled = options?.enabled ?? true;
  const percent = options?.percent ?? DEFAULT_JITTER_PERCENT;

  return enabled ? withJitter(baseTtl, percent) : baseTtl;
};

/**
 * Create a jitter function with preset configuration
 *
 * @param options - Default jitter options
 * @returns Configured jitter function
 *
 * @example
 * const jitter = createJitterFn({ percent: 0.15 });
 * const ttl1 = jitter(1800);  // Uses 15% jitter
 * const ttl2 = jitter(600);   // Uses 15% jitter
 */
export const createJitterFn = (
  options?: JitterOptions,
): ((baseTtl: number) => number) => {
  return (baseTtl: number) => applyJitter(baseTtl, options);
};

/**
 * Stagger expiration times for batch operations
 *
 * When setting multiple cache entries, stagger their TTLs to prevent
 * simultaneous expiration.
 *
 * @param baseTtl - Base TTL in seconds
 * @param index - Item index in batch
 * @param totalItems - Total items in batch
 * @param spreadPercent - How much to spread TTLs (default: 0.2 = 20%)
 * @returns Staggered TTL
 *
 * @example
 * // Setting 10 items with base TTL 1800
 * for (let i = 0; i < 10; i++) {
 *   const ttl = staggerTtl(1800, i, 10);
 *   // TTLs will be: 1800, 1836, 1872, 1908, ... 2124
 * }
 */
export const staggerTtl = (
  baseTtl: number,
  index: number,
  totalItems: number,
  spreadPercent = 0.2,
): number => {
  if (totalItems <= 1) {
    return baseTtl;
  }

  const spreadRange = baseTtl * spreadPercent;
  const step = spreadRange / (totalItems - 1);
  const offset = step * index;

  return Math.round(baseTtl + offset);
};

/**
 * Calculate adaptive TTL based on data freshness requirements
 *
 * @param baseTtl - Base TTL in seconds
 * @param lastModified - When data was last modified
 * @param now - Current timestamp (default: current time)
 * @returns Adjusted TTL based on data age
 *
 * @example
 * // Data modified 5 minutes ago - use shorter TTL
 * const ttl = adaptiveTtl(1800, DateTimeUtils.toMillis(DateTimeUtils.now()) - 5 * 60 * 1000);
 *
 * // Data modified 1 hour ago - use longer TTL (more stable)
 * const ttl = adaptiveTtl(1800, DateTimeUtils.toMillis(DateTimeUtils.now()) - 60 * 60 * 1000);
 */
export const adaptiveTtl = (
  baseTtl: number,
  lastModified: number,
  now?: number,
): number => {
  const currentTime = now ?? DateTimeUtils.toMillis(DateTimeUtils.now());
  const ageMs = currentTime - lastModified;
  const ageSeconds = ageMs / 1000;
  const fiveMinutes = 5 * 60;
  const thirtyMinutes = 30 * 60;
  const oneHour = 60 * 60;

  // If data is very fresh (modified in last 5 min), use shorter TTL
  if (ageSeconds < fiveMinutes) {
    return Math.round(baseTtl * 0.5); // 50% of base TTL
  }

  // If data is moderately fresh (5-30 min), use base TTL
  if (ageSeconds < thirtyMinutes) {
    return baseTtl;
  }

  // If data is older (30+ min), use longer TTL (data is stable)
  if (ageSeconds < oneHour) {
    return Math.round(baseTtl * 1.5); // 150% of base TTL
  }

  // Very old data - use double TTL
  return Math.round(baseTtl * 2);
};
