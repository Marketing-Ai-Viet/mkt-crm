import { Injectable, Logger } from '@nestjs/common';

import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import {
  PAYMENT_STATUS,
  IS_PAYMENT_COMPLETE,
} from 'src/mkt-core/order/constants/payment-status.constants';

// ============================================
// TYPES
// ============================================

/**
 * Payment summary calculated from confirmed payments
 */
export type PaymentSummary = {
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PAYMENT_STATUS;
  paidPercent: number;
};

/**
 * Payment data for calculation (only confirmed payments)
 */
export type ConfirmedPaymentData = {
  amount: number;
  refundedAmount?: number;
};

/**
 * Partial payment policy options
 */
export type PartialPaymentPolicy = 'NONE' | 'THRESHOLD' | 'PRO_RATA';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_THRESHOLD_PERCENT = 100; // Require full payment by default

// ============================================
// SERVICE
// ============================================

/**
 * OrderPaymentCalculationService
 *
 * Calculates payment summary for orders with multiple payments.
 * Only considers CONFIRMED payments for calculation.
 *
 * Features:
 * - Calculate total paid amount (minus refunds)
 * - Calculate remaining amount
 * - Determine payment status (PENDING, PARTIAL, PAID, OVERPAID)
 * - Check license creation eligibility based on payment status
 */
@Injectable()
export class OrderPaymentCalculationService {
  private readonly logger = new Logger(OrderPaymentCalculationService.name);

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Calculate payment summary from confirmed payments
   *
   * @param totalAmount - Order total amount
   * @param confirmedPayments - List of confirmed payments
   * @returns PaymentSummary with paidAmount, remainingAmount, paymentStatus, paidPercent
   */
  calculatePaymentSummary(
    totalAmount: number,
    confirmedPayments: ConfirmedPaymentData[],
  ): PaymentSummary {
    // Calculate total paid (minus refunds)
    const paidAmount = this.calculatePaidAmount(confirmedPayments);

    // Calculate remaining
    const remainingAmount = MoneyUtils.subtract(
      totalAmount,
      paidAmount,
    ).toNumber();

    // Determine status
    const paymentStatus = this.determinePaymentStatus(
      paidAmount,
      remainingAmount,
    );

    // Calculate paid percentage
    const paidPercent = this.calculatePaidPercent(paidAmount, totalAmount);

    this.logger.debug(
      `Payment summary: paid=${paidAmount}, remaining=${remainingAmount}, ` +
        `status=${paymentStatus}, percent=${paidPercent}%`,
    );

    return { paidAmount, remainingAmount, paymentStatus, paidPercent };
  }

  /**
   * Recalculate payment summary after a payment change
   * Convenience method that takes order data directly
   *
   * @param order - Order with totalAmount
   * @param payments - All payments for the order (will filter for confirmed)
   */
  recalculateFromPayments<
    T extends { amount: number; refundedAmount?: number; status?: string },
  >(totalAmount: number, payments: T[]): PaymentSummary {
    // Filter only confirmed payments
    const confirmedPayments = payments.filter(
      (p) => p.status === 'CONFIRMED' || p.status === undefined,
    );

    return this.calculatePaymentSummary(
      totalAmount,
      confirmedPayments.map((p) => ({
        amount: p.amount,
        refundedAmount: p.refundedAmount,
      })),
    );
  }

  /**
   * Check if order is eligible for license creation based on payment
   *
   * @param paymentStatus - Current payment status
   * @param policy - Partial payment policy (default: NONE = require full payment)
   * @param paidPercent - Percentage paid (required for THRESHOLD policy)
   * @param thresholdPercent - Minimum percentage required (default: 100)
   */
  isEligibleForLicenseCreation(
    paymentStatus: PAYMENT_STATUS,
    policy: PartialPaymentPolicy = 'NONE',
    paidPercent?: number,
    thresholdPercent: number = DEFAULT_THRESHOLD_PERCENT,
  ): boolean {
    // Full payment or overpaid - always eligible
    if (IS_PAYMENT_COMPLETE(paymentStatus)) {
      return true;
    }

    // No partial payment allowed
    if (policy === 'NONE') {
      return false;
    }

    // Partial payment with THRESHOLD policy
    if (
      paymentStatus === PAYMENT_STATUS.PARTIAL &&
      policy === 'THRESHOLD' &&
      paidPercent !== undefined
    ) {
      return paidPercent >= thresholdPercent;
    }

    // Partial payment with PRO_RATA policy
    // Create licenses proportional to paid amount
    if (paymentStatus === PAYMENT_STATUS.PARTIAL && policy === 'PRO_RATA') {
      return true;
    }

    return false;
  }

  /**
   * Calculate number of licenses allowed based on payment
   * Used for PRO_RATA partial payment policy
   *
   * @param paidAmount - Amount paid
   * @param unitPrice - Price per license
   * @param maxLicenses - Maximum licenses ordered
   */
  calculateAllowedLicenses(
    paidAmount: number,
    unitPrice: number,
    maxLicenses: number,
  ): number {
    if (unitPrice <= 0) {
      return maxLicenses;
    }

    const allowedByPayment = Math.floor(
      MoneyUtils.divideSafe(paidAmount, unitPrice).toNumber(),
    );

    return Math.min(allowedByPayment, maxLicenses);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Calculate total paid amount from confirmed payments
   */
  private calculatePaidAmount(
    confirmedPayments: ConfirmedPaymentData[],
  ): number {
    return confirmedPayments.reduce((sum, payment) => {
      // Effective amount = amount - refunded
      const effectiveAmount = MoneyUtils.subtract(
        payment.amount,
        payment.refundedAmount ?? 0,
      ).toNumber();

      return MoneyUtils.add(sum, Math.max(0, effectiveAmount)).toNumber();
    }, 0);
  }

  /**
   * Determine payment status based on amounts
   */
  private determinePaymentStatus(
    paidAmount: number,
    remainingAmount: number,
  ): PAYMENT_STATUS {
    // Overpaid: remaining is negative
    if (remainingAmount < 0) {
      return PAYMENT_STATUS.OVERPAID;
    }

    // Paid in full: remaining is zero
    if (remainingAmount === 0 && paidAmount > 0) {
      return PAYMENT_STATUS.PAID;
    }

    // Partial: some payment made
    if (paidAmount > 0) {
      return PAYMENT_STATUS.PARTIAL;
    }

    // Pending: no payment yet
    return PAYMENT_STATUS.PENDING;
  }

  /**
   * Calculate paid percentage
   */
  private calculatePaidPercent(
    paidAmount: number,
    totalAmount: number,
  ): number {
    if (totalAmount <= 0) {
      return paidAmount > 0 ? 100 : 0;
    }

    const percent = MoneyUtils.multiply(
      MoneyUtils.divideSafe(paidAmount, totalAmount).toNumber(),
      100,
    ).toNumber();

    // Round to 2 decimal places
    return MoneyUtils.round(percent, 2).toNumber();
  }
}
