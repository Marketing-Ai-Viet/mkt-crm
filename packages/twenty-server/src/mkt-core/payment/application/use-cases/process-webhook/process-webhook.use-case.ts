/**
 * Process Webhook Use Case
 *
 * Handles the business logic for processing payment webhooks.
 * Uses CompositeMatchingStrategy for order matching.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

import { TransactionScopeService } from 'src/mkt-core/common/transaction';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { CompositeMatchingStrategy } from 'src/mkt-core/payment/domain/strategies';
import { MatchContext } from 'src/mkt-core/payment/domain/ports';
import {
  MATCH_TYPE,
  TRANSFER_TYPE,
  MatchType,
  TransferType,
} from 'src/mkt-core/payment/domain/value-objects';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { paymentAmountAnalyzer } from 'src/mkt-core/payment/utils';

import { ProcessWebhookInput } from './process-webhook.input';
import {
  ProcessWebhookOutput,
  WEBHOOK_PROCESSING_STATUS,
  MatchDetails,
  ProcessedPaymentDetails,
  createAlreadyProcessedOutput,
  createUnmatchedOutput,
  createNoPaymentOutput,
  createSuccessOutput,
  createErrorOutput,
  createManualReviewOutput,
} from './process-webhook.output';

/**
 * ProcessWebhookUseCase
 *
 * Orchestrates the payment webhook processing flow:
 * 1. Idempotency check
 * 2. Order matching (using CompositeMatchingStrategy)
 * 3. Payment validation
 * 4. Status updates
 */
