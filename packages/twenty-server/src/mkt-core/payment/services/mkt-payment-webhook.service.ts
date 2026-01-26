import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import {
  ActorMetadata,
  FieldActorSource,
} from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { TransactionScopeService } from 'src/mkt-core/common/transaction';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { orderCodeConfig, paymentConfig } from 'src/mkt-core/payment/config';
import { SEPAY_WEBHOOK_MESSAGES } from 'src/mkt-core/payment/constants/sepay.constants';
import { WebhookLogStatus } from 'src/mkt-core/payment/objects/mkt-webhook-log.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import {
  MktPaymentRepository,
  MktWebhookLogRepository,
} from 'src/mkt-core/payment/repositories';
import {
  PaymentStatus,
  SepayWebhookPayload,
  SepayWebhookResponse,
} from 'src/mkt-core/payment/types';
import { RequestSepayJWT } from 'src/mkt-core/payment/types/payment.type';
import { orderCodeExtractor } from 'src/mkt-core/payment/utils';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';

/**
 * MktPaymentWebhookService - Handles webhook payment processing
 *
 * This service is responsible for:
 * - Processing SePay webhook payments
 * - Managing webhook logs
 * - Payment and order status updates
 *
 * Transaction Support:
 * All payment processing operations are wrapped in a database transaction
 * to ensure data consistency. If any step fails, all changes are rolled back.
 */
