import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

// ============================================
// TYPES
// ============================================

/**
 * Payment amount analysis status
 */
export type PaymentAmountStatus = 'EXACT' | 'UNDERPAID' | 'OVERPAID';

/**
 * Payment amount analysis result
 */
export type PaymentAmountResult = {
  /** Analysis status */
  status: PaymentAmountStatus;
  /** Expected total amount */
  expectedAmount: number;
  /** Amount received in current transaction */
  receivedAmount: number;
  /** Total paid amount including previous payments */
  totalPaidAmount: number;
  /** Remaining amount to be paid */
  remainingAmount: number;
  /** Amount overpaid (for refund) */
  overpaidAmount: number;
  /** Percentage of total paid (0-100) */
  percentagePaid: number;
};

/**
 * Payment status mapping
 */
export const PAYMENT_STATUS_MAP = {
  EXACT: 'COMPLETED',
  UNDERPAID: 'PARTIAL',
  OVERPAID: 'OVERPAID',
} as const;

/**
 * Order status mapping based on payment
 */
export const ORDER_STATUS_MAP = {
  EXACT: 'CONFIRMED',
  UNDERPAID: 'PENDING',
  OVERPAID: 'CONFIRMED',
} as const;

// ============================================
// PAYMENT AMOUNT ANALYZER
// ============================================

/**
 * PaymentAmountAnalyzer - Analyzes payment amounts for partial payment support
 *
 * Handles:
 * - Exact payment: receivedAmount === expectedAmount
 * - Underpayment: receivedAmount < expectedAmount
 * - Overpayment: receivedAmount > expectedAmount
 * - Multiple payments: accumulates previouslyPaidAmount
 *
 * @example
 * ```typescript
 * // Analyze single payment
 * const result = paymentAmountAnalyzer.analyze(100000, 50000);
 * // Returns: { status: 'UNDERPAID', remainingAmount: 50000, ... }
 *
 * // Analyze with previous payments
 * const result = paymentAmountAnalyzer.analyze(100000, 50000, 30000);
 * // totalPaidAmount = 80000 (50000 + 30000)
 * ```
 */
export class PaymentAmountAnalyzer {
  /**
   * Analyze payment amount against expected amount
   *
   * @param expectedAmount - Total expected payment amount
   * @param receivedAmount - Amount received in current transaction
   * @param previouslyPaidAmount - Sum of previous completed payments (default: 0)
   * @returns Payment amount analysis result
   */
  analyze(
    expectedAmount: number,
    receivedAmount: number,
    previouslyPaidAmount = 0,
  ): PaymentAmountResult {
    // Calculate total paid including previous payments
    const totalPaid = MoneyUtils.add(
      previouslyPaidAmount,
      receivedAmount,
    ).toNumber();

    // Calculate remaining amount
    const remaining = MoneyUtils.subtract(expectedAmount, totalPaid).toNumber();

    // Calculate overpaid amount (only if remaining is negative)
    const overpaid = remaining < 0 ? Math.abs(remaining) : 0;

    // Calculate percentage paid (capped at 100%)
    const percentagePaid = Math.min(
      100,
      MoneyUtils.divideSafe(totalPaid, expectedAmount)
        .multipliedBy(100)
        .toNumber(),
    );

    // Determine status
    const status = this.determineStatus(totalPaid, expectedAmount);

    return {
      status,
      expectedAmount,
      receivedAmount,
      totalPaidAmount: totalPaid,
      remainingAmount: Math.max(0, remaining),
      overpaidAmount: overpaid,
      percentagePaid,
    };
  }

  /**
   * Determine payment status based on analysis result
   *
   * @param result - Payment amount analysis result
   * @returns Payment status string
   */
  determinePaymentStatus(
    result: PaymentAmountResult,
  ): (typeof PAYMENT_STATUS_MAP)[PaymentAmountStatus] {
    return PAYMENT_STATUS_MAP[result.status];
  }

  /**
   * Determine order status based on payment analysis
   *
   * @param result - Payment amount analysis result
   * @returns Order status string
   */
  determineOrderStatus(
    result: PaymentAmountResult,
  ): (typeof ORDER_STATUS_MAP)[PaymentAmountStatus] {
    return ORDER_STATUS_MAP[result.status];
  }

  /**
   * Check if payment should auto-confirm based on threshold
   *
   * @param result - Payment amount analysis result
   * @param threshold - Percentage threshold for auto-confirm (0-100, default: 100)
   * @returns true if payment percentage meets or exceeds threshold
   */
  shouldAutoConfirm(result: PaymentAmountResult, threshold = 100): boolean {
    return result.percentagePaid >= threshold;
  }

  /**
   * Determine status based on amounts
   */
  private determineStatus(
    totalPaid: number,
    expectedAmount: number,
  ): PaymentAmountStatus {
    if (MoneyUtils.equals(totalPaid, expectedAmount)) {
      return 'EXACT';
    }

    if (MoneyUtils.compare(totalPaid, expectedAmount) < 0) {
      return 'UNDERPAID';
    }

    return 'OVERPAID';
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

/**
 * Singleton instance for common use
 */
export const paymentAmountAnalyzer = new PaymentAmountAnalyzer();
