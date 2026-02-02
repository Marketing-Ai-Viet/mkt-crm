/**
 * Matching Strategy Interface
 *
 * Defines the contract for payment matching strategies.
 * Implements Strategy Pattern for different matching algorithms.
 */

import { MatchType } from 'src/mkt-core/payment/domain/value-objects';

// ============================================
// TYPES
// ============================================

/**
 * Match result from a strategy
 */
export type MatchResult = {
  /** Whether a match was found */
  matched: boolean;
  /** Matched order ID */
  orderId?: string;
  /** Matched order code */
  orderCode?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Type of matching used */
  matchType: MatchType;
  /** Additional details */
  details?: Record<string, unknown>;
};

/**
 * Context for matching
 */
export type MatchContext = {
  /** Provider transaction ID */
  transactionId: string;
  /** Transaction amount */
  amount: number;
  /** Bank account number */
  accountNumber: string;
  /** Sub-account/VA number (if available) */
  subAccount?: string;
  /** Transaction content/description */
  content?: string;
  /** Order code from webhook (if available) */
  code?: string;
  /** Payment gateway */
  gateway: string;
  /** Transaction date */
  transactionDate: string;
  /** Reference code */
  referenceCode?: string;
};

// ============================================
// INTERFACE
// ============================================

/**
 * Matching strategy interface
 *
 * Each strategy implements a specific matching algorithm:
 * - VAMatchingStrategy: Match by Virtual Account number
 * - CodeMatchingStrategy: Match by order code in webhook
 * - FuzzyMatchingStrategy: Fuzzy match by content similarity
 */
export type IMatchingStrategy = {
  /** Strategy name */
  readonly name: string;

  /** Priority (lower = higher priority) */
  readonly priority: number;

  /**
   * Check if strategy can handle this context
   * @param context - Match context
   * @returns true if strategy can attempt to match
   */
  canHandle(context: MatchContext): boolean;

  /**
   * Execute matching
   * @param context - Match context
   * @returns Match result
   */
  match(context: MatchContext): Promise<MatchResult>;
};

/**
 * Factory function type for creating match result
 */
export const createMatchResult = (
  partial: Partial<MatchResult> & { matchType: MatchType },
): MatchResult => ({
  matched: false,
  confidence: 0,
  ...partial,
});

/**
 * No match result factory
 */
export const createNoMatchResult = (
  matchType: MatchType,
  reason: string,
): MatchResult => ({
  matched: false,
  confidence: 0,
  matchType,
  details: { reason },
});
