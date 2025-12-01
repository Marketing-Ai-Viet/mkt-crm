export type OAuth2ClientConfig = {
  serverUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  tokenEndpoint: string;
  introspectEndpoint: string;
  revokeEndpoint: string;
  cache: OAuth2CacheConfig;
  refresh: OAuth2RefreshConfig;
  http: OAuth2HttpConfig;
  rateLimit: OAuth2RateLimitConfig;
  circuitBreaker: OAuth2CircuitBreakerConfig;
  jwt: OAuth2JwtConfig;
  redisHealth: OAuth2RedisHealthConfig;
};

export type OAuth2CacheConfig = {
  lruMax: number;
  lruTtlMs: number;
  redisTtlSeconds: number;
};

export type OAuth2RefreshConfig = {
  thresholdSeconds: number;
  intervalMs: number;
};

export type OAuth2HttpConfig = {
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
};

export type OAuth2RateLimitConfig = {
  enabled: boolean;
  maxAttempts: number;
  windowMs: number;
};

export type OAuth2CircuitBreakerConfig = {
  enabled: boolean;
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenAttempts: number;
};

export type OAuth2JwtConfig = {
  verificationEnabled: boolean;
  algorithm: string;
  publicKeyUrl?: string;
  publicKey?: string;
  issuer?: string;
  audience?: string;
};

export type OAuth2RedisHealthConfig = {
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
  unhealthyThreshold: number;
};
