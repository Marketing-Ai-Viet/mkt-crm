// ============================================
// REDIS INFRASTRUCTURE CONSTANTS
// ============================================

export const REDIS_LOG_CONTEXT = 'MktRedisInfrastructure';

// ============================================
// CIRCUIT BREAKER DEFAULTS
// ============================================

export const CIRCUIT_BREAKER_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
} as const;

export type CircuitBreakerStateType =
  (typeof CIRCUIT_BREAKER_STATE)[keyof typeof CIRCUIT_BREAKER_STATE];

export const REDIS_CIRCUIT_BREAKER_DEFAULTS = {
  ENABLED: true,
  FAILURE_THRESHOLD: 5,
  RESET_TIMEOUT_MS: 30_000,
  HALF_OPEN_ATTEMPTS: 3,
  KEY_PREFIX: 'circuit-breaker:',
  STATE_TTL_SECONDS: 300, // 5 minutes
} as const;

// ============================================
// RATE LIMITER DEFAULTS
// ============================================

export const REDIS_RATE_LIMITER_DEFAULTS = {
  ENABLED: true,
  MAX_ATTEMPTS: 100,
  WINDOW_MS: 60_000, // 1 minute
  KEY_PREFIX: 'rate-limit:',
} as const;

// ============================================
// CACHE DEFAULTS
// ============================================

export const REDIS_CACHE_DEFAULTS = {
  LRU_MAX: 100,
  LRU_TTL_MS: 60_000, // 1 minute
  REDIS_TTL_SECONDS: 3600, // 1 hour
  KEY_PREFIX: 'cache:',
} as const;

// ============================================
// HEALTH CHECK DEFAULTS
// ============================================

export const REDIS_HEALTH_DEFAULTS = {
  ENABLED: true,
  INTERVAL_MS: 30_000, // 30 seconds
  TIMEOUT_MS: 5_000, // 5 seconds
  UNHEALTHY_THRESHOLD: 3,
  MIN_INTERVAL_MS: 5_000, // 5 seconds minimum
  MAX_TIMEOUT_MS: 30_000, // 30 seconds maximum
} as const;

// ============================================
// LOCK DEFAULTS
// ============================================

export const REDIS_LOCK_DEFAULTS = {
  TTL_MS: 30_000, // 30 seconds
  RETRY_DELAY_MS: 100,
  MAX_RETRIES: 10,
  KEY_PREFIX: 'lock:',
} as const;
