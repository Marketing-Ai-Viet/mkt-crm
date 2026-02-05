/**
 * Payment Confirmation Types
 *
 * Type definitions for sale/accounting payment confirmation feature.
 */

import { PAYMENT_CONFIRMATION_TYPE } from 'src/mkt-core/order/constants/confirmation-rules.constants';

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input for confirming payment (sale or accounting)
 */
export type ConfirmPaymentInput = {
  orderId: string;
  idempotencyKey?: string;
  note?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Input for revoking a confirmation
 */
export type RevokeConfirmationInput = {
  orderId: string;
  type: PAYMENT_CONFIRMATION_TYPE;
  reason: string;
  idempotencyKey?: string;
};

// ============================================
// ACTOR TYPES
// ============================================

/**
 * Actor metadata from workspace context
 * Used for tracking who performed the action
 */
export type ConfirmationActorMetadata = {
  source: 'MANUAL' | 'SYSTEM';
  name: string;
  workspaceMemberId?: string;
};

/**
 * Actor info for display in responses
 */
export type ActorInfo = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

// ============================================
// RESULT TYPES
// ============================================

/**
 * Impact of a revoke action
 * Indicates whether the order will be auto-locked after revoke
 */
export type RevokeImpact = {
  willBeLocked: boolean;
  reason: string;
  statusChanged?: boolean;
  previousStatus?: string;
  newStatus?: string;
};

/**
 * Result of a confirmation action (confirm or revoke)
 */
export type ConfirmationResult = {
  success: boolean;
  orderId: string;
  confirmedAt: string;
  confirmedBy: ConfirmationActorMetadata;
  type: PAYMENT_CONFIRMATION_TYPE;
  version: number;
  note?: string;
  impact?: RevokeImpact;
};

// ============================================
// STATUS TYPES
// ============================================

/**
 * Current confirmation status of an order
 */
export type OrderConfirmationStatus = {
  orderId: string;
  saleConfirmed: boolean;
  saleConfirmedAt?: string;
  saleConfirmedBy?: ActorInfo;
  accountingConfirmed: boolean;
  accountingConfirmedAt?: string;
  accountingConfirmedBy?: ActorInfo;
  isProtectedFromAutoLock: boolean;
  protectionReason?: string;
};

// ============================================
// HISTORY TYPES
// ============================================

/**
 * Detail of a single confirmation from history
 */
export type ConfirmationDetail = {
  id: string;
  action: string;
  confirmedAt: string;
  confirmedBy: ActorInfo;
  note?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Confirmation history for an order
 */
export type ConfirmationHistory = {
  orderId: string;
  confirmations: ConfirmationDetail[];
};

// ============================================
// ORDER HISTORY DATA TYPE
// ============================================

/**
 * Data for creating order history record for confirmation
 */
export type CreateConfirmationHistoryData = {
  mktOrderId: string;
  action: string;
  name: string;
  note?: string;
  createdBy: ConfirmationActorMetadata;
  oldValue?: string;
  newValue?: string;
  fieldName?: string;
  metadata?: Record<string, unknown>;
};

// ============================================
// OVERDUE SCAN TYPES
// ============================================

/**
 * Options for finding overdue orders
 * Used by PaymentOverdueScanService
 */
export type FindUnprotectedOverdueOrdersOptions = {
  status: string;
  paymentDeadlineBefore: Date;
  salePaymentConfirmed: false;
  accountingConfirmed: false;
};

export type PublicOrderLogResult =
  | 'SUCCESS'
  | 'NOT_FOUND'
  | 'BLOCKED'
  | 'NO_PAYMENT';
