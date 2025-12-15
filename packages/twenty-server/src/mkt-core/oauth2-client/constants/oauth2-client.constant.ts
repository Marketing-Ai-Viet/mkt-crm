export const OAUTH2_CLIENT_DEFAULTS = {
  SERVER_URL: 'http://localhost:3006',
  TOKEN_ENDPOINT: '/oauth/token',
  INTROSPECT_ENDPOINT: '/oauth/introspect',
  REVOKE_ENDPOINT: '/oauth/revoke',
  SCOPES: '',
} as const;

export const OAUTH2_CACHE_DEFAULTS = {
  LRU_MAX: 10,
  LRU_TTL_MS: 3600000,
  REDIS_TTL_SECONDS: 3600,
} as const;

export const OAUTH2_REFRESH_DEFAULTS = {
  THRESHOLD_SECONDS: 300,
  INTERVAL_MS: 30000,
} as const;

export const OAUTH2_HTTP_DEFAULTS = {
  TIMEOUT_MS: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

export const OAUTH2_RATE_LIMIT_DEFAULTS = {
  ENABLED: true,
  MAX_ATTEMPTS: 10,
  WINDOW_MS: 60000,
} as const;

export const OAUTH2_CIRCUIT_BREAKER_DEFAULTS = {
  ENABLED: true,
  FAILURE_THRESHOLD: 5,
  RESET_TIMEOUT_MS: 60000,
  HALF_OPEN_ATTEMPTS: 3,
} as const;

export const OAUTH2_JWT_DEFAULTS = {
  VERIFICATION_ENABLED: false,
  ALGORITHM: 'RS256',
} as const;

export const OAUTH2_LOCK_OPTIONS = {
  MS: 100,
  MAX_RETRIES: 10,
  TTL: 5000,
} as const;

export const OAUTH2_REDIS_HEALTH_DEFAULTS = {
  ENABLED: true,
  INTERVAL_MS: 30000,
  TIMEOUT_MS: 5000,
  UNHEALTHY_THRESHOLD: 3,
  MIN_INTERVAL_MS: 1000,
  MAX_TIMEOUT_MS: 10000,
} as const;

export const CIRCUIT_BREAKER_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
} as const;

export type CircuitBreakerStateType =
  (typeof CIRCUIT_BREAKER_STATE)[keyof typeof CIRCUIT_BREAKER_STATE];
