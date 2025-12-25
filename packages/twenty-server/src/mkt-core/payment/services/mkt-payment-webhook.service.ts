import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import {
  ActorMetadata,
  FieldActorSource,
} from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { RequestSepayJWT } from 'src/mkt-core/payment/constants/payment.type';
import { SEPAY_WEBHOOK_MESSAGES } from 'src/mkt-core/payment/constants/sepay.constants';
import { WebhookLogStatus } from 'src/mkt-core/payment/objects/mkt-webhook-log.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import {
  MktPaymentRepository,
  MktWebhookLogRepository,
} from 'src/mkt-core/payment/repositories';
import {
  SepayWebhookPayload,
  SepayWebhookResponse,
} from 'src/mkt-core/payment/types';
import { MKT_PAYMENT_STATUS } from 'src/mkt-core/seeder/constants/mkt-payment-data-seeds.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

/**
 * MktPaymentWebhookService - Handles webhook payment processing
 *
 * This service is responsible for:
 * - Processing SePay webhook payments
 * - Managing webhook logs
 * - Transaction management for payment updates
 */
@Injectable()
export class MktPaymentWebhookService {
  private readonly logger = new Logger(MktPaymentWebhookService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktWebhookLogRepository: MktWebhookLogRepository,
    private readonly mktRepo: MktRepositoryService,
  ) {}

