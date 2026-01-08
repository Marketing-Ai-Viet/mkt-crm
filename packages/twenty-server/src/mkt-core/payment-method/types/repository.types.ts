import { ActorMetadata } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';

import { PaymentMethodType } from './mkt-payment-method.type';

// ============================================
// PAYMENT METHOD REPOSITORY TYPES
// ============================================

/**
 * Default relations for payment method queries
 */
export const DEFAULT_PAYMENT_METHOD_RELATIONS = ['mktPayments'] as const;

/**
 * Options for finding payment methods
 */
export type FindPaymentMethodOptions = {
  relations?: string[];
};

/**
 * Data for creating a new payment method
 */
export type CreatePaymentMethodData = {
  name: string;
  type?: PaymentMethodType;
  description?: string;
  isActive?: boolean;
  position?: number;
};

/**
 * Data for updating a payment method
 */
export type UpdatePaymentMethodData = Partial<{
  name: string;
  type: PaymentMethodType;
  description: string;
  isActive: boolean;
  position: number;
  createdBy: ActorMetadata;
}>;
