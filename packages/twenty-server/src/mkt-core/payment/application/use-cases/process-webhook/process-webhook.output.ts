/**
 * Process Webhook Use Case Output
 *
 * Output data from processing a payment webhook.
 */

import {
  MatchType,
  TransferType,
} from 'src/mkt-core/payment/domain/value-objects';

/**
 * Webhook processing status
 */
export const WEBHOOK_PROCESSING_STATUS = {
  ALREADY_PROCESSED: 'ALREADY_PROCESSED',
  UNMATCHED: 'UNMATCHED',
  NO_PAYMENT: 'NO_PAYMENT',
  FULLY_PAID: 'FULLY_PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  OVERPAID: 'OVERPAID',
  REQUIRES_REVIEW: 'REQUIRES_REVIEW',
  ERROR: 'ERROR',
} as const;

export type WebhookProcessingStatus =
  (typeof WEBHOOK_PROCESSING_STATUS)[keyof typeof WEBHOOK_PROCESSING_STATUS];

/**
 * Payment details after processing
 */
export type ProcessedPaymentDetails = {
  /** Expected total amount */
  expectedAmount: number;
  /** Amount received in this transaction */
  receivedAmount: number;
  /** Total amount paid (including previous payments) */
  totalPaidAmount: number;
  /** Remaining amount to be paid */
  remainingAmount: number;
  /** Percentage paid (0-100) */
  percentagePaid: number;
};

/**
 * Match result details
 */
export type MatchDetails = {
  /** Match type used */
  matchType: MatchType;
  /** Match confidence (0-1) */
  confidence: number;
  /** Transfer type */
  transferType: TransferType;
  /** Matched order code */
  orderCode?: string;
  /** Matched order ID */
  orderId?: string;
  /** VA number if matched via VA */
  vaNumber?: string;
  /** Whether manual review is required */
  requiresManualReview: boolean;
};

/**
 * Process Webhook Use Case Output
 */
export type ProcessWebhookOutput = {
  /** Whether processing was successful */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Processing status */
  status: WebhookProcessingStatus;
  /** Transaction ID from provider */
  transactionId: string;
  /** Match details (if matched) */
  matchDetails?: MatchDetails;
  /** Payment details (if payment was processed) */
  paymentDetails?: ProcessedPaymentDetails;
  /** Error message (if processing failed) */
  error?: string;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
};

/**
 * Factory functions for common outputs
 */
export const createAlreadyProcessedOutput = (
  transactionId: string,
): ProcessWebhookOutput => ({
  success: true,
  message: 'Transaction already processed',
  status: WEBHOOK_PROCESSING_STATUS.ALREADY_PROCESSED,
  transactionId,
});

export const createUnmatchedOutput = (
  transactionId: string,
  reason?: string,
): ProcessWebhookOutput => ({
  success: true,
  message: reason ?? 'Could not match payment to an order',
  status: WEBHOOK_PROCESSING_STATUS.UNMATCHED,
  transactionId,
});

export const createNoPaymentOutput = (
  transactionId: string,
  orderCode: string,
): ProcessWebhookOutput => ({
  success: true,
  message: 'Order found but no pending payment exists',
  status: WEBHOOK_PROCESSING_STATUS.NO_PAYMENT,
  transactionId,
  matchDetails: {
    matchType: 'EXACT_CODE',
    confidence: 1,
    transferType: 'REGULAR',
    orderCode,
    requiresManualReview: false,
  },
});

export const createSuccessOutput = (
  transactionId: string,
  status: WebhookProcessingStatus,
  matchDetails: MatchDetails,
  paymentDetails: ProcessedPaymentDetails,
  processingTimeMs?: number,
): ProcessWebhookOutput => ({
  success: true,
  message: getMessageForStatus(status),
  status,
  transactionId,
  matchDetails,
  paymentDetails,
  processingTimeMs,
});

export const createErrorOutput = (
  transactionId: string,
  error: string,
): ProcessWebhookOutput => ({
  success: false,
  message: 'Error processing webhook',
  status: WEBHOOK_PROCESSING_STATUS.ERROR,
  transactionId,
  error,
});

export const createManualReviewOutput = (
  transactionId: string,
  matchDetails: MatchDetails,
): ProcessWebhookOutput => ({
  success: true,
  message: 'Payment requires manual review',
  status: WEBHOOK_PROCESSING_STATUS.REQUIRES_REVIEW,
  transactionId,
  matchDetails,
});

/**
 * Helper to get message for status
 */
const getMessageForStatus = (status: WebhookProcessingStatus): string => {
  const messages: Record<WebhookProcessingStatus, string> = {
    ALREADY_PROCESSED: 'Transaction already processed',
    UNMATCHED: 'Could not match payment to an order',
    NO_PAYMENT: 'Order found but no pending payment exists',
    FULLY_PAID: 'Payment completed successfully',
    PARTIALLY_PAID: 'Partial payment received',
    OVERPAID: 'Payment received exceeds expected amount',
    REQUIRES_REVIEW: 'Payment requires manual review',
    ERROR: 'Error processing webhook',
  };

  return messages[status];
};
