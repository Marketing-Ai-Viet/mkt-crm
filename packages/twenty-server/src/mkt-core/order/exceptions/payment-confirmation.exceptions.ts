/**
 * Payment Confirmation Exception Classes
 *
 * Domain-specific exceptions for sale/accounting payment confirmation.
 * Follows the error pattern used in mkt-core modules.
 */

/**
 * Base exception for payment confirmation errors
 */
export class PaymentConfirmationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PaymentConfirmationError';
  }
}

/**
 * Exception when order is not found
 */
export class OrderNotFoundError extends PaymentConfirmationError {
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`, 'ORDER_NOT_FOUND', { orderId });
    this.name = 'OrderNotFoundError';
  }
}

/**
 * Exception when order is already confirmed by sale or accounting
 */
export class OrderAlreadyConfirmedError extends PaymentConfirmationError {
  constructor(orderId: string, confirmationType: 'sale' | 'accounting') {
    super(
      `Order ${orderId} already confirmed by ${confirmationType}`,
      'ORDER_ALREADY_CONFIRMED',
      { orderId, confirmationType },
    );
    this.name = 'OrderAlreadyConfirmedError';
  }
}

/**
 * Exception when order status does not allow the operation
 */
export class InvalidOrderStatusError extends PaymentConfirmationError {
  constructor(orderId: string, currentStatus: string, validStatuses: string[]) {
    super(
      `Cannot perform operation on order ${orderId} in status ${currentStatus}. Valid statuses: ${validStatuses.join(', ')}`,
      'INVALID_ORDER_STATUS',
      { orderId, currentStatus, validStatuses },
    );
    this.name = 'InvalidOrderStatusError';
  }
}

/**
 * Exception when order is already fully paid (no need for sale confirmation)
 */
export class OrderAlreadyPaidError extends PaymentConfirmationError {
  constructor(orderId: string) {
    super(
      `Order ${orderId} is already fully paid. Sale confirmation not needed.`,
      'ORDER_ALREADY_PAID',
      { orderId },
    );
    this.name = 'OrderAlreadyPaidError';
  }
}

/**
 * Exception when there is no confirmation to revoke
 */
export class NoConfirmationToRevokeError extends PaymentConfirmationError {
  constructor(orderId: string, confirmationType: 'sale' | 'accounting') {
    super(
      `Order ${orderId} has no ${confirmationType} confirmation to revoke`,
      'NO_CONFIRMATION_TO_REVOKE',
      { orderId, confirmationType },
    );
    this.name = 'NoConfirmationToRevokeError';
  }
}

/**
 * Exception when sale confirmation cannot be revoked
 * (e.g., accounting has already confirmed)
 */
export class CannotRevokeSaleError extends PaymentConfirmationError {
  constructor(orderId: string, reason: string) {
    super(
      `Cannot revoke sale confirmation for order ${orderId}: ${reason}`,
      'CANNOT_REVOKE_SALE_CONFIRMATION',
      { orderId, reason },
    );
    this.name = 'CannotRevokeSaleError';
  }
}

/**
 * Exception for concurrent modification conflicts (optimistic locking)
 */
export class ConcurrencyConflictError extends PaymentConfirmationError {
  constructor(orderId: string, detail: string) {
    super(
      `Concurrency conflict on order ${orderId}: ${detail}`,
      'CONCURRENCY_CONFLICT',
      { orderId, detail },
    );
    this.name = 'ConcurrencyConflictError';
  }
}

/**
 * Exception when user lacks required permission
 */
export class InsufficientPermissionError extends PaymentConfirmationError {
  constructor(action: string, requiredPermission: string) {
    super(
      `Insufficient permission to ${action}. Required: ${requiredPermission}`,
      'INSUFFICIENT_PERMISSION',
      { action, requiredPermission },
    );
    this.name = 'InsufficientPermissionError';
  }
}

/**
 * Exception when accounting cannot confirm due to missing payment evidence
 */
export class MissingPaymentEvidenceError extends PaymentConfirmationError {
  constructor(orderId: string) {
    super(
      `Cannot confirm accounting for order ${orderId}: no payment evidence (PAID status or sale confirmation)`,
      'MISSING_PAYMENT_EVIDENCE',
      { orderId },
    );
    this.name = 'MissingPaymentEvidenceError';
  }
}
