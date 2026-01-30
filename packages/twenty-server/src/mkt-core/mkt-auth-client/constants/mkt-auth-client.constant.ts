/**
 * MKT Auth Client Constants
 *
 * Single source of truth for authentication client configuration.
 * Used for MKT Server Bearer authentication (Better Auth - no refresh token).
 */

// ============================================
// LOG CONTEXT
// ============================================

export const MKT_AUTH_LOG_CONTEXT = 'MktAuthClient';

// ============================================
// CACHE KEY PREFIXES
// ============================================

/**
 * Cache key prefixes for MKT Auth Client
 * Naming Convention: mkt:auth:{subtype}
 */
export const MKT_AUTH_CACHE_PREFIX = {
  /** Bearer token: mkt:auth:token */
  TOKEN: 'mkt:auth:token',

  /** Lock for token acquisition: mkt:auth:lock:token */
  LOCK_TOKEN: 'mkt:auth:lock:token',

  /** Lock for re-login: mkt:auth:lock:relogin */
  LOCK_RELOGIN: 'mkt:auth:lock:relogin',
} as const;

// ============================================
// EVENT NAMES
// ============================================

/**
 * Event names emitted by MKT Auth Client
 * Used with EventEmitter2 for cross-module communication
 */
export const MKT_AUTH_EVENTS = {
  /** Emitted when a new token is acquired */
  TOKEN_ACQUIRED: 'mkt-auth.token.acquired',

  /** Emitted when token is refreshed (proactive) */
  TOKEN_REFRESHED: 'mkt-auth.token.refreshed',

  /** Emitted when token is invalidated */
  TOKEN_INVALIDATED: 'mkt-auth.token.invalidated',

  /** Emitted when authentication fails */
  AUTH_FAILED: 'mkt-auth.auth.failed',

  /** Emitted when circuit breaker state changes */
  CIRCUIT_STATE_CHANGED: 'mkt-auth.circuit.state-changed',

  /** Emitted when re-login is triggered (after 401) */
  RELOGIN_TRIGGERED: 'mkt-auth.relogin.triggered',

  /** Emitted when re-login succeeds */
  RELOGIN_SUCCESS: 'mkt-auth.relogin.success',

  /** Emitted when re-login fails */
  RELOGIN_FAILED: 'mkt-auth.relogin.failed',
} as const;

export type MktAuthEvent =
  (typeof MKT_AUTH_EVENTS)[keyof typeof MKT_AUTH_EVENTS];

// ============================================
// CIRCUIT BREAKER STATES
// ============================================

export const CIRCUIT_BREAKER_STATES = {
  /** Normal operation - requests allowed */
  CLOSED: 'CLOSED',

  /** Failure threshold exceeded - requests blocked */
  OPEN: 'OPEN',

  /** Testing recovery - limited requests allowed */
  HALF_OPEN: 'HALF_OPEN',
} as const;

export type CircuitBreakerState =
  (typeof CIRCUIT_BREAKER_STATES)[keyof typeof CIRCUIT_BREAKER_STATES];

// ============================================
// TOKEN INVALIDATION REASONS
// ============================================

export const TOKEN_INVALIDATION_REASONS = {
  /** Manual invalidation by admin */
  MANUAL: 'manual',

  /** Token expired */
  EXPIRED: 'expired',

  /** Received 401 response from MKT Server */
  UNAUTHORIZED_RESPONSE: '401_response',

  /** Circuit breaker opened */
  CIRCUIT_BREAKER: 'circuit_breaker',
} as const;

export type TokenInvalidationReason =
  (typeof TOKEN_INVALIDATION_REASONS)[keyof typeof TOKEN_INVALIDATION_REASONS];

// ============================================
// DEFAULT VALUES
// ============================================

/**
 * Default configuration values
 * Can be overridden via environment variables
 */
