/**
 * Confirmation Rules Constants
 *
 * Business rules for sale/accounting payment confirmation.
 * These rules define when and how confirmations can be made/revoked.
 */

import { ORDER_STATUS } from './order-status.constants';
import { ORDER_PAYMENT_STATUS } from './payment-status.constants';

// ============================================
// CONFIRMATION RULES
// ============================================

/**
 * Business rules for payment confirmation operations
 */
export const CONFIRMATION_RULES = {
  /**
   * Sale can confirm payment when:
   * - Order status: PROCESSING or PENDING_PAYMENT
   * - Payment status: PENDING or PARTIAL (not PAID/OVERPAID)
   * - Not already confirmed by sale
   */
  saleCanConfirm: {
    validOrderStatuses: [ORDER_STATUS.PROCESSING, ORDER_STATUS.PENDING_PAYMENT],
    validPaymentStatuses: [
      ORDER_PAYMENT_STATUS.PENDING,
      ORDER_PAYMENT_STATUS.PARTIAL,
    ],
    excludePaymentStatuses: [
      ORDER_PAYMENT_STATUS.PAID,
      ORDER_PAYMENT_STATUS.OVERPAID,
    ],
  },

  /**
   * Accounting can confirm when:
   * - Order status: PROCESSING or PENDING_PAYMENT
   * - Not already confirmed by accounting
   * - Has payment evidence (PAID status or sale confirmation)
   */
  accountingCanConfirm: {
    validOrderStatuses: [ORDER_STATUS.PROCESSING, ORDER_STATUS.PENDING_PAYMENT],
    requiresPaymentEvidence: true, // PAID status or salePaymentConfirmed
  },

  /**
   * Auto-complete order when accounting confirms if:
   * - Payment status = PAID
   */
  autoCompleteConditions: {
    requiredPaymentStatus: ORDER_PAYMENT_STATUS.PAID,
  },

  /**
   * Revoke rules:
   * - Sale revoke: Only when accounting has NOT confirmed
   * - Accounting revoke: Always allowed (will revert COMPLETED → PROCESSING)
   */
  revokeRules: {
    saleRevokeBlockedIf: ['accountingConfirmed'] as const,
    accountingRevokeRevertsStatus: {
      from: ORDER_STATUS.COMPLETED,
      to: ORDER_STATUS.PROCESSING,
    },
  },
} as const;

// ============================================
// CONFIRMATION TYPE
// ============================================

/**
 * Payment confirmation type enum
 */
export enum PAYMENT_CONFIRMATION_TYPE {
  SALE = 'SALE',
  ACCOUNTING = 'ACCOUNTING',
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if order status allows sale confirmation
 */
export const CAN_SALE_CONFIRM_STATUS = (status: ORDER_STATUS): boolean =>
  (
    CONFIRMATION_RULES.saleCanConfirm
      .validOrderStatuses as readonly ORDER_STATUS[]
  ).includes(status);

/**
 * Check if payment status allows sale confirmation
 */
export const CAN_SALE_CONFIRM_PAYMENT_STATUS = (
  paymentStatus: ORDER_PAYMENT_STATUS,
): boolean =>
  !(
    CONFIRMATION_RULES.saleCanConfirm
      .excludePaymentStatuses as readonly ORDER_PAYMENT_STATUS[]
  ).includes(paymentStatus);

/**
 * Check if order status allows accounting confirmation
 */
export const CAN_ACCOUNTING_CONFIRM_STATUS = (status: ORDER_STATUS): boolean =>
  (
    CONFIRMATION_RULES.accountingCanConfirm
      .validOrderStatuses as readonly ORDER_STATUS[]
  ).includes(status);

/**
 * Check if order should auto-complete after accounting confirmation
 */
export const SHOULD_AUTO_COMPLETE_ON_ACCOUNTING_CONFIRM = (
  paymentStatus: ORDER_PAYMENT_STATUS,
): boolean =>
  paymentStatus ===
  CONFIRMATION_RULES.autoCompleteConditions.requiredPaymentStatus;

/**
 * Check if sale can revoke confirmation
 * Sale cannot revoke if accounting has already confirmed
 */
export const CAN_SALE_REVOKE = (accountingConfirmed: boolean): boolean =>
  accountingConfirmed !== true;

/**
 * Check if order is protected from auto-lock
 * Protected if sale OR accounting has confirmed
 *
 * IMPORTANT: Use strict comparison (=== true) for null safety
 */
export const IS_PROTECTED_FROM_AUTO_LOCK = (order: {
  salePaymentConfirmed: boolean;
  accountingConfirmed: boolean;
}): boolean =>
  order.salePaymentConfirmed === true || order.accountingConfirmed === true;
