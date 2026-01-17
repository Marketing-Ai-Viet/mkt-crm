/**
 * SePay Webhook Handler
 *
 * Implementation of IWebhookHandler for SePay payment webhooks.
 * Handles webhook validation, parsing, and payment processing.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { QueryRunner } from 'typeorm';

import {
  IWebhookHandler,
  NormalizedWebhookPayload,
  WebhookContext,
  WebhookProcessResult,
  WebhookValidationRequest,
  WebhookValidationResult,
} from 'src/mkt-core/payment/types/webhook-handler.interface';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { SEPAY_WEBHOOK_MESSAGES } from 'src/mkt-core/payment/constants/sepay.constants';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { sepayConfig } from 'src/mkt-core/payment/providers/sepay/sepay.config';
import { SepayWebhookPayload } from 'src/mkt-core/payment/providers/sepay/sepay.types';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories/mkt-payment.repository';
import { MktWebhookLogRepository } from 'src/mkt-core/payment/repositories/mkt-webhook-log.repository';
import { PAYMENT_PROVIDER_TYPE } from 'src/mkt-core/payment/types/provider.types';
import { MKT_PAYMENT_STATUS } from 'src/mkt-core/seeder/constants/mkt-payment-data-seeds.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

// ============================================
// CONSTANTS
// ============================================

const AUTHORIZATION_PREFIX = 'Apikey ';

// ============================================
// WEBHOOK HANDLER IMPLEMENTATION
// ============================================

@Injectable()
export class SepayWebhookHandler implements IWebhookHandler {
  readonly providerType = PAYMENT_PROVIDER_TYPE.SEPAY_QR;
  private readonly logger = new Logger(SepayWebhookHandler.name);

  constructor(
    @Inject(sepayConfig.KEY)
    private readonly config: ConfigType<typeof sepayConfig>,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly paymentRepository: MktPaymentRepository,
    private readonly webhookLogRepository: MktWebhookLogRepository,
    private readonly orderRepository: MktOrderRepository,
  ) {}

  /**
   * Validate SePay webhook using API key
   */
  async validateWebhook(
    request: WebhookValidationRequest,
  ): Promise<WebhookValidationResult> {
    // If auth is disabled, skip validation
    if (!this.config.authEnabled) {
      return { valid: true };
    }

    const authorization = request.headers['authorization'];

    if (!authorization) {
      return { valid: false, errorMessage: 'Missing Authorization header' };
    }

    // Handle array headers
    const authHeader = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    // SePay uses "Apikey {key}" format
    if (!authHeader?.startsWith(AUTHORIZATION_PREFIX)) {
      return { valid: false, errorMessage: 'Invalid Authorization format' };
    }

    const apiKey = authHeader.substring(AUTHORIZATION_PREFIX.length).trim();

    if (apiKey !== this.config.webhookApiKey) {
      return { valid: false, errorMessage: 'Invalid API key' };
    }

    return { valid: true };
  }

  /**
   * Parse and normalize SePay webhook payload
   */
  async parseWebhookPayload(
    rawPayload: unknown,
  ): Promise<NormalizedWebhookPayload> {
    const payload = rawPayload as SepayWebhookPayload;

    return {
      providerTransactionId: String(payload.id),
      orderCode: payload.code ?? null,
      amount: payload.transferAmount,
      transactionType: payload.transferType === 'in' ? 'CREDIT' : 'DEBIT',
      status: 'SUCCESS', // SePay only sends successful transactions
      transactionDate: payload.transactionDate,
      gateway: payload.gateway,
      accountNumber: payload.accountNumber,
      content: payload.content,
      referenceCode: payload.referenceCode,
      rawPayload: payload,
    };
  }

  /**
   * Check for duplicate webhook using transaction ID in payment records
   */
  async isDuplicateWebhook(transactionId: string): Promise<boolean> {
    return this.paymentRepository.existsByTransactionId(transactionId);
  }

  /**
   * Process SePay webhook with full transaction support
   */
  async processWebhook(
    payload: NormalizedWebhookPayload,
    context: WebhookContext,
  ): Promise<WebhookProcessResult> {
    const startTime = DateTimeUtils.now();

    this.logger.log(
      `Processing SePay webhook: ${payload.providerTransactionId}`,
    );

    // Get DataSource and create QueryRunner for transaction
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId: context.workspaceId,
      });

    const queryRunner: QueryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    let webhookLogId: string | null = null;

    try {
      // Step 1: Create webhook log
      webhookLogId = await this.createWebhookLog(payload, context.ipAddress);

      // Step 2: Idempotency check
      if (await this.isDuplicateWebhook(payload.providerTransactionId)) {
        await this.updateWebhookLogSuccess(webhookLogId, 'ALREADY_PROCESSED');
        await queryRunner.commitTransaction();

        return this.buildResult(
          true,
          'ALREADY_PROCESSED',
          SEPAY_WEBHOOK_MESSAGES.ALREADY_PROCESSED,
          startTime,
        );
      }

      // Step 3: Validate order code exists
      if (!payload.orderCode) {
        await this.updateWebhookLogSuccess(webhookLogId, 'UNMATCHED');
        await queryRunner.commitTransaction();

        return this.buildResult(
          true,
          'UNMATCHED',
          SEPAY_WEBHOOK_MESSAGES.ORDER_NOT_FOUND,
          startTime,
        );
      }

      // Step 4: Find order
      const order = await this.orderRepository.findByOrderCode(
        payload.orderCode,
      );

      if (!order) {
        await this.updateWebhookLogSuccess(webhookLogId, 'ORDER_NOT_FOUND');
        await queryRunner.commitTransaction();

        return this.buildResult(
          true,
          'ORDER_NOT_FOUND',
          `${SEPAY_WEBHOOK_MESSAGES.ORDER_NOT_FOUND}: ${payload.orderCode}`,
          startTime,
        );
      }

      // Step 5: Validate amount (log warning if mismatch)
      this.validateAmount(order.totalAmount, payload.amount, payload.orderCode);

      // Step 6: Find payments for order
      const payments = await this.paymentRepository.findByOrderId(order.id);

      if (payments.length === 0) {
        await this.updateWebhookLogSuccess(
          webhookLogId,
          'NO_PAYMENT',
          order.orderCode,
        );
        await queryRunner.commitTransaction();

        return this.buildResult(
          true,
          'NO_PAYMENT',
          SEPAY_WEBHOOK_MESSAGES.NO_PAYMENT,
          startTime,
          order.id,
          order.orderCode,
        );
      }

      // Step 7: Update payment with transaction
      const [primaryPayment] = payments;

      await this.updatePayment(queryRunner, primaryPayment.id, payload);

      // Step 8: Update order status
      await this.updateOrderStatus(queryRunner, order.id);

      // Step 9: Update webhook log as success
      const processingTimeMs = DateTimeUtils.diffInMillis(
        startTime,
        DateTimeUtils.now(),
      );

      await this.webhookLogRepository.updateWebhookLog(webhookLogId, {
        status: 'SUCCESS',
        responseStatus: 200,
        matchedOrderCode: order.orderCode,
        processingTimeMs,
      });

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(
        `Payment ${primaryPayment.id} completed for order ${order.orderCode}`,
      );

      return {
        success: true,
        status: 'MATCHED',
        matchedOrderId: order.id,
        matchedOrderCode: order.orderCode,
        paymentId: primaryPayment.id,
        message: SEPAY_WEBHOOK_MESSAGES.SUCCESS,
        processingTimeMs,
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error('Error processing webhook:', error);

      // Update webhook log to failed (outside transaction)
      if (webhookLogId) {
        await this.updateWebhookLogFailed(webhookLogId, error);
      }

      return this.buildResult(
        false,
        'FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        startTime,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private async createWebhookLog(
    payload: NormalizedWebhookPayload,
    ipAddress: string | undefined,
  ): Promise<string> {
    const webhookLog = await this.webhookLogRepository.createWebhookLog({
      sepayTransactionId: Number(payload.providerTransactionId),
      gateway: payload.gateway,
      requestBody: payload.rawPayload as object,
      ipAddress,
      status: 'PROCESSING',
    });

    return webhookLog.id;
  }

  private async updateWebhookLogSuccess(
    webhookLogId: string,
    status: string,
    orderCode?: string,
  ): Promise<void> {
    await this.webhookLogRepository.updateWebhookLog(webhookLogId, {
      status: 'SUCCESS',
      responseStatus: 200,
      responseBody: { status },
      matchedOrderCode: orderCode,
    });
  }

  private async updateWebhookLogFailed(
    webhookLogId: string,
    error: unknown,
  ): Promise<void> {
    try {
      await this.webhookLogRepository.updateWebhookLog(webhookLogId, {
        status: 'FAILED',
        responseStatus: 500,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      this.logger.error('Failed to update webhook log status:', logError);
    }
  }

  private validateAmount(
    expectedAmount: number | undefined,
    receivedAmount: number,
    orderCode: string,
  ): void {
    const expected = expectedAmount ?? 0;

    if (!MoneyUtils.equals(receivedAmount, expected)) {
      this.logger.warn(
        `Amount mismatch for order ${orderCode}: expected ${expected}, received ${receivedAmount}`,
      );
    }
  }

  private async updatePayment(
    queryRunner: QueryRunner,
    paymentId: string,
    payload: NormalizedWebhookPayload,
  ): Promise<void> {
    await queryRunner.manager.update(
      MktPaymentWorkspaceEntity,
      { id: paymentId },
      {
        status: MKT_PAYMENT_STATUS.COMPLETED,
        paymentDate: payload.transactionDate,
        amount: payload.amount,
        description: payload.content,
        sepayTransactionId: payload.providerTransactionId,
      },
    );
  }

  private async updateOrderStatus(
    queryRunner: QueryRunner,
    orderId: string,
  ): Promise<void> {
    await queryRunner.manager.update(
      MktOrderWorkspaceEntity,
      { id: orderId },
      {
        status: ORDER_STATUS.CONFIRMED,
        accountingConfirmed: true,
      },
    );
  }

  private buildResult(
    success: boolean,
    status: WebhookProcessResult['status'],
    message: string,
    startTime: ReturnType<typeof DateTimeUtils.now>,
    matchedOrderId?: string,
    matchedOrderCode?: string,
  ): WebhookProcessResult {
    return {
      success,
      status,
      message,
      matchedOrderId,
      matchedOrderCode,
      processingTimeMs: DateTimeUtils.diffInMillis(
        startTime,
        DateTimeUtils.now(),
      ),
    };
  }
}
