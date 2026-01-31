// ============================================
// PAYMENT EVENT CONSTANTS
// ============================================

/**
 * Payment event names
 *
 * Used with NestJS EventEmitter2 for decoupled event handling.
 */
export const PAYMENT_EVENTS = {
  /** Emitted when payment is received */
  PAYMENT_RECEIVED: 'payment.received',
  /** Emitted when payment is fully completed */
  PAYMENT_COMPLETED: 'payment.completed',
  /** Emitted when partial payment is received */
  PAYMENT_PARTIAL: 'payment.partial',
  /** Emitted when overpayment is detected */
  PAYMENT_OVERPAID: 'payment.overpaid',
  /** Emitted when payment processing fails */
  PAYMENT_FAILED: 'payment.failed',
  /** Emitted when order is confirmed after payment */
  ORDER_CONFIRMED: 'order.confirmed',
  /** Emitted when payment is confirmed manually */
  PAYMENT_CONFIRMED: 'payment.confirmed',
  /** Emitted when payment is rejected */
  PAYMENT_REJECTED: 'payment.rejected',
  /** Emitted when payment is refunded (full or partial) */
  PAYMENT_REFUNDED: 'payment.refunded',
} as const;

export type PaymentEventType =
  (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];

// ============================================
// EVENT PAYLOAD TYPES
// ============================================

/**
 * Base payment event payload
 */
export type PaymentEventBase = {
  /** Payment record ID */
  paymentId: string;
  /** Order ID */
  orderId: string;
  /** Order code */
  orderCode: string;
  /** Payment amount received */
  amount: number;
  /** SEPay transaction ID */
  transactionId: string;
  /** Payment gateway (e.g., MBBank) */
  gateway: string;
  /** Transaction date from gateway */
  transactionDate: string;
  /** Workspace ID for multi-tenant */
  workspaceId: string;
};

/**
 * Payment received event payload
 */
export type PaymentReceivedEvent = PaymentEventBase;

/**
 * Payment completed (full payment) event payload
 */
export type PaymentCompletedEvent = PaymentEventBase & {
  /** Total amount paid including previous payments */
  totalPaidAmount: number;
  /** Customer ID if available */
  customerId?: string;
};

/**
 * Partial payment event payload
 */
export type PaymentPartialEvent = PaymentEventBase & {
  /** Expected total amount */
  expectedAmount: number;
  /** Total amount paid so far */
  totalPaidAmount: number;
  /** Remaining amount to be paid */
  remainingAmount: number;
  /** Percentage paid (0-100) */
  percentagePaid: number;
};

/**
 * Overpayment event payload
 */
export type PaymentOverpaidEvent = PaymentEventBase & {
  /** Expected total amount */
  expectedAmount: number;
  /** Total amount paid */
  totalPaidAmount: number;
  /** Amount overpaid (for refund) */
  overpaidAmount: number;
};

/**
 * Payment failed event payload
 */
export type PaymentFailedEvent = PaymentEventBase & {
  /** Error message */
  errorMessage: string;
  /** Error code if available */
  errorCode?: string;
};

/**
 * Order confirmed event payload
 */
export type OrderConfirmedEvent = {
  /** Order ID */
  orderId: string;
  /** Order code */
  orderCode: string;
  /** Customer ID if available */
  customerId?: string;
  /** Order total amount */
  totalAmount: number;
  /** Workspace ID for multi-tenant */
  workspaceId: string;
  /** Confirmation timestamp (ISO string) */
  confirmedAt: string;
};

// ============================================
// NEW EVENT PAYLOAD TYPES (Multi-Payment)
// ============================================

/**
 * Payment confirmed manually event payload
 */
export type PaymentConfirmedEvent = {
  /** Payment ID */
  paymentId: string;
  /** Order ID */
  orderId: string;
  /** Order code */
  orderCode?: string;
  /** Payment amount */
  amount: number;
  /** Total paid amount for order */
  totalPaidAmount: number;
  /** User who confirmed */
  confirmedById: string;
  /** New order payment status */
  newOrderPaymentStatus?: string;
  /** Workspace ID */
  workspaceId: string;
};

/**
 * Payment rejected event payload
 */
export type PaymentRejectedEvent = {
  /** Payment ID */
  paymentId: string;
  /** Order ID */
  orderId: string;
  /** User who rejected */
  rejectedById: string;
  /** Rejection reason */
  rejectionReason: string;
  /** Workspace ID */
  workspaceId: string;
};

/**
 * Payment refunded event payload
 */
export type PaymentRefundedEvent = {
  /** Payment ID */
  paymentId: string;
  /** Order ID */
  orderId: string;
  /** Order code */
  orderCode?: string;
  /** Amount refunded in this transaction */
  refundAmount: number;
  /** Total amount refunded for this payment */
  totalRefunded: number;
  /** Whether this is a full refund */
  isFullRefund: boolean;
  /** User who processed refund */
  refundedById: string;
  /** New order payment status */
  newOrderPaymentStatus?: string;
  /** Workspace ID */
  workspaceId: string;
};
