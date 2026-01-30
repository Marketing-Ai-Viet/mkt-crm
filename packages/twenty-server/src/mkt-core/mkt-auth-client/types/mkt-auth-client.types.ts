import {
  CircuitBreakerState,
  TokenInvalidationReason,
} from 'src/mkt-core/mkt-auth-client/constants/mkt-auth-client.constant';

// ============================================
// CREDENTIALS & AUTHENTICATION
// ============================================

/**
 * Credentials for MKT Server authentication
 * Used for signInByEmail endpoint (Better Auth)
 */
export type MktAuthCredentials = {
  /** User email for authentication */
  email: string;

  /** User password */
  password: string;
};

/**
 * Response from MKT Server signInByEmail endpoint
 * Note: Better Auth only returns access token, no refresh token
 */
export type MktAuthTokenResponse = {
  /** Bearer access token */
  token: string;

  /** Token expiration info (if provided by server) */
  expiresIn?: number;

  /** User information (if provided by server) */
  user?: {
    id: string;
    email: string;
    name?: string;
  };
};

/**
 * Cached token data with metadata
 */
export type MktAuthTokenData = {
  /** The Bearer access token (from set-auth-token header) */
  accessToken: string;

  /** API key for Api-Key header (from response.data.token) */
  apiKey: string;

  /** ISO timestamp when token was acquired */
  acquiredAt: string;

  /** ISO timestamp when token expires (calculated from serverTtlMs) */
  expiresAt: string;

  /** ISO timestamp when proactive refresh should happen */
  refreshAt: string;

  /** User email associated with this token */
  userEmail?: string;

  /** Token acquisition source */
  source: 'bootstrap' | 'refresh' | 'relogin';
};

// ============================================
// EVENT PAYLOADS
// ============================================

/**
 * Payload for TOKEN_ACQUIRED and TOKEN_REFRESHED events
 */
export type MktAuthTokenAcquiredEvent = {
  /** User email (if available) */
  userEmail?: string;

  /** Token acquisition source */
  source: 'bootstrap' | 'refresh' | 'relogin';

  /** ISO timestamp when token expires */
  expiresAt: string;

  /** ISO timestamp of the event */
  timestamp: string;
};

/**
 * Payload for TOKEN_INVALIDATED event
 */
export type MktAuthTokenInvalidatedEvent = {
  /** Reason for invalidation */
  reason: TokenInvalidationReason;

  /** Previous user email (if known) */
  previousUserEmail?: string;

  /** ISO timestamp of the event */
  timestamp: string;
};

/**
 * Payload for AUTH_FAILED event
 */
export type MktAuthFailedEvent = {
  /** Reason for failure */
  reason: string;

  /** Attempt number (for retries) */
  attemptNumber: number;

  /** Whether another retry will be attempted */
  willRetry: boolean;

  /** HTTP status code (if applicable) */
  statusCode?: number;

  /** ISO timestamp of the event */
  timestamp: string;
};

/**
 * Payload for CIRCUIT_STATE_CHANGED event
 */
export type MktAuthCircuitStateChangedEvent = {
  /** Previous circuit state */
  previousState: CircuitBreakerState;

  /** New circuit state */
  newState: CircuitBreakerState;

  /** Consecutive failure count */
  consecutiveFailures: number;

  /** ISO timestamp of the event */
  timestamp: string;
};

/**
 * Payload for RELOGIN_TRIGGERED event
 */
export type MktAuthReloginTriggeredEvent = {
  /** Reason for re-login (usually 401 response) */
  reason: string;

  /** Original request URL that triggered re-login */
  originalRequestUrl?: string;

  /** ISO timestamp of the event */
  timestamp: string;
};

/**
 * Payload for RELOGIN_SUCCESS event
 */
export type MktAuthReloginSuccessEvent = {
  /** User email */
  userEmail?: string;

  /** ISO timestamp when new token expires */
  expiresAt: string;

  /** ISO timestamp of the event */
  timestamp: string;
};

/**
 * Payload for RELOGIN_FAILED event
 */