export const MKT_AUTH_DEFAULTS = {
  // Token configuration
  TOKEN: {
    /** Server-side token TTL in milliseconds (from MKT Server) - 24 hours */
    SERVER_TTL_MS: 24 * 60 * 60 * 1000,

    /**
     * Buffer time before expiry to trigger proactive refresh - 1 hour
     *
     * Note: This creates a "double buffer" effect:
     * - Cache TTL = serverTtlMs - bufferMs = 23h
     * - Proactive refresh = cacheTtl - bufferMs = 22h
     * - Effective safety window = 2 hours
     *
     * This is intentional to provide extra safety for:
     * - Network latency and retry delays
     * - Clock drift between servers
     * - Multiple refresh failure recovery
     */
    BUFFER_MS: 60 * 60 * 1000,

    /**
     * Safety margin before token expiry - 5 seconds
     *
     * If token has less than this time remaining, treat as expired
     * and refresh immediately. Prevents race conditions where token
     * expires between check and actual HTTP request.
     */
    SAFETY_MARGIN_MS: 5 * 1000,
  },

  // Cache configuration
  CACHE: {
    /** Local in-memory cache TTL in milliseconds - 1 hour */
    LOCAL_TTL_MS: 60 * 60 * 1000,
  },

  // Retry configuration
  RETRY: {
    /** Maximum retry attempts */
    MAX_ATTEMPTS: 3,

    /** Initial delay between retries in milliseconds */
    INITIAL_DELAY_MS: 1000,

    /** Maximum delay between retries in milliseconds */
    MAX_DELAY_MS: 30000,

    /** Exponential backoff multiplier */
    BACKOFF_MULTIPLIER: 2,

    /** HTTP status codes that should trigger retry */
    RETRYABLE_STATUS_CODES: [429, 500, 502, 503, 504],
  },

  // Jitter configuration
  JITTER: {
    /** Enable jitter for token refresh timing */
    ENABLED: true,

    /** Minimum jitter in milliseconds - 30 seconds */
    MIN_MS: 30 * 1000,

    /** Maximum jitter in milliseconds - 60 seconds */
    MAX_MS: 60 * 1000,
  },

  // Circuit breaker configuration
  CIRCUIT_BREAKER: {
    /** Enable circuit breaker */
    ENABLED: true,

    /** Failure threshold to open circuit */
    FAILURE_THRESHOLD: 5,

    /** Time in milliseconds to keep circuit open */
    RESET_TIMEOUT_MS: 60 * 1000,

    /** Maximum attempts in half-open state */
    HALF_OPEN_MAX_ATTEMPTS: 3,
  },

  // Lock configuration
  LOCK: {
    /** Lock timeout in milliseconds */
    TIMEOUT_MS: 30 * 1000,

    /** Maximum wait time for lock acquisition */
    MAX_WAIT_MS: 10 * 1000,

    /** Retry interval when waiting for lock */
    RETRY_INTERVAL_MS: 100,
  },
} as const;

// ============================================
// HTTP CONFIGURATION
// ============================================

export const MKT_AUTH_HTTP_CONFIG = {
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 30000,

  /** Default headers for MKT Server requests */
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  /**
   * Reject unauthorized SSL certificates (self-signed)
   * Set to false in development to allow self-signed certificates
   * Default: true (secure - reject self-signed in production)
   */
  REJECT_UNAUTHORIZED: true,
} as const;

// ============================================
// METRICS NAMES
// ============================================

export const MKT_AUTH_METRICS = {
  // Counters
  TOKEN_ACQUISITIONS: 'mkt_auth_token_acquisitions_total',
  TOKEN_CACHE_HITS: 'mkt_auth_token_cache_hits_total',
  TOKEN_CACHE_MISSES: 'mkt_auth_token_cache_misses_total',
  RELOGIN_ATTEMPTS: 'mkt_auth_relogin_attempts_total',
  RELOGIN_SUCCESSES: 'mkt_auth_relogin_successes_total',
  RELOGIN_FAILURES: 'mkt_auth_relogin_failures_total',
  AUTH_FAILURES: 'mkt_auth_failures_total',

  // Histograms
  TOKEN_ACQUISITION_DURATION: 'mkt_auth_token_acquisition_duration_seconds',

  // Gauges
  CIRCUIT_BREAKER_STATE: 'mkt_auth_circuit_breaker_state',
  TOKEN_EXPIRY_SECONDS: 'mkt_auth_token_expiry_seconds',
} as const;

export type MktAuthMetricName =
  (typeof MKT_AUTH_METRICS)[keyof typeof MKT_AUTH_METRICS];
