// Re-export types from infrastructure for backward compatibility
import {
  CircuitBreakerStatus,
  RateLimitStatus,
  RedisHealthStatus,
  CacheStats,
} from 'src/mkt-core/infrastructure/redis';
import {
  CircuitBreakerStateType,
  CIRCUIT_BREAKER_STATE,
} from 'src/mkt-core/oauth2-client/constants';

// Re-export infrastructure types
export type { CircuitBreakerStatus, RateLimitStatus, RedisHealthStatus };

// Re-export CIRCUIT_BREAKER_STATE for type guard usage
export { CIRCUIT_BREAKER_STATE };

// Use CacheStats as OAuth2CacheStats for backward compatibility
export type OAuth2CacheStats = CacheStats;

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