@Injectable()
export class ProcessWebhookUseCase {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);

  constructor(
    private readonly transactionScopeService: TransactionScopeService,
    private readonly paymentRepository: MktPaymentRepository,
    private readonly orderRepository: MktOrderRepository,
    @Optional()
    private readonly matchingStrategy: CompositeMatchingStrategy | null,
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: ProcessWebhookInput): Promise<ProcessWebhookOutput> {
    const startTime = DateTimeUtils.now();
    const transactionId = String(input.payload.transactionId);

    this.logger.log({
      message: 'Processing webhook payment',
      transactionId,
      amount: input.payload.amount,
      providerType: input.providerType,
    });

    try {
      return await this.transactionScopeService.runInTransaction(
        input.authContext.workspaceId,
        async () => this.processWebhook(input, startTime),
        { timeoutMs: 30000 },
      );
    } catch (error) {
      this.logger.error({
        message: 'Error processing webhook',
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return createErrorOutput(
        transactionId,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Internal webhook processing logic
   */
  private async processWebhook(
    input: ProcessWebhookInput,
    startTime: ReturnType<typeof DateTimeUtils.now>,
  ): Promise<ProcessWebhookOutput> {
    const transactionId = String(input.payload.transactionId);

    // Step 1: Idempotency check
    const existingPayment =
      await this.paymentRepository.findByProviderTransactionId(transactionId);

    if (existingPayment) {
      this.logger.log(`Transaction ${transactionId} already processed`);

      return createAlreadyProcessedOutput(transactionId);
    }

    // Step 2: Match order using strategy pattern
    const matchResult = await this.matchOrder(input);

    if (!matchResult.matched) {
      if (matchResult.requiresManualReview) {
        return createManualReviewOutput(transactionId, {
          matchType: matchResult.matchType,
          confidence: matchResult.confidence,
          transferType: matchResult.transferType,
          requiresManualReview: true,
        });
      }

      return createUnmatchedOutput(transactionId, matchResult.reason);
    }

    // Step 3: Find order and payments
    if (!matchResult.orderId) {
      this.logger.error('Match result missing orderId');

      return createUnmatchedOutput(transactionId, 'Order ID not found');
    }

    const order = await this.orderRepository.findById(matchResult.orderId);

    if (!order) {
      this.logger.error(`Order not found: ${matchResult.orderId}`);

      return createUnmatchedOutput(transactionId, 'Order not found');
    }

    const payments = await this.paymentRepository.findByOrderId(order.id);

    if (payments.length === 0) {
      return createNoPaymentOutput(transactionId, order.orderCode);
    }

    // Step 4: Analyze payment amount
    const expectedAmount = order.totalAmount ?? 0;
    const receivedAmount = input.payload.amount;
    const previouslyPaidAmount = this.calculatePreviouslyPaidAmount(
      payments,
      transactionId,
    );

    const amountAnalysis = paymentAmountAnalyzer.analyze(
      expectedAmount,
      receivedAmount,
      previouslyPaidAmount,
    );

    // Step 5: Determine status
    const webhookStatus = this.getWebhookStatus(amountAnalysis.status);

    // Step 6: Build output
    const processingTimeMs = DateTimeUtils.diffInMillis(
      startTime,
      DateTimeUtils.now(),
    );

    const matchDetails: MatchDetails = {
      matchType: matchResult.matchType,
      confidence: matchResult.confidence,
      transferType: matchResult.transferType,
      orderCode: order.orderCode,
      orderId: order.id,
      vaNumber: matchResult.vaNumber,
      requiresManualReview: false,
    };

    const paymentDetails: ProcessedPaymentDetails = {
      expectedAmount: amountAnalysis.expectedAmount,
      receivedAmount: amountAnalysis.receivedAmount,
      totalPaidAmount: amountAnalysis.totalPaidAmount,
      remainingAmount: amountAnalysis.remainingAmount,
      percentagePaid: amountAnalysis.percentagePaid,
    };

    this.logger.log({
      message: `Payment matched - ${webhookStatus}`,
      orderCode: order.orderCode,
      matchType: matchResult.matchType,
      confidence: matchResult.confidence,
      processingTimeMs,
    });

    return createSuccessOutput(
      transactionId,
      webhookStatus,
      matchDetails,
      paymentDetails,
      processingTimeMs,
    );
  }

  /**
   * Match order using CompositeMatchingStrategy or fallback
   */
  private async matchOrder(
    input: ProcessWebhookInput,
  ): Promise<MatchOrderResult> {
    const transactionId = String(input.payload.transactionId);

    // If matching strategy is available, use it
    if (this.matchingStrategy) {
      const context: MatchContext = {
        transactionId,
        code: input.payload.code ?? undefined,
        content: input.payload.content ?? undefined,
        amount: input.payload.amount,
        accountNumber: '',
        gateway: input.payload.gateway,
        transactionDate: input.payload.transactionDate,
      };

      const result = await this.matchingStrategy.match(context);

      // Extract vaNumber from details if available
      const vaNumber =
        (result.details?.vaNumber as string | undefined) ?? undefined;
      const transferType =
        (result.details?.transferType as TransferType | undefined) ??
        TRANSFER_TYPE.REGULAR;
      const requiresManualReview =
        (result.details?.requiresManualReview as boolean | undefined) ?? false;
      const reason =
        (result.details?.reason as string | undefined) ?? undefined;

      return {
        matched: result.matched,
        matchType: result.matchType,
        confidence: result.confidence,
        transferType,
        orderId: result.orderId,
        orderCode: result.orderCode,
        vaNumber,
        requiresManualReview,
        reason,
      };
    }

    // Fallback: Simple code matching (legacy behavior)
    return this.fallbackMatch(input);
  }

  /**
   * Fallback matching for when CompositeMatchingStrategy is not available
   */
  private async fallbackMatch(
    input: ProcessWebhookInput,
  ): Promise<MatchOrderResult> {
    const orderCode = input.payload.code;

    if (!orderCode) {
      return {
        matched: false,
        matchType: MATCH_TYPE.MANUAL,
        confidence: 0,
        transferType: TRANSFER_TYPE.REGULAR,
        requiresManualReview: false,
        reason: 'No order code in payload',
      };
    }

    const order = await this.orderRepository.findOne({ orderCode });

    if (!order) {
      return {
        matched: false,
        matchType: MATCH_TYPE.MANUAL,
        confidence: 0,
        transferType: TRANSFER_TYPE.REGULAR,
        requiresManualReview: false,
        reason: `Order not found: ${orderCode}`,
      };
    }

    return {
      matched: true,
      matchType: MATCH_TYPE.EXACT_CODE,
      confidence: 0.95,
      transferType: TRANSFER_TYPE.REGULAR,
      orderId: order.id,
      orderCode: order.orderCode,
      requiresManualReview: false,
    };
  }

  /**
   * Calculate previously paid amount excluding current transaction
   */
  private calculatePreviouslyPaidAmount(
    payments: Array<{
      id: string;
      status?: string;
      amount?: number | null;
      providerTransactionId?: string;
    }>,
    currentTransactionId: string,
  ): number {
    return payments
      .filter(
        (p) =>
          p.status === 'COMPLETED' &&
          p.providerTransactionId !== currentTransactionId,
      )
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  /**
   * Map amount analysis status to webhook status
   */
  private getWebhookStatus(
    analysisStatus: string,
  ): (typeof WEBHOOK_PROCESSING_STATUS)[keyof typeof WEBHOOK_PROCESSING_STATUS] {
    const statusMap: Record<
      string,
      (typeof WEBHOOK_PROCESSING_STATUS)[keyof typeof WEBHOOK_PROCESSING_STATUS]
    > = {
      FULLY_PAID: WEBHOOK_PROCESSING_STATUS.FULLY_PAID,
      PARTIAL_PAYMENT: WEBHOOK_PROCESSING_STATUS.PARTIALLY_PAID,
      OVERPAYMENT: WEBHOOK_PROCESSING_STATUS.OVERPAID,
      UNDERPAYMENT: WEBHOOK_PROCESSING_STATUS.PARTIALLY_PAID,
    };

    return statusMap[analysisStatus] ?? WEBHOOK_PROCESSING_STATUS.FULLY_PAID;
  }
}

/**
 * Internal type for match result
 */
type MatchOrderResult = {
  matched: boolean;
  matchType: MatchType;
  confidence: number;
  transferType: TransferType;
  orderId?: string;
  orderCode?: string;
  vaNumber?: string;
  requiresManualReview: boolean;
  reason?: string;
};
