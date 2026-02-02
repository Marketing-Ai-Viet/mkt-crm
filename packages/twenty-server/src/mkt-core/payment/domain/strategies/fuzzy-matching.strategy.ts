/**
 * Fuzzy Matching Strategy
 *
 * Matches payments using fuzzy logic when exact matching fails.
 * Lowest priority, used as fallback.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  IMatchingStrategy,
  MatchContext,
  MatchResult,
  createMatchResult,
  createNoMatchResult,
  IOrderRepositoryPort,
  ORDER_REPOSITORY_PORT_TOKEN,
  OrderForMatching,
} from 'src/mkt-core/payment/domain/ports';
import {
  MATCH_TYPE,
  MATCH_CONFIDENCE,
} from 'src/mkt-core/payment/domain/value-objects';

// ============================================
// CONFIG
// ============================================

export type FuzzyMatchConfig = {
  /** Threshold for auto-matching */
  autoMatchThreshold: number;
  /** Threshold for suggesting manual review */
  suggestThreshold: number;
  /** Days to look back for candidates */
  candidateDays: number;
  /** Amount tolerance percentage (0-1) */
  amountTolerancePercent: number;
};

export const DEFAULT_FUZZY_CONFIG: FuzzyMatchConfig = {
  autoMatchThreshold: MATCH_CONFIDENCE.FUZZY_AUTO,
  suggestThreshold: MATCH_CONFIDENCE.FUZZY_SUGGEST,
  candidateDays: 7,
  amountTolerancePercent: 0.5,
};

export const FUZZY_CONFIG_TOKEN = Symbol('FuzzyMatchConfig');

// ============================================
// STRATEGY
// ============================================

@Injectable()
export class FuzzyMatchingStrategy implements IMatchingStrategy {
  readonly name = 'FUZZY_MATCHING';
  readonly priority = 3; // Lowest priority

  private readonly logger = new Logger(FuzzyMatchingStrategy.name);
  private readonly config: FuzzyMatchConfig;

  constructor(
    @Inject(ORDER_REPOSITORY_PORT_TOKEN)
    private readonly orderRepository: IOrderRepositoryPort,
    @Inject(FUZZY_CONFIG_TOKEN)
    config?: FuzzyMatchConfig,
  ) {
    this.config = config ?? DEFAULT_FUZZY_CONFIG;
  }

  /**
   * Always can try fuzzy matching as fallback
   */
  canHandle(context: MatchContext): boolean {
    return !!context.content || !!context.amount;
  }

  /**
   * Fuzzy match by content similarity and amount
   */
  async match(context: MatchContext): Promise<MatchResult> {
    this.logger.debug('Attempting fuzzy match');

    // Get candidate orders
    const candidates = await this.orderRepository.findCandidates({
      status: 'PENDING',
      createdWithinDays: this.config.candidateDays,
      amountRange: {
        min: context.amount * (1 - this.config.amountTolerancePercent),
        max: context.amount * (1 + this.config.amountTolerancePercent),
      },
      limit: 10,
    });

    if (candidates.length === 0) {
      this.logger.debug('No candidates found for fuzzy matching');

      return createNoMatchResult(MATCH_TYPE.FUZZY, 'NO_CANDIDATES');
    }

    // Calculate similarity scores
    const scored = candidates.map((order) => ({
      order,
      score: this.calculateScore(order, context),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    this.logger.debug(
      `Best fuzzy match: ${best.order.orderCode} (score: ${best.score.toFixed(2)})`,
    );

    // Auto-match if above threshold
    if (best.score >= this.config.autoMatchThreshold) {
      this.logger.log(
        `Fuzzy auto-match: ${best.order.orderCode} (score: ${best.score.toFixed(2)})`,
      );

      return createMatchResult({
        matched: true,
        orderId: best.order.id,
        orderCode: best.order.orderCode,
        confidence: best.score,
        matchType: MATCH_TYPE.FUZZY,
        details: {
          scores: scored.slice(0, 3).map((s) => ({
            orderCode: s.order.orderCode,
            score: s.score,
          })),
        },
      });
    }

    // Suggest for manual review if above suggest threshold
    if (best.score >= this.config.suggestThreshold) {
      this.logger.log(
        `Fuzzy suggest: ${best.order.orderCode} (score: ${best.score.toFixed(2)})`,
      );

      return createMatchResult({
        matched: false,
        confidence: best.score,
        matchType: MATCH_TYPE.FUZZY,
        details: {
          requiresManualReview: true,
          suggestion: {
            orderId: best.order.id,
            orderCode: best.order.orderCode,
            score: best.score,
          },
          scores: scored.slice(0, 3).map((s) => ({
            orderCode: s.order.orderCode,
            score: s.score,
          })),
        },
      });
    }

    return createMatchResult({
      matched: false,
      confidence: best.score,
      matchType: MATCH_TYPE.FUZZY,
      details: {
        reason: 'BELOW_THRESHOLD',
        bestScore: best.score,
      },
    });
  }

  /**
   * Calculate match score for an order
   *
   * Weights:
   * - Amount similarity: 40%
   * - Content similarity: 30%
   * - Time proximity: 20%
   * - Base score: 10%
   */
  private calculateScore(
    order: OrderForMatching,
    context: MatchContext,
  ): number {
    let score = 0;

    // Amount similarity (40% weight)
    const amountScore = this.calculateAmountScore(
      order.totalAmount,
      context.amount,
    );

    score += amountScore * 0.4;

    // Content similarity (30% weight)
    if (context.content) {
      const contentScore = this.calculateContentScore(
        context.content,
        order.orderCode,
        order.customerName,
      );

      score += contentScore * 0.3;
    } else {
      // No content, redistribute weight to amount
      score += amountScore * 0.15;
    }

    // Time proximity (20% weight)
    const timeScore = this.calculateTimeScore(order.createdAt);

    score += timeScore * 0.2;

    // Base score (10% weight)
    score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Calculate amount similarity score
   */
  private calculateAmountScore(expected: number, received: number): number {
    if (expected === 0) {
      return 0;
    }

    const diff = Math.abs(expected - received);
    const ratio = diff / expected;

    // Perfect match = 1, 50% diff = 0
    return Math.max(0, 1 - ratio * 2);
  }

  /**
   * Calculate content similarity score using Levenshtein distance
   */
  private calculateContentScore(
    content: string,
    orderCode: string,
    customerName?: string,
  ): number {
    const normalized = content.toUpperCase();
    const normalizedCode = orderCode.toUpperCase();

    // Exact order code in content = perfect match
    if (normalized.includes(normalizedCode)) {
      return 1;
    }

    // Calculate Levenshtein similarity
    const distance = this.levenshteinDistance(normalized, normalizedCode);
    const maxLen = Math.max(normalized.length, normalizedCode.length);
    const similarity = 1 - distance / maxLen;

    // Customer name match bonus
    if (customerName && normalized.includes(customerName.toUpperCase())) {
      return Math.min(1, similarity + 0.2);
    }

    return similarity;
  }

  /**
   * Calculate time proximity score
   * More recent = higher score
   */
  private calculateTimeScore(createdAt: Date): number {
    const now = DateTimeUtils.now();
    const created = DateTimeUtils.fromDate(createdAt);
    const hoursAgo = DateTimeUtils.diffInHours(created, now);

    // 168 hours = 7 days
    // 0 hours ago = 1.0, 168 hours ago = 0
    return Math.max(0, 1 - hoursAgo / 168);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    return matrix[b.length][a.length];
  }
}
