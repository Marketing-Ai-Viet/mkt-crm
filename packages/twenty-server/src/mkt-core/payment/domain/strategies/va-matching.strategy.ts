/**
 * VA Matching Strategy
 *
 * Matches payments using Virtual Account numbers.
 * Highest priority strategy with 100% confidence.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';

import {
  IMatchingStrategy,
  MatchContext,
  MatchResult,
  createMatchResult,
  createNoMatchResult,
  IVARepositoryPort,
  VA_REPOSITORY_PORT_TOKEN,
} from 'src/mkt-core/payment/domain/ports';
import {
  MATCH_TYPE,
  MATCH_CONFIDENCE,
} from 'src/mkt-core/payment/domain/value-objects';

@Injectable()
export class VAMatchingStrategy implements IMatchingStrategy {
  readonly name = 'VA_MATCHING';
  readonly priority = 1; // Highest priority

  private readonly logger = new Logger(VAMatchingStrategy.name);

  constructor(
    @Inject(VA_REPOSITORY_PORT_TOKEN)
    private readonly vaRepository: IVARepositoryPort,
  ) {}

  /**
   * Can handle if subAccount (VA number) is present
   */
  canHandle(context: MatchContext): boolean {
    return !!context.subAccount && context.subAccount.length > 0;
  }

  /**
   * Match by VA number
   */
  async match(context: MatchContext): Promise<MatchResult> {
    const vaNumber = context.subAccount;

    if (!vaNumber) {
      return createNoMatchResult(MATCH_TYPE.VA, 'NO_VA_NUMBER');
    }

    this.logger.debug(`Attempting VA match for: ${vaNumber}`);

    const va = await this.vaRepository.findByVANumber(vaNumber);

    if (!va) {
      this.logger.debug(`VA not found: ${vaNumber}`);

      return createNoMatchResult(MATCH_TYPE.VA, 'VA_NOT_FOUND');
    }

    if (!va.isActive) {
      this.logger.debug(`VA is inactive: ${vaNumber}`);

      return createNoMatchResult(MATCH_TYPE.VA, 'VA_INACTIVE');
    }

    // Check if VA has expired
    const expiresAt = new Date(va.expiresAt);
    const now = new Date();

    if (expiresAt < now) {
      this.logger.debug(`VA has expired: ${vaNumber}`);

      return createNoMatchResult(MATCH_TYPE.VA, 'VA_EXPIRED');
    }

    this.logger.log(`VA matched successfully: ${vaNumber} -> ${va.orderCode}`);

    return createMatchResult({
      matched: true,
      orderId: va.orderId,
      orderCode: va.orderCode,
      confidence: MATCH_CONFIDENCE.VA,
      matchType: MATCH_TYPE.VA,
      details: {
        vaNumber,
        expectedAmount: va.amount,
      },
    });
  }
}
