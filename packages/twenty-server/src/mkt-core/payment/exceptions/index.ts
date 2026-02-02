/**
 * Payment Module Custom Exceptions
 *
 * Domain-specific exceptions for payment processing.
 */

/**
 * Base exception for VA Provider errors
 */
export class VAProviderException extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'VAProviderException';
  }
}

/**
 * Exception when VA is not found
 */
export class VANotFoundException extends Error {
  constructor(vaNumber: string) {
    super(`Virtual Account not found: ${vaNumber}`);
    this.name = 'VANotFoundException';
  }
}

/**
 * Exception when VA has expired
 */
export class VAExpiredException extends Error {
  constructor(vaNumber: string) {
    super(`Virtual Account expired: ${vaNumber}`);
    this.name = 'VAExpiredException';
  }
}

/**
 * Exception when VA already exists for an order
 */
export class VAAlreadyExistsException extends Error {
  constructor(orderId: string, vaNumber: string) {
    super(`Virtual Account already exists for order ${orderId}: ${vaNumber}`);
    this.name = 'VAAlreadyExistsException';
  }
}

/**
 * Exception when VA provider is not configured
 */
export class VAProviderNotConfiguredException extends Error {
  constructor(provider: string) {
    super(`VA Provider not configured: ${provider}`);
    this.name = 'VAProviderNotConfiguredException';
  }
}

/**
 * Exception when VA provider API returns an error
 */
export class VAProviderApiException extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = 'VAProviderApiException';
  }
}

/**
 * Exception when order is not found for VA creation
 */
export class OrderNotFoundForVAException extends Error {
  constructor(orderId: string) {
    super(`Order not found for VA creation: ${orderId}`);
    this.name = 'OrderNotFoundForVAException';
  }
}

/**
 * Exception when webhook processing fails
 */
export class WebhookProcessingException extends Error {
  constructor(
    message: string,
    public readonly webhookId?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'WebhookProcessingException';
  }
}

/**
 * Exception when maximum retry attempts are exceeded
 */
export class MaxRetryExceededException extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly maxRetries: number,
  ) {
    super(
      `Maximum retry attempts (${maxRetries}) exceeded for ${entityType}: ${entityId}`,
    );
    this.name = 'MaxRetryExceededException';
  }
}
