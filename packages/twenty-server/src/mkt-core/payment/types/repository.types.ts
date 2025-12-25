import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { WebhookLogStatus } from 'src/mkt-core/payment/objects/mkt-webhook-log.workspace-entity';
import { PaymentCurrency, PaymentStatus } from 'src/mkt-core/payment/types';

// ============================================
// PAYMENT REPOSITORY TYPES
// ============================================

/**
 * Default relations for payment queries
 */
export const DEFAULT_PAYMENT_RELATIONS = [
  'mktOrder',
  'mktPaymentMethod',
] as const;

/**
 * Options for finding payments
 */
export type FindPaymentOptions = {
  relations?: string[];
};

/**
 * Data for creating a new payment
 */
export type CreatePaymentData = {
  name: string;
  amount: number;
  currency?: PaymentCurrency;
  status?: PaymentStatus;
  mktOrderId?: string;
  mktPaymentMethodId?: string;
  qrCodeUrl?: string;
  paymentPageUrl?: string;
  duration?: number;
  expiredAt?: string;
  description?: string;
  invoiceId?: string;
  mktTemplateId?: string;
};

/**
 * Data for updating a payment
 */
export type UpdatePaymentData = Partial<{
  name: string;
  amount: number;
  currency: PaymentCurrency;
  status: PaymentStatus;
  paymentDate: string;
  description: string;
  sepayTransactionId: string;
  qrCodeUrl: string;
  expiredAt: string;
  createdBy: ActorMetadata;
}>;

// ============================================
// WEBHOOK LOG REPOSITORY TYPES
// ============================================

/**
 * Options for finding webhook logs
 */
export type FindWebhookLogOptions = {
  relations?: string[];
};

/**
 * Data for creating a webhook log
 */
export type CreateWebhookLogData = {
  sepayTransactionId: number;
  gateway: string;
  requestBody: object;
  ipAddress?: string;
  status?: WebhookLogStatus;
};

/**
 * Data for updating a webhook log
 */
export type UpdateWebhookLogData = Partial<{
  status: WebhookLogStatus;
  responseStatus: number;
  responseBody: object;
  processingTimeMs: number;
  errorMessage: string;
  matchedOrderCode: string;
}>;
