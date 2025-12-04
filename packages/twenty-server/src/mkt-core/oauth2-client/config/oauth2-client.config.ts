import { registerAs } from '@nestjs/config';

import {
  OAUTH2_CACHE_DEFAULTS,
  OAUTH2_CIRCUIT_BREAKER_DEFAULTS,
  OAUTH2_CLIENT_DEFAULTS,
  OAUTH2_HTTP_DEFAULTS,
  OAUTH2_JWT_DEFAULTS,
  OAUTH2_RATE_LIMIT_DEFAULTS,
  OAUTH2_REDIS_HEALTH_DEFAULTS,
  OAUTH2_REFRESH_DEFAULTS,
} from 'src/mkt-core/oauth2-client/constants';
import {
  OAuth2CacheConfig,
  OAuth2CircuitBreakerConfig,
  OAuth2ClientConfig,
  OAuth2HttpConfig,
  OAuth2JwtConfig,
  OAuth2RateLimitConfig,
  OAuth2RedisHealthConfig,
  OAuth2RefreshConfig,
} from 'src/mkt-core/oauth2-client/types';

const getEnvString = (key: string, defaultValue: string): string =>
  process.env[key] ?? defaultValue;

const getEnvNumber = (key: string, defaultValue: number): number =>
  Number(process.env[key]) || defaultValue;

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

const buildCacheConfig = (): OAuth2CacheConfig => ({
  lruMax: getEnvNumber('OAUTH2_CACHE_LRU_MAX', OAUTH2_CACHE_DEFAULTS.LRU_MAX),
  lruTtlMs: getEnvNumber(
    'OAUTH2_CACHE_LRU_TTL_MS',
    OAUTH2_CACHE_DEFAULTS.LRU_TTL_MS,
  ),
  redisTtlSeconds: getEnvNumber(
    'OAUTH2_CACHE_REDIS_TTL_SECONDS',
    OAUTH2_CACHE_DEFAULTS.REDIS_TTL_SECONDS,
  ),
});

const buildRefreshConfig = (): OAuth2RefreshConfig => ({
  thresholdSeconds: getEnvNumber(
    'OAUTH2_REFRESH_THRESHOLD_SECONDS',
    OAUTH2_REFRESH_DEFAULTS.THRESHOLD_SECONDS,
  ),
  intervalMs: getEnvNumber(
    'OAUTH2_REFRESH_INTERVAL_MS',
    OAUTH2_REFRESH_DEFAULTS.INTERVAL_MS,
  ),
});

const buildHttpConfig = (): OAuth2HttpConfig => ({
  timeoutMs: getEnvNumber(
    'OAUTH2_HTTP_TIMEOUT_MS',
    OAUTH2_HTTP_DEFAULTS.TIMEOUT_MS,
  ),
  maxRetries: getEnvNumber(
    'OAUTH2_HTTP_MAX_RETRIES',
    OAUTH2_HTTP_DEFAULTS.MAX_RETRIES,
  ),
  retryDelayMs: getEnvNumber(
    'OAUTH2_HTTP_RETRY_DELAY_MS',
    OAUTH2_HTTP_DEFAULTS.RETRY_DELAY_MS,
  ),
});

const buildRateLimitConfig = (): OAuth2RateLimitConfig => ({
  enabled: getEnvBoolean(
    'OAUTH2_RATE_LIMIT_ENABLED',
    OAUTH2_RATE_LIMIT_DEFAULTS.ENABLED,
  ),
  maxAttempts: getEnvNumber(
    'OAUTH2_RATE_LIMIT_MAX_ATTEMPTS',
    OAUTH2_RATE_LIMIT_DEFAULTS.MAX_ATTEMPTS,
  ),
  windowMs: getEnvNumber(
    'OAUTH2_RATE_LIMIT_WINDOW_MS',
    OAUTH2_RATE_LIMIT_DEFAULTS.WINDOW_MS,
  ),
});

