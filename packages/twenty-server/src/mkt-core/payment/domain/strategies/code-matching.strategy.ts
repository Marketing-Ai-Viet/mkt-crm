/**
 * Code Matching Strategy
 *
 * Matches payments using order code from webhook or content.
 * Second priority after VA matching.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';

import {
  IMatchingStrategy,
  MatchContext,
  MatchResult,
  createMatchResult,
  createNoMatchResult,
  IOrderRepositoryPort,
  ORDER_REPOSITORY_PORT_TOKEN,
} from 'src/mkt-core/payment/domain/ports';
import {
  MATCH_TYPE,
  MATCH_CONFIDENCE,
} from 'src/mkt-core/payment/domain/value-objects';
import { OrderCodeExtractor } from 'src/mkt-core/payment/utils/order-code-extractor';

@Injectable()
export class CodeMatchingStrategy implements IMatchingStrategy {
  readonly name = 'CODE_MATCHING';
  readonly priority = 2;

  private readonly logger = new Logger(CodeMatchingStrategy.name);
  private readonly orderCodeExtractor: OrderCodeExtractor;

  constructor(
    @Inject(ORDER_REPOSITORY_PORT_TOKEN)
    private readonly orderRepository: IOrderRepositoryPort,
  ) {
    this.orderCodeExtractor = new OrderCodeExtractor();
  }

  /**
   * Can handle if code or content contains order code pattern
   */
  canHandle(context: MatchContext): boolean {
    // Can handle if there's a code field or content
    if (context.code) {
      return true;
    }

    if (context.content) {
      // Check if content might contain an order code
      return this.orderCodeExtractor.isValidOrderCode(
        this.orderCodeExtractor.extract(context.content),
      );
    }

    return false;
  }

  /**
   * Match by order code
   */
  async match(context: MatchContext): Promise<MatchResult> {
    // Priority 1: Use code field directly
    let orderCode: string | null | undefined = context.code;
    let source: 'code_field' | 'content' = 'code_field';

    // Priority 2: Extract from content
    if (!orderCode && context.content) {
      orderCode = this.orderCodeExtractor.extract(context.content);
      source = 'content';

      if (orderCode) {
        this.logger.debug(`Extracted order code from content: ${orderCode}`);
      }
    }

    if (!orderCode) {
      return createNoMatchResult(MATCH_TYPE.EXACT_CODE, 'NO_CODE_FOUND');
    }

    this.logger.debug(`Attempting code match for: ${orderCode}`);

    const order = await this.orderRepository.findByOrderCode(orderCode);

    if (!order) {
      this.logger.debug(`Order not found for code: ${orderCode}`);

      return createMatchResult({
        matched: false,
        confidence: 0.5, // Code found but order doesn't exist
        matchType: MATCH_TYPE.EXACT_CODE,
        details: {
          reason: 'ORDER_NOT_FOUND',
          extractedCode: orderCode,
          source,
        },
      });
    }

    // Determine confidence based on source
    const confidence =
      source === 'code_field'
        ? MATCH_CONFIDENCE.EXACT_CODE_FIELD
        : MATCH_CONFIDENCE.EXACT_CODE_CONTENT;

    this.logger.log(
      `Code matched successfully: ${orderCode} -> ${order.id} (source: ${source})`,
    );

    return createMatchResult({
      matched: true,
      orderId: order.id,
      orderCode: order.orderCode,
      confidence,
      matchType: MATCH_TYPE.EXACT_CODE,
      details: {
        extractedCode: orderCode,
        source,
        expectedAmount: order.totalAmount,
      },
    });
  }
}
