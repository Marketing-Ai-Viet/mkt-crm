import { DateTime } from 'luxon';

import {
  CircuitBreakerStateType,
  CIRCUIT_BREAKER_STATE,
} from 'src/mkt-core/oauth2-client/constants';

// Re-export CIRCUIT_BREAKER_STATE for type guard usage
export { CIRCUIT_BREAKER_STATE };

// Health Status Constants
export const OAUTH2_HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
} as const;

export type OAuth2HealthStatusType =
  (typeof OAUTH2_HEALTH_STATUS)[keyof typeof OAUTH2_HEALTH_STATUS];

// Type Guards
export const isOAuth2HealthStatus = (
  value: string,
): value is OAuth2HealthStatusType =>
  Object.values(OAUTH2_HEALTH_STATUS).includes(value as OAuth2HealthStatusType);

export const isCircuitBreakerState = (
  value: string,
): value is CircuitBreakerStateType =>
  Object.values(CIRCUIT_BREAKER_STATE).includes(
    value as CircuitBreakerStateType,
  );

// Circuit Breaker Types
export type CircuitBreakerStatus = {
  state: CircuitBreakerStateType;
  failureCount: number;
  successCount: number;
  lastFailureTime?: DateTime;
  nextRetryTime?: DateTime;
};

// Rate Limiter Types
export type RateLimitStatus = {
  enabled: boolean;
  currentAttempts: number;
  maxAttempts: number;
  windowMs: number;
  isLimited: boolean;
  retryAfterMs?: number;
};

// Redis Health Status Types
export type RedisHealthStatus = {
  connected: boolean;
  lastErrorAt?: Date;
  lastHealthCheckAt?: Date;
  latencyMs?: number;
  fallbackCount: number;
  consecutiveFailures: number;
};

// Cache Types
export type OAuth2CacheStats = {
  lru: {
    size: number;
    maxSize: number;
  };
  redis: RedisHealthStatus;
};

// HTTP Service Types
export type UserContext = {
  userId?: string;
  userName?: string;
};

// Health Check Types
export type OAuth2HealthCheckResult = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  token: {
    valid: boolean;
    expiresIn?: number;
    scopes?: string[];
  };
  cache: OAuth2CacheStats;
  circuitBreaker: CircuitBreakerStatus;
  rateLimit: RateLimitStatus;
};
