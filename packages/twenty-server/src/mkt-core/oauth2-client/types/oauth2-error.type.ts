import { HttpException, HttpStatus } from '@nestjs/common';

export const OAuth2ErrorCode = {
  INVALID_REQUEST: 'invalid_request',
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
  INVALID_SCOPE: 'invalid_scope',
  SERVER_ERROR: 'server_error',
  TEMPORARILY_UNAVAILABLE: 'temporarily_unavailable',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  CIRCUIT_BREAKER_OPEN: 'circuit_breaker_open',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
} as const;

export type OAuth2ErrorCodeType =
  (typeof OAuth2ErrorCode)[keyof typeof OAuth2ErrorCode];

export type OAuth2ErrorResponse = {
  error: OAuth2ErrorCodeType;
  error_description?: string;
};

export class OAuth2Exception extends HttpException {
  constructor(
    public readonly code: OAuth2ErrorCodeType,
    public readonly description?: string,
    public readonly httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super({ error: code, error_description: description }, httpStatus);
  }

  static fromErrorResponse(
    errorResponse: OAuth2ErrorResponse,
  ): OAuth2Exception {
    const statusMap: Record<OAuth2ErrorCodeType, HttpStatus> = {
      [OAuth2ErrorCode.INVALID_REQUEST]: HttpStatus.BAD_REQUEST,
      [OAuth2ErrorCode.INVALID_CLIENT]: HttpStatus.UNAUTHORIZED,
      [OAuth2ErrorCode.INVALID_GRANT]: HttpStatus.BAD_REQUEST,
      [OAuth2ErrorCode.UNAUTHORIZED_CLIENT]: HttpStatus.FORBIDDEN,
      [OAuth2ErrorCode.UNSUPPORTED_GRANT_TYPE]: HttpStatus.BAD_REQUEST,
      [OAuth2ErrorCode.INVALID_SCOPE]: HttpStatus.BAD_REQUEST,
      [OAuth2ErrorCode.SERVER_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
      [OAuth2ErrorCode.TEMPORARILY_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
      [OAuth2ErrorCode.RATE_LIMIT_EXCEEDED]: HttpStatus.TOO_MANY_REQUESTS,
      [OAuth2ErrorCode.CIRCUIT_BREAKER_OPEN]: HttpStatus.SERVICE_UNAVAILABLE,
      [OAuth2ErrorCode.TOKEN_EXPIRED]: HttpStatus.UNAUTHORIZED,
      [OAuth2ErrorCode.TOKEN_INVALID]: HttpStatus.UNAUTHORIZED,
    };

    return new OAuth2Exception(
      errorResponse.error,
      errorResponse.error_description,
      statusMap[errorResponse.error] ?? HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class RateLimitException extends OAuth2Exception {
  constructor(
    public readonly retryAfterMs: number,
    description?: string,
  ) {
    super(
      OAuth2ErrorCode.RATE_LIMIT_EXCEEDED,
      description ?? `Rate limit exceeded. Retry after ${retryAfterMs}ms`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class CircuitBreakerOpenException extends OAuth2Exception {
  constructor(description?: string) {
    super(
      OAuth2ErrorCode.CIRCUIT_BREAKER_OPEN,
      description ??
        'Circuit breaker is OPEN. Service temporarily unavailable.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