export type MktAuthReloginFailedEvent = {
  /** Reason for failure */
  reason: string;

  /** HTTP status code (if applicable) */
  statusCode?: number;

  /** ISO timestamp of the event */
  timestamp: string;
};

// ============================================
// SERVICE INTERFACES
// ============================================

/**
 * Token provider interface
 * Used by HTTP client to get Bearer token
 */
export type MktAuthTokenProvider = {
  /** Get valid access token (may trigger refresh if needed) */
  getAccessToken(): Promise<string>;

  /** Check if token is currently valid */
  isTokenValid(): boolean;

  /** Force refresh token */
  refreshToken(): Promise<void>;

  /** Invalidate current token */
  invalidateToken(reason: TokenInvalidationReason): void;
};

/**
 * Cache service interface
 */
export type MktAuthCacheProvider = {
  /** Get token from cache (local or Redis) */
  getToken(): Promise<MktAuthTokenData | null>;

  /** Set token in cache (both local and Redis) */
  setToken(tokenData: MktAuthTokenData): Promise<void>;

  /** Clear token from all caches */
  clearToken(): Promise<void>;

  /** Check if token exists in local cache */
  hasLocalToken(): boolean;
};

/**
 * Lock service interface
 */
export type MktAuthLockProvider = {
  /** Execute operation with distributed lock */
  withLock<T>(
    resource: string,
    operation: () => Promise<T>,
    options?: { timeoutMs?: number; maxWaitMs?: number },
  ): Promise<T>;

  /** Try to execute operation with lock (returns null if lock not acquired) */
  tryWithLock<T>(
    resource: string,
    operation: () => Promise<T>,
    options?: { timeoutMs?: number },
  ): Promise<T | null>;
};

// ============================================
// HTTP CLIENT TYPES
// ============================================

/**
 * HTTP request configuration
 */
export type MktAuthHttpRequestConfig = {
  /** Request URL (relative to base URL) */
  url: string;

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /** Request body (for POST/PUT/PATCH) */
  data?: unknown;

  /** Query parameters */
  params?: Record<string, string | number | boolean>;

  /** Additional headers */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Skip authentication (for login endpoint) */
  skipAuth?: boolean;
};

/**
 * HTTP response wrapper
 */
export type MktAuthHttpResponse<T = unknown> = {
  /** Response data */
  data: T;

  /** HTTP status code */
  status: number;

  /** Response headers */
  headers: Record<string, string>;
};

/**
 * HTTP error details
 */
export type MktAuthHttpError = {
  /** Error message */
  message: string;

  /** HTTP status code */
  statusCode?: number;

  /** Error code from server */
  errorCode?: string;

  /** Original error */
  cause?: Error;

  /** Whether this error is retryable */
  isRetryable: boolean;
};

// ============================================
// CONFIGURATION TYPES (derived from Zod schemas)
// ============================================

/**
 * Token configuration
 */
export type MktAuthTokenConfig = {
  /** Server-side token TTL in milliseconds */
  serverTtlMs: number;

  /** Buffer time before expiry to trigger refresh */
  bufferMs: number;

  /** Safety margin before expiry to treat as expired */
  safetyMarginMs: number;
};

// ============================================
// TOKEN VALIDITY TYPES
// ============================================

/**
 * Token validity status constants
 */
export const TOKEN_VALIDITY_STATUS = {
  /** Token is valid and can be used normally */
  VALID: 'VALID',

  /** Token is expiring soon, should refresh but can still use */
  EXPIRING_SOON: 'EXPIRING_SOON',

  /** Token is nearly expired (within safety margin), must refresh */
  NEARLY_EXPIRED: 'NEARLY_EXPIRED',

  /** Token has expired */
  EXPIRED: 'EXPIRED',
} as const;

export type TokenValidityStatus =
  (typeof TOKEN_VALIDITY_STATUS)[keyof typeof TOKEN_VALIDITY_STATUS];

/**
 * Result of token validity check
 */
export type TokenValidityResult = {
  /** Current validity status */
  status: TokenValidityStatus;

  /** Milliseconds remaining until expiry */
  remainingMs: number;

  /** Whether token should be refreshed */
  shouldRefresh: boolean;

  /** Whether token can still be used for requests */
  canUse: boolean;
};

