/**
 * Process Webhook Use Case Input
 *
 * Input data for processing a payment webhook.
 */

import { PaymentProviderType } from 'src/mkt-core/payment/constants/payment-provider.constants';

/**
 * Webhook payload received from payment provider
 */
export type WebhookPayload = {
  /** Transaction ID from provider (unique identifier) */
  transactionId: string | number;
  /** Order code from webhook (may be null) */
  code: string | null;
  /** Transaction content/description */
  content: string | null;
  /** Description field */
  description?: string;
  /** Transfer amount */
  amount: number;
  /** Transaction date in ISO format */
  transactionDate: string;
  /** Gateway/Provider name */
  gateway: string;
  /** Additional metadata from provider */
  metadata?: Record<string, unknown>;
};

/**
 * Authentication context from webhook
 */
export type WebhookAuthContext = {
  workspaceId: string;
  userId?: string;
};

/**
 * Process Webhook Use Case Input
 */
export type ProcessWebhookInput = {
  /** Webhook payload from provider */
  payload: WebhookPayload;
  /** Authentication context */
  authContext: WebhookAuthContext;
  /** Provider type */
  providerType: PaymentProviderType;
  /** IP address of webhook sender */
  ipAddress?: string;
};

/**
 * Factory function to create ProcessWebhookInput from SePay webhook
 */
export const createProcessWebhookInputFromSepay = (
  sepayPayload: {
    id: string | number;
    code: string | null;
    content: string | null;
    description?: string;
    transferAmount: number;
    transactionDate: string;
    gateway: string;
  },
  authContext: WebhookAuthContext,
  ipAddress?: string,
): ProcessWebhookInput => ({
  payload: {
    transactionId: sepayPayload.id,
    code: sepayPayload.code,
    content: sepayPayload.content,
    description: sepayPayload.description,
    amount: sepayPayload.transferAmount,
    transactionDate: sepayPayload.transactionDate,
    gateway: sepayPayload.gateway,
  },
  authContext,
  providerType: 'SEPAY',
  ipAddress,
});
