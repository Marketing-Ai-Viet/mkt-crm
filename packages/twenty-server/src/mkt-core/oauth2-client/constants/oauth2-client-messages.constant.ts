export const OAUTH2_SUCCESS_MESSAGES = {
  TOKEN_ACQUIRED: (expiresIn: number, scopes: string[]) =>
    `Token acquired successfully. Expires in ${expiresIn}s. Scopes: ${scopes.join(', ')}`,
  TOKEN_REFRESHED: () => 'Token refreshed successfully',
  TOKEN_INVALIDATED: () => 'Token invalidated successfully',
  CACHE_HIT_LRU: () => 'Token retrieved from LRU cache',
  CACHE_HIT_REDIS: () => 'Token retrieved from Redis cache',
  HEALTH_CHECK_PASSED: () => 'OAuth2 client health check passed',
} as const;

export const OAUTH2_GRAPHQL_DESCRIPTIONS = {
  HEALTH_CHECK_QUERY: 'Get OAuth2 client health status',
  TOKEN_STATUS_QUERY: 'Get current OAuth2 token metadata',
  REFRESH_TOKEN_MUTATION: 'Refresh OAuth2 token',
  INVALIDATE_TOKEN_MUTATION: 'Invalidate current OAuth2 token',
} as const;

export const OAUTH2_ERROR_MESSAGES = {
  TOKEN_FETCH_FAILED: (reason: string) =>
    `Failed to fetch OAuth2 token: ${reason}`,
  TOKEN_REFRESH_FAILED: (reason: string) =>
    `Failed to refresh OAuth2 token: ${reason}`,
  INVALID_CREDENTIALS: () => 'Invalid client credentials',
  INVALID_SCOPE: (scopes: string) => `Invalid scope requested: ${scopes}`,
  RATE_LIMIT_EXCEEDED: (retryAfter: number) =>
    `Rate limit exceeded. Retry after ${retryAfter}ms`,
  CIRCUIT_BREAKER_OPEN: () => 'Circuit breaker is OPEN. Service unavailable.',
  REDIS_UNAVAILABLE: () =>
    'Redis unavailable, falling back to LRU-only caching',
  LOCK_ACQUISITION_FAILED: () => 'Failed to acquire distributed lock',
  TOKEN_EXPIRED: () => 'Token has expired',
  TOKEN_VALIDATION_FAILED: (reason: string) =>
    `Token validation failed: ${reason}`,
  CONFIG_VALIDATION_FAILED: (reason: string) =>
    `Configuration validation failed: ${reason}`,
} as const;

export const OAUTH2_LOG_CONTEXT = 'OAuth2Client' as const;