/**
 * Cache configuration
 */
export type MktAuthCacheConfig = {
  /** Local in-memory cache TTL in milliseconds */
  localTtlMs: number;
};

/**
 * Retry configuration
 */
export type MktAuthRetryConfig = {
  /** Maximum retry attempts */
  maxAttempts: number;

  /** Initial delay between retries in milliseconds */
  initialDelayMs: number;

  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;

  /** Exponential backoff multiplier */
  backoffMultiplier: number;

  /** HTTP status codes that should trigger retry */
  retryableStatusCodes: number[];
};

/**
 * Jitter configuration
 */
export type MktAuthJitterConfig = {
  /** Enable jitter */
  enabled: boolean;

  /** Minimum jitter in milliseconds */
  minMs: number;

  /** Maximum jitter in milliseconds */
  maxMs: number;
};

/**
 * Circuit breaker configuration
 */
export type MktAuthCircuitBreakerConfig = {
  /** Enable circuit breaker */
  enabled: boolean;

  /** Failure threshold to open circuit */
  failureThreshold: number;

  /** Time in milliseconds to keep circuit open */
  resetTimeoutMs: number;

  /** Maximum attempts in half-open state */
  halfOpenMaxAttempts: number;
};

/**
 * Lock configuration
 */
export type MktAuthLockConfig = {
  /** Lock timeout in milliseconds */
  timeoutMs: number;

  /** Maximum wait time for lock acquisition */
  maxWaitMs: number;

  /** Retry interval when waiting for lock */
  retryIntervalMs: number;
};

/**
 * Complete MKT Auth Client configuration
 */
export type MktAuthClientConfig = {
  /** MKT Server base URL */
  baseUrl: string;

  /** Authentication credentials */
  credentials: MktAuthCredentials;

  /** Token configuration */
  token: MktAuthTokenConfig;

  /** Cache configuration */
  cache: MktAuthCacheConfig;

  /** Retry configuration */
  retry: MktAuthRetryConfig;

  /** Jitter configuration */
  jitter: MktAuthJitterConfig;

  /** Circuit breaker configuration */
  circuitBreaker: MktAuthCircuitBreakerConfig;

  /** Lock configuration */
  lock: MktAuthLockConfig;
};

// ============================================
// INTERNAL STATE TYPES
// ============================================

/**
 * Internal state for circuit breaker
 */
export type CircuitBreakerInternalState = {
  /** Current circuit state */
  state: CircuitBreakerState;

  /** Consecutive failure count */
  consecutiveFailures: number;

  /** Timestamp when circuit was opened */
  openedAt?: string;

  /** Number of attempts in half-open state */
  halfOpenAttempts: number;
};

/**
 * Local cache entry with metadata
 */
export type LocalCacheEntry<T> = {
  /** Cached value */
  value: T;

  /** Timestamp when entry was created */
  createdAt: number;

  /** Timestamp when entry expires */
  expiresAt: number;
};

// ============================================
// SERVICE INTERNAL TYPES
// ============================================

/**
 * Circuit state alias for internal use
 */
export type CircuitState = CircuitBreakerState;

/**
 * Cache metrics for monitoring
 */
export type CacheMetrics = {
  /** Number of local cache hits */
  localHits: number;

  /** Number of Redis cache hits */
  redisHits: number;

  /** Number of cache misses */
  misses: number;
};

/**
 * HTTP method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request options for HTTP client
 */
export type RequestOptions = {
  /** Query parameters */
  params?: Record<string, unknown>;

  /** Request timeout in milliseconds (overrides default) */
  timeout?: number;

  /** Skip authentication (for login endpoint) */
  skipAuth?: boolean;

  /** Additional headers */
  headers?: Record<string, string>;
};

/**
 * API response wrapper from MKT Server
 */
export type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
} & T;

/**
 * Retry context for tracking request retry state
 */
export type RetryContext = {
  /** Current attempt number (0-based) */
  attempt: number;

  /** Whether re-authentication has been attempted after 401 */
  hasReauthenticated: boolean;
};
