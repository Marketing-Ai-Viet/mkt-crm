/**
 * Webhook Handler Interface
 *
 * Interface for handling webhooks from payment providers.
 * Each provider implements its own webhook parsing and validation logic.
 */

import { PaymentProviderType } from 'src/mkt-core/payment/types/provider.types';

/**
 * Webhook validation request
 */
export type WebhookValidationRequest = {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  signature?: string;
  apiKey?: string;
  ipAddress?: string;
};

/**
 * Webhook validation result
 */
export type WebhookValidationResult = {
  valid: boolean;
  errorMessage?: string;
};

/**
 * Normalized webhook payload (provider-agnostic)
 */
export type NormalizedWebhookPayload = {
  /** Provider's transaction ID (for idempotency) */
  providerTransactionId: string;
  /** Order code/reference from our system */
  orderCode: string | null;
  /** Transaction amount */
  amount: number;
  /** Transaction type: credit or debit */
  transactionType: 'CREDIT' | 'DEBIT';
  /** Transaction status */
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  /** Transaction timestamp */
  transactionDate: string;
  /** Provider/gateway name */
  gateway: string;
  /** Bank account number */
  accountNumber?: string;
  /** Transaction description/content */
  content?: string;
  /** Bank reference code */
  referenceCode?: string;
  /** Raw payload for logging */
  rawPayload: unknown;
};

/**
 * Context for webhook processing
 */
export type WebhookContext = {
  workspaceId: string;
  ipAddress?: string;
  receivedAt: string;
};

/**
 * Webhook processing status
 */
export type WebhookStatus =
  | 'MATCHED'
  | 'UNMATCHED'
  | 'PARTIAL'
  | 'OVERPAID'
  | 'ALREADY_PROCESSED'
  | 'AMOUNT_MISMATCH'
  | 'ORDER_NOT_FOUND'
  | 'NO_PAYMENT'
  | 'FAILED';

/**
 * Webhook processing result
 */
export type WebhookProcessResult = {
  success: boolean;
  status: WebhookStatus;
  matchedOrderId?: string;
  matchedOrderCode?: string;
  paymentId?: string;
  message?: string;
  processingTimeMs?: number;
};

/**
 * Interface for handling webhooks from payment providers
 */
export type IWebhookHandler = {
  /**
   * Provider type this handler is for
   */
  readonly providerType: PaymentProviderType;

  /**
   * Validate webhook authenticity (signature, API key, etc.)
   */
  validateWebhook(
    request: WebhookValidationRequest,
  ): Promise<WebhookValidationResult>;

  /**
   * Parse and normalize webhook payload
   */
  parseWebhookPayload(rawPayload: unknown): Promise<NormalizedWebhookPayload>;

  /**
   * Process the webhook and update payment status
   */
  processWebhook(
    payload: NormalizedWebhookPayload,
    context: WebhookContext,
  ): Promise<WebhookProcessResult>;

  /**
   * Check if this is a duplicate webhook (idempotency)
   */
  isDuplicateWebhook(
    workspaceId: string,
    transactionId: string,
  ): Promise<boolean>;
};
