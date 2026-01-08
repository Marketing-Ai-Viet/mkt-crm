import { DateTime } from 'luxon';

import { CircuitBreakerStateType } from 'src/mkt-core/infrastructure/redis/constants';

// ============================================
// CIRCUIT BREAKER TYPES
// ============================================

export type CircuitBreakerConfig = {
  enabled?: boolean;
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenAttempts?: number;
  keyPrefix?: string;
  stateTtlSeconds?: number;
};

export type CircuitBreakerStatus = {
  state: CircuitBreakerStateType;
  failureCount: number;
  successCount: number;
  lastFailureTime?: DateTime;
  nextRetryTime?: DateTime;
};

export class CircuitBreakerOpenException extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitBreakerOpenException';
  }
}

// ============================================
// RATE LIMITER TYPES
// ============================================

export type RateLimiterConfig = {
  enabled?: boolean;
  maxAttempts?: number;
  windowMs?: number;
  keyPrefix?: string;
};

export type RateLimitStatus = {
  enabled: boolean;
  currentAttempts: number;
  maxAttempts: number;
  windowMs: number;
  isLimited: boolean;
  retryAfterMs?: number;
};

export class RateLimitException extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limit exceeded. Retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitException';
    this.retryAfterMs = retryAfterMs;
  }
}

// ============================================
// CACHE TYPES
// ============================================

export type CacheConfig = {
  lruMax?: number;
  lruTtlMs?: number;
  redisTtlSeconds?: number;
  keyPrefix?: string;
};

export type CacheStats = {
  lru: {
    size: number;
    maxSize: number;
  };
  redis: {
    connected: boolean;
    lastErrorAt?: Date;
    lastHealthCheckAt?: Date;
    latencyMs?: number;
    fallbackCount: number;
    consecutiveFailures: number;
  };
};

// ============================================
// HEALTH CHECK TYPES
// ============================================

export type HealthCheckConfig = {
  enabled?: boolean;
  intervalMs?: number;
  timeoutMs?: number;
  unhealthyThreshold?: number;
};

export type RedisHealthStatus = {
  connected: boolean;
  lastErrorAt?: Date;
  lastHealthCheckAt?: Date;
  latencyMs?: number;
  consecutiveFailures: number;
};

// ============================================
// LOCK TYPES
// ============================================

export type LockConfig = {
  ttlMs?: number;
  retryDelayMs?: number;
  maxRetries?: number;
  keyPrefix?: string;
};

export type LockResult = {
  acquired: boolean;
  lockKey: string;
  ttlMs: number;
};

export class LockAcquisitionException extends Error {
  constructor(lockKey: string) {
    super(`Failed to acquire lock: ${lockKey}`);
    this.name = 'LockAcquisitionException';
  }
}

// ============================================
// CACHE INSTANCE TYPE
// ============================================

export type CacheInstance<T> = {
  get: (key: string) => Promise<T | undefined>;
  set: (key: string, value: T, ttlMs?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clearByPattern: (pattern: string) => Promise<void>;
};