@Injectable()
export class MktPaymentWebhookService {
  private readonly logger = new Logger(MktPaymentWebhookService.name);

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
    @Inject(orderCodeConfig.KEY)
    private readonly orderCodeCfg: ConfigType<typeof orderCodeConfig>,
    private readonly transactionScopeService: TransactionScopeService,
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktWebhookLogRepository: MktWebhookLogRepository,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly mktWorkspaceMemberRepository: MktWorkspaceMemberRepository,
  ) {}

  /**
   * Process SePay webhook payment
   *
   * Flow:
   * 1. Log webhook to WebhookLog entity
   * 2. Idempotency check by transaction ID
   * 3. Find order and payment
   * 4. Validate amount
   * 5. Update payment status
   * 6. Update order status
   *
   * All operations are wrapped in a database transaction for consistency.
   */
  async processWebhookPayment(
    payload: SepayWebhookPayload,
    authContext: RequestSepayJWT,
    ipAddress?: string,
  ): Promise<SepayWebhookResponse> {
    const startTime = DateTimeUtils.now();
    const workspaceId = this.config.sepay.workspaceId;

    this.logger.log({
      message: 'Processing webhook payment',
      transactionId: payload.id,
      code: payload.code,
      amount: payload.transferAmount,
      ipAddress,
    });

    // Execute all operations within a transaction
    return this.transactionScopeService.runInTransaction(
      workspaceId,
      async () => {
        // Step 1: Create webhook log entry
        const webhookLog = await this.createWebhookLog({
          sepayTransactionId: payload.id,
          gateway: payload.gateway,
          requestBody: payload as unknown as object,
          ipAddress,
          status: 'PROCESSING',
        });

        try {
          // Step 2: Idempotency check
          const existingPayment = await this.findBySepayTransactionId(
            payload.id,
          );

          if (existingPayment) {
            this.logger.log(
              `Transaction ${payload.id} already processed, skipping`,
            );
            await this.updateWebhookLogStatus(webhookLog.id, 'SUCCESS', {
              responseStatus: 200,
              responseBody: { status: 'ALREADY_PROCESSED' },
              matchedOrderCode: existingPayment.mktOrderId,
            });

            return {
              success: true,
              message: SEPAY_WEBHOOK_MESSAGES.ALREADY_PROCESSED,
              data: { transactionId: payload.id, status: 'ALREADY_PROCESSED' },
            };
          }

          // Step 3: Get order code - prioritize `code` field, fallback to content parsing
          let orderCode = payload.code;

          if (!orderCode && this.orderCodeCfg.enableContentParsing) {
            this.logger.log(
              'Code field is null, attempting to extract from content',
            );
            orderCode = orderCodeExtractor.extract(payload.content);

            if (orderCode) {
              this.logger.log({
                message: 'Extracted order code from content',
                extractedCode: orderCode,
                content: payload.content,
              });
            } else {
              this.logger.warn({
                message: 'Could not extract order code from content',
                content: payload.content,
              });
            }
          }

          if (!orderCode) {
            this.logger.warn('No order code found in payload');
            await this.updateWebhookLogStatus(webhookLog.id, 'SUCCESS', {
              responseStatus: 200,
              responseBody: { status: 'UNMATCHED' },
            });

            return {
              success: true,
              message: SEPAY_WEBHOOK_MESSAGES.ORDER_NOT_FOUND,
              data: { transactionId: payload.id, status: 'UNMATCHED' },
            };
          }

          // Step 4: Find order
          const order = await this.findOneByOrderCode(orderCode);

          if (!order) {
            this.logger.error(`Order not found for code: ${orderCode}`);
            await this.updateWebhookLogStatus(webhookLog.id, 'SUCCESS', {
              responseStatus: 200,
              responseBody: { status: 'UNMATCHED', searchedCode: orderCode },
            });

            return {
              success: true,
              message: SEPAY_WEBHOOK_MESSAGES.ORDER_NOT_FOUND,
              data: { transactionId: payload.id, status: 'UNMATCHED' },
            };
          }

          // Step 5: Amount validation
          const expectedAmount = order.totalAmount || 0;
          const receivedAmount = payload.transferAmount || 0;

          if (!MoneyUtils.equals(receivedAmount, expectedAmount)) {
            this.logger.warn(
              `Amount mismatch for order ${orderCode}: expected ${expectedAmount}, received ${receivedAmount}`,
            );
          }

          // Step 6: Find payments
          const payments = await this.findPaymentsByOrderId(order.id);

          if (payments.length === 0) {
            this.logger.warn(`No payments found for order ${order.id}`);
            await this.updateWebhookLogStatus(webhookLog.id, 'SUCCESS', {
              responseStatus: 200,
              responseBody: { status: 'NO_PAYMENT' },
              matchedOrderCode: order.orderCode,
            });

            return {
              success: true,
              message: SEPAY_WEBHOOK_MESSAGES.NO_PAYMENT,
              data: {
                transactionId: payload.id,
                matchedOrder: order.orderCode,
                status: 'NO_PAYMENT',
              },
            };
          }

          // Step 7: Update payment
          const [primaryPayment] = payments;

          await this.updatePayment(primaryPayment.id, {
            status: 'COMPLETED',
            paymentDate: payload.transactionDate,
            amount: payload.transferAmount,
            description: payload.content || payload.description,
            sepayTransactionId: String(payload.id),
            createdBy: await this.buildActorMetadata(authContext),
          });

          // Step 8: Update order status to CONFIRMED after payment
          await this.updateOrderStatusAfterPayment(order.id);
          this.logger.log(
            `Order ${order.orderCode} status updated to CONFIRMED`,
          );

          // Step 9: Update webhook log as success
          const processingTimeMs = DateTimeUtils.diffInMillis(
            startTime,
            DateTimeUtils.now(),
          );

          await this.updateWebhookLogStatus(webhookLog.id, 'SUCCESS', {
            responseStatus: 200,
            responseBody: { status: 'MATCHED' },
            matchedOrderCode: order.orderCode,
            processingTimeMs,
          });

          this.logger.log({
            message: 'Payment completed successfully',
            paymentId: primaryPayment.id,
            orderCode: order.orderCode,
            processingTimeMs,
          });

          return {
            success: true,
            message: SEPAY_WEBHOOK_MESSAGES.SUCCESS,
            data: {
              transactionId: payload.id,
              matchedOrder: order.orderCode,
              status: 'MATCHED',
            },
          };
        } catch (error) {
          this.logger.error({
            message: 'Error processing webhook payment',
            transactionId: payload.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Update webhook log status to failed
          await this.updateWebhookLogStatus(webhookLog.id, 'FAILED', {
            responseStatus: 500,
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          });

          throw error;
        }
      },
      {
        timeoutMs: 30000, // 30 second timeout
      },
    );
  }

  // ============================================
  // WEBHOOK LOG METHODS
  // ============================================

  /**
   * Create webhook log entry
   */
  private async createWebhookLog(data: {
    sepayTransactionId: number;
    gateway: string;
    requestBody: object;
    ipAddress?: string;
    status: WebhookLogStatus;
  }) {
    return this.mktWebhookLogRepository.createWebhookLog({
      sepayTransactionId: data.sepayTransactionId,
      gateway: data.gateway,
      requestBody: data.requestBody,
      ipAddress: data.ipAddress,
      status: data.status,
    });
  }

  /**
   * Update webhook log status
   */
  private async updateWebhookLogStatus(
    webhookLogId: string,
    status: WebhookLogStatus,
    data?: {
      responseStatus?: number;
      responseBody?: object;
      matchedOrderCode?: string;
      processingTimeMs?: number;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.mktWebhookLogRepository.updateStatus(webhookLogId, status, data);
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Find payment by SePay transaction ID
   */
  private async findBySepayTransactionId(
    sepayTransactionId: number,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    return this.mktPaymentRepository.findBySepayTransactionId(
      String(sepayTransactionId),
    );
  }

  /**
   * Find order by code
   */
  private async findOneByOrderCode(
    orderCode: string,
  ): Promise<{ id: string; orderCode: string; totalAmount?: number } | null> {
    return this.mktOrderRepository.findByOrderCode(orderCode);
  }

  /**
   * Find payments by order ID
   */
  private async findPaymentsByOrderId(
    orderId: string,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    return this.mktPaymentRepository.findByOrderId(orderId);
  }

  // ============================================
  // UPDATE METHODS
  // ============================================

  /**
   * Build actor metadata from auth context
   */
  private async buildActorMetadata(
    authContext: RequestSepayJWT,
  ): Promise<ActorMetadata> {
    let createdByName = 'system';

    if (authContext.workspaceMemberId) {
      const workspaceMember = await this.mktWorkspaceMemberRepository.findById(
        authContext.workspaceMemberId,
      );

      if (workspaceMember) {
        createdByName = `${workspaceMember.name.firstName} ${workspaceMember.name.lastName}`;
      }
    }

    return {
      source: FieldActorSource.MANUAL,
      workspaceMemberId: authContext.workspaceMemberId || null,
      name: createdByName,
      context: {},
    };
  }

  /**
   * Update payment by ID using repository
   */
  private async updatePayment(
    paymentId: string,
    updateData: {
      status: PaymentStatus;
      paymentDate?: string;
      amount?: number;
      description?: string;
      sepayTransactionId: string;
      createdBy: ActorMetadata;
    },
  ): Promise<void> {
    await this.mktPaymentRepository.updatePayment(paymentId, updateData);
  }

  /**
   * Update order status to CONFIRMED after payment is completed
   */
  private async updateOrderStatusAfterPayment(orderId: string): Promise<void> {
    await this.mktOrderRepository.updateOrder(orderId, {
      status: ORDER_STATUS.CONFIRMED,
      accountingConfirmed: true,
    });
  }
}
