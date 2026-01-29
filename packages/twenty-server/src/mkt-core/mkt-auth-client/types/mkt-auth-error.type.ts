/**
 * MKT Auth Error Types
 *
 * Custom exception classes for MKT Auth Client.
 * Provides structured error handling with error codes, HTTP status, and retry information.
 */

// ============================================
// ERROR CODES
// ============================================

export const MKT_AUTH_ERROR_CODE = {
  /** Authentication failed (401) */
  AUTHENTICATION_FAILED: 'MKT_AUTH_AUTHENTICATION_FAILED',

  /** Authorization denied (403) */
  AUTHORIZATION_DENIED: 'MKT_AUTH_AUTHORIZATION_DENIED',

  /** Resource not found (404) */
  NOT_FOUND: 'MKT_AUTH_NOT_FOUND',

  /** Rate limited (429) */
  RATE_LIMITED: 'MKT_AUTH_RATE_LIMITED',

  /** Server unavailable (5xx) */
  SERVER_UNAVAILABLE: 'MKT_AUTH_SERVER_UNAVAILABLE',

  /** Configuration error */
  CONFIGURATION_ERROR: 'MKT_AUTH_CONFIGURATION_ERROR',

  /** Lock acquisition failed */
  LOCK_ACQUISITION_FAILED: 'MKT_AUTH_LOCK_ACQUISITION_FAILED',

  /** Token expired */
  TOKEN_EXPIRED: 'MKT_AUTH_TOKEN_EXPIRED',

  /** Network error */
  NETWORK_ERROR: 'MKT_AUTH_NETWORK_ERROR',

  /** Circuit breaker open */
  CIRCUIT_OPEN: 'MKT_AUTH_CIRCUIT_OPEN',
} as const;

export type MktAuthErrorCode =
  (typeof MKT_AUTH_ERROR_CODE)[keyof typeof MKT_AUTH_ERROR_CODE];

// ============================================
// BASE EXCEPTION
// ============================================

/**
 * Base exception class for MKT Auth Client
 */
export class MktAuthException extends Error {
  constructor(
    message: string,
    public readonly code: MktAuthErrorCode,
    public readonly statusCode?: number,
    public readonly retryable = false,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'MktAuthException';
    Object.setPrototypeOf(this, MktAuthException.prototype);
  }
}

// ============================================
// SPECIFIC EXCEPTIONS
// ============================================

/**
 * Authentication failed (401)
 * Thrown when sign-in fails or token is invalid
 */
export class MktAuthenticationException extends MktAuthException {
  constructor(message = 'Authentication with MKT Server failed') {
    super(message, MKT_AUTH_ERROR_CODE.AUTHENTICATION_FAILED, 401, true);
    this.name = 'MktAuthenticationException';
    Object.setPrototypeOf(this, MktAuthenticationException.prototype);
  }
}

/**
 * Authorization denied (403)
 * Thrown when authenticated but not authorized to access resource
 */
export class MktAuthorizationException extends MktAuthException {
  constructor(message = 'Not authorized to access this resource') {
    super(message, MKT_AUTH_ERROR_CODE.AUTHORIZATION_DENIED, 403, false);
    this.name = 'MktAuthorizationException';
    Object.setPrototypeOf(this, MktAuthorizationException.prototype);
  }
}

/**
 * Resource not found (404)
 * Thrown when requested resource doesn't exist
 */
export class MktNotFoundException extends MktAuthException {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} not found: ${identifier}`,
      MKT_AUTH_ERROR_CODE.NOT_FOUND,
      404,
      false,
    );
    this.name = 'MktNotFoundException';
    Object.setPrototypeOf(this, MktNotFoundException.prototype);
  }
}

/**
 * Rate limited (429)
 * Thrown when API rate limit is exceeded
 */
export class MktRateLimitException extends MktAuthException {
  constructor(retryAfterMs?: number) {
    const message = retryAfterMs
      ? `Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)}s`
      : 'Rate limit exceeded';

    super(message, MKT_AUTH_ERROR_CODE.RATE_LIMITED, 429, true, retryAfterMs);
    this.name = 'MktRateLimitException';
    Object.setPrototypeOf(this, MktRateLimitException.prototype);
  }
}

/**
 * Server unavailable (5xx)
 * Thrown when MKT Server is unavailable or returns server error
 */
export class MktServerUnavailableException extends MktAuthException {
  constructor(message = 'MKT Server is unavailable') {
    super(message, MKT_AUTH_ERROR_CODE.SERVER_UNAVAILABLE, 503, true);
    this.name = 'MktServerUnavailableException';
    Object.setPrototypeOf(this, MktServerUnavailableException.prototype);
  }
}

/**
 * Configuration error
 * Thrown when required configuration is missing or invalid
 */
export class MktConfigurationException extends MktAuthException {
  constructor(message: string) {
    super(message, MKT_AUTH_ERROR_CODE.CONFIGURATION_ERROR, undefined, false);
    this.name = 'MktConfigurationException';
    Object.setPrototypeOf(this, MktConfigurationException.prototype);
  }
}

/**
 * Lock acquisition failed
 * Thrown when distributed lock cannot be acquired
 */
export class MktLockAcquisitionException extends MktAuthException {
  constructor(lockKey: string, reason?: string) {
    const message = reason
      ? `Failed to acquire lock for ${lockKey}: ${reason}`
      : `Failed to acquire lock for ${lockKey}`;

    super(
      message,
      MKT_AUTH_ERROR_CODE.LOCK_ACQUISITION_FAILED,
      undefined,
      true,
    );
    this.name = 'MktLockAcquisitionException';
    Object.setPrototypeOf(this, MktLockAcquisitionException.prototype);
  }
}

/**
 * Token expired
 * Thrown when token has expired and needs refresh
 */
export class MktTokenExpiredException extends MktAuthException {
  constructor(message = 'MKT Auth token has expired') {
    super(message, MKT_AUTH_ERROR_CODE.TOKEN_EXPIRED, 401, true);
    this.name = 'MktTokenExpiredException';
    Object.setPrototypeOf(this, MktTokenExpiredException.prototype);
  }
}

/**
 * Network error
 * Thrown when network request fails (timeout, connection refused, etc.)
 */
export class MktNetworkException extends MktAuthException {
  constructor(message: string, statusCode?: number) {
    super(message, MKT_AUTH_ERROR_CODE.NETWORK_ERROR, statusCode, true);
    this.name = 'MktNetworkException';
    Object.setPrototypeOf(this, MktNetworkException.prototype);
  }
}

/**
 * Circuit breaker open
 * Thrown when circuit breaker is open and requests are blocked
 */
export class MktCircuitOpenException extends MktAuthException {
  constructor(remainingMs?: number) {
    const message = remainingMs
      ? `Circuit breaker is OPEN. Will reset in ${Math.ceil(remainingMs / 1000)}s`
      : 'Circuit breaker is OPEN';

    super(message, MKT_AUTH_ERROR_CODE.CIRCUIT_OPEN, undefined, false);
    this.name = 'MktCircuitOpenException';
    Object.setPrototypeOf(this, MktCircuitOpenException.prototype);
  }
}