  /**
   * Process SePay webhook payment with database transaction
   *
   * This method wraps all payment processing operations in a single transaction:
   * 1. Log webhook to WebhookLog entity
   * 2. Find order and payment
   * 3. Validate amount
   * 4. Update payment status
   * 5. Commit or rollback
   */
  async processWebhookPayment(
    workspaceId: string,
    payload: SepayWebhookPayload,
    authContext: RequestSepayJWT,
    ipAddress?: string,
  ): Promise<SepayWebhookResponse> {
    const startTime = DateTimeUtils.now();

    // Get DataSource and create QueryRunner for transaction
    const dataSource =
      await this.twentyORMGlobalManager.getDataSourceForWorkspace({
        workspaceId,
      });

    const queryRunner: QueryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Create initial webhook log
    let webhookLogId: string | null = null;

    try {
      // Step 1: Create webhook log entry
      webhookLogId = await this.createWebhookLog(queryRunner, workspaceId, {
        sepayTransactionId: payload.id,
        gateway: payload.gateway,
        requestBody: payload as unknown as object,
        ipAddress,
        status: 'PROCESSING',
      });

      // Step 2: Idempotency check
      const existingPayment = await this.findBySepayTransactionId(
        workspaceId,
        payload.id,
      );

      if (existingPayment) {
        this.logger.log(
          `Transaction ${payload.id} already processed, skipping`,
        );
        await this.updateWebhookLogStatus(
          queryRunner,
          webhookLogId,
          'SUCCESS',
          {
            responseStatus: 200,
            responseBody: { status: 'ALREADY_PROCESSED' },
            matchedOrderCode: existingPayment.mktOrderId,
          },
        );
        await queryRunner.commitTransaction();

        return {
          success: true,
          message: SEPAY_WEBHOOK_MESSAGES.ALREADY_PROCESSED,
          data: { transactionId: payload.id, status: 'ALREADY_PROCESSED' },
        };
      }

      // Step 3: Validate code
      if (!payload.code) {
        this.logger.warn('Webhook payload has no code');
        await this.updateWebhookLogStatus(
          queryRunner,
          webhookLogId,
          'SUCCESS',
          {
            responseStatus: 200,
            responseBody: { status: 'UNMATCHED' },
          },
        );
        await queryRunner.commitTransaction();

        return {
          success: true,
          message: SEPAY_WEBHOOK_MESSAGES.ORDER_NOT_FOUND,
          data: { transactionId: payload.id, status: 'UNMATCHED' },
        };
      }

      // Step 4: Find order
      const order = await this.findOneByOrderCode(workspaceId, payload.code);

      if (!order) {
        this.logger.error(`Order not found for code: ${payload.code}`);
        await this.updateWebhookLogStatus(
          queryRunner,
          webhookLogId,
          'SUCCESS',
          {
            responseStatus: 200,
            responseBody: { status: 'UNMATCHED' },
          },
        );
        await queryRunner.commitTransaction();

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
          `Amount mismatch for order ${payload.code}: expected ${expectedAmount}, received ${receivedAmount}`,
        );
      }

      // Step 6: Find payments
      const payments = await this.findPaymentsByOrderId(workspaceId, order.id);

      if (payments.length === 0) {
        this.logger.warn(`No payments found for order ${order.id}`);
        await this.updateWebhookLogStatus(
          queryRunner,
          webhookLogId,
          'SUCCESS',
          {
            responseStatus: 200,
            responseBody: { status: 'NO_PAYMENT' },
            matchedOrderCode: order.orderCode,
          },
        );
        await queryRunner.commitTransaction();

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

      // Step 7: Update payment with transaction
      const [primaryPayment] = payments;

      await this.updatePaymentWithRunner(
        queryRunner,
        workspaceId,
        primaryPayment.id,
        {
          status: MKT_PAYMENT_STATUS.COMPLETED,
          paymentDate: payload.transactionDate,
          amount: payload.transferAmount,
          description: payload.content || payload.description,
          sepayTransactionId: String(payload.id),
        },
        authContext,
      );

      // Step 8: Update order status to CONFIRMED after payment
      await this.updateOrderStatusAfterPayment(queryRunner, order.id);
      this.logger.log(`Order ${order.orderCode} status updated to CONFIRMED`);

      // Step 9: Update webhook log as success
      const processingTimeMs = DateTimeUtils.diffInMillis(
        startTime,
        DateTimeUtils.now(),
      );

      await this.updateWebhookLogStatus(queryRunner, webhookLogId, 'SUCCESS', {
        responseStatus: 200,
        responseBody: { status: 'MATCHED' },
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
        message: SEPAY_WEBHOOK_MESSAGES.SUCCESS,
        data: {
          transactionId: payload.id,
          matchedOrder: order.orderCode,
          status: 'MATCHED',
        },
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      this.logger.error('Error processing webhook payment:', error);

      // Try to update webhook log status to failed
      if (webhookLogId) {
        try {
          const errorQueryRunner = dataSource.createQueryRunner();

          await errorQueryRunner.connect();
          await this.updateWebhookLogStatus(
            errorQueryRunner,
            webhookLogId,
            'FAILED',
            {
              responseStatus: 500,
              errorMessage:
                error instanceof Error ? error.message : 'Unknown error',
            },
          );
          await errorQueryRunner.release();
        } catch (logError) {
          this.logger.error('Failed to update webhook log status:', logError);
        }
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================
  // WEBHOOK LOG METHODS
  // ============================================

  /**
   * Create webhook log entry within transaction
   */
  private async createWebhookLog(
    queryRunner: QueryRunner,
    workspaceId: string,
    data: {
      sepayTransactionId: number;
      gateway: string;
      requestBody: object;
      ipAddress?: string;
      status: WebhookLogStatus;
    },
  ): Promise<string> {
    const webhookLog = await this.mktWebhookLogRepository.create(
      workspaceId,
      {
        sepayTransactionId: data.sepayTransactionId,
        gateway: data.gateway,
        requestBody: data.requestBody,
        ipAddress: data.ipAddress,
        status: data.status,
      },
      queryRunner,
    );

    return webhookLog.id;
  }

  /**
   * Update webhook log status within transaction
   */
  private async updateWebhookLogStatus(
    queryRunner: QueryRunner,
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
    await queryRunner.manager.update(
      'mktWebhookLog',
      { id: webhookLogId },
      {
        status,
        ...data,
      },
    );
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Find payment by SePay transaction ID
   */
  private async findBySepayTransactionId(
    workspaceId: string,
    sepayTransactionId: number,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    return this.mktPaymentRepository.findBySepayTransactionId(
      workspaceId,
      String(sepayTransactionId),
    );
  }

  /**
   * Find order by code
   */
  private async findOneByOrderCode(
    workspaceId: string,
    orderCode: string,
  ): Promise<{ id: string; orderCode: string; totalAmount?: number } | null> {
    const orderRepo =
      await this.mktRepo.getOrderRepositoryByWorkspaceId(workspaceId);

    return orderRepo.findOne({
      where: { orderCode },
    });
  }

  /**
   * Find payments by order ID
   */
  private async findPaymentsByOrderId(
    workspaceId: string,
    orderId: string,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    return this.mktPaymentRepository.findByOrderId(workspaceId, orderId);
  }

  // ============================================
  // UPDATE METHODS WITH TRANSACTION
  // ============================================

  /**
   * Update payment by ID using QueryRunner (within transaction)
   */
  private async updatePaymentWithRunner(
    queryRunner: QueryRunner,
    workspaceId: string,
    paymentId: string,
    updateData: Partial<MktPaymentWorkspaceEntity>,
    authContext: RequestSepayJWT,
  ): Promise<void> {
    const workspaceMemberRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
      );

    let createdByName = 'system';

    if (authContext.workspaceMemberId) {
      const workspaceMember = await workspaceMemberRepository.findOne({
        where: { id: authContext.workspaceMemberId },
      });

      if (workspaceMember) {
        createdByName = `${workspaceMember.name.firstName} ${workspaceMember.name.lastName}`;
      }
    }

    const createdBy: ActorMetadata = {
      source: FieldActorSource.MANUAL,
      workspaceMemberId: authContext.workspaceMemberId || null,
      name: createdByName,
      context: {},
    };

    await queryRunner.manager.update(
      MktPaymentWorkspaceEntity,
      { id: paymentId },
      { ...updateData, createdBy },
    );
  }

  /**
   * Update order status to CONFIRMED after payment is completed
   */
  private async updateOrderStatusAfterPayment(
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
}