const buildCircuitBreakerConfig = (): OAuth2CircuitBreakerConfig => ({
  enabled: getEnvBoolean(
    'OAUTH2_CIRCUIT_BREAKER_ENABLED',
    OAUTH2_CIRCUIT_BREAKER_DEFAULTS.ENABLED,
  ),
  failureThreshold: getEnvNumber(
    'OAUTH2_CIRCUIT_BREAKER_FAILURE_THRESHOLD',
    OAUTH2_CIRCUIT_BREAKER_DEFAULTS.FAILURE_THRESHOLD,
  ),
  resetTimeoutMs: getEnvNumber(
    'OAUTH2_CIRCUIT_BREAKER_RESET_TIMEOUT_MS',
    OAUTH2_CIRCUIT_BREAKER_DEFAULTS.RESET_TIMEOUT_MS,
  ),
  halfOpenAttempts: getEnvNumber(
    'OAUTH2_CIRCUIT_BREAKER_HALF_OPEN_ATTEMPTS',
    OAUTH2_CIRCUIT_BREAKER_DEFAULTS.HALF_OPEN_ATTEMPTS,
  ),
});

const buildJwtConfig = (): OAuth2JwtConfig => ({
  verificationEnabled: getEnvBoolean(
    'OAUTH2_JWT_VERIFICATION_ENABLED',
    OAUTH2_JWT_DEFAULTS.VERIFICATION_ENABLED,
  ),
  algorithm: getEnvString(
    'OAUTH2_JWT_ALGORITHM',
    OAUTH2_JWT_DEFAULTS.ALGORITHM,
  ),
  publicKeyUrl: process.env.OAUTH2_JWT_PUBLIC_KEY_URL,
  publicKey: process.env.OAUTH2_JWT_PUBLIC_KEY,
  issuer: process.env.OAUTH2_JWT_ISSUER,
  audience: process.env.OAUTH2_JWT_AUDIENCE,
});

const buildRedisHealthConfig = (): OAuth2RedisHealthConfig => ({
  enabled: getEnvBoolean(
    'OAUTH2_REDIS_HEALTH_CHECK_ENABLED',
    OAUTH2_REDIS_HEALTH_DEFAULTS.ENABLED,
  ),
  intervalMs: getEnvNumber(
    'OAUTH2_REDIS_HEALTH_CHECK_INTERVAL_MS',
    OAUTH2_REDIS_HEALTH_DEFAULTS.INTERVAL_MS,
  ),
  timeoutMs: getEnvNumber(
    'OAUTH2_REDIS_HEALTH_CHECK_TIMEOUT_MS',
    OAUTH2_REDIS_HEALTH_DEFAULTS.TIMEOUT_MS,
  ),
  unhealthyThreshold: getEnvNumber(
    'OAUTH2_REDIS_HEALTH_CHECK_UNHEALTHY_THRESHOLD',
    OAUTH2_REDIS_HEALTH_DEFAULTS.UNHEALTHY_THRESHOLD,
  ),
});

export const oauth2ClientConfig = registerAs(
  'oauth2Client',
  (): OAuth2ClientConfig => ({
    serverUrl: getEnvString(
      'MKT_API_BASE_URL',
      OAUTH2_CLIENT_DEFAULTS.SERVER_URL,
    ),
    clientId: getEnvString('MKT_OAUTH_CLIENT_ID', ''),
    clientSecret: getEnvString('MKT_OAUTH_CLIENT_SECRET', ''),
    scopes: getEnvString('MKT_OAUTH_SCOPES', OAUTH2_CLIENT_DEFAULTS.SCOPES),
    tokenEndpoint: getEnvString(
      'OAUTH2_TOKEN_ENDPOINT',
      OAUTH2_CLIENT_DEFAULTS.TOKEN_ENDPOINT,
    ),
    introspectEndpoint: getEnvString(
      'OAUTH2_INTROSPECT_ENDPOINT',
      OAUTH2_CLIENT_DEFAULTS.INTROSPECT_ENDPOINT,
    ),
    revokeEndpoint: getEnvString(
      'OAUTH2_REVOKE_ENDPOINT',
      OAUTH2_CLIENT_DEFAULTS.REVOKE_ENDPOINT,
    ),
    cache: buildCacheConfig(),
    refresh: buildRefreshConfig(),
    http: buildHttpConfig(),
    rateLimit: buildRateLimitConfig(),
    circuitBreaker: buildCircuitBreakerConfig(),
    jwt: buildJwtConfig(),
    redisHealth: buildRedisHealthConfig(),
  }),
);
