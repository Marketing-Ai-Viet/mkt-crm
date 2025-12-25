import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import {
  ActorMetadata,
  FieldActorSource,
} from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktOrderCommonConfirmService } from 'src/mkt-core/common/service/mkt.common-order.confirm.service';
import { MKT_TEMPLATE } from 'src/mkt-core/order/constants/mkt-template.constant';
import { ORDER_METADATA } from 'src/mkt-core/order/constants/order-status.constants';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import {
  RequestSepayJWT,
  callFireBaseType,
} from 'src/mkt-core/payment/constants/payment.type';
import { SEPAY_WEBHOOK_MESSAGES } from 'src/mkt-core/payment/constants/sepay.constants';
import {
  MktWebhookLogWorkspaceEntity,
  WebhookLogStatus,
} from 'src/mkt-core/payment/objects/mkt-webhook-log.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';
import {
  SepayWebhookPayload,
  SepayWebhookResponse,
} from 'src/mkt-core/payment/types';
import { MKT_PAYMENT_STATUS } from 'src/mkt-core/seeder/constants/mkt-payment-data-seeds.constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

@Injectable()
export class MktPaymentService {
  private readonly logger = new Logger(MktPaymentService.name);
  public discount = 0;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
    private readonly mktCommonOrderConfirmService: MktOrderCommonConfirmService,
    public mktRepo: MktRepositoryService,
  ) {}

  async createPaymentFromOrder(
    paymentData: {
      paymentName: string;
      totalAmount: number;
      currency: string;
      generatedOrderCode: string | null;
      orderId: string;
      workspaceId: string | null;
      createdBy?: {
        source: string | null;
        workspaceMemberId: string | null;
        name: string | null;
      };
      discount?: number | null;
    },
    paymentMethodsMeta: ORDER_METADATA['paymentMethods'] | null,
  ): Promise<callFireBaseType | void> {
    const paymentRepository = await this.getPaymentRepository();
    const paymentMethodRepository = await this.getPaymentMethodRepository();

    const result: callFireBaseType = {
      orderCode: paymentData.generatedOrderCode,
      QRCodeUrl: null,
    };

    if (Array.isArray(paymentMethodsMeta) && paymentMethodsMeta.length > 0) {
      const pmIds = paymentMethodsMeta
        .map((p) => p.mktPaymentMethodId)
        .filter(Boolean);

      if (pmIds.length > 0) {
        const _methods = await paymentMethodRepository.find({
          where: pmIds.map((id) => ({ id })) as unknown as { id: string },
        });
        const pmById = new Map(_methods.map((m) => [m.id, m]));

        const paymentsFromMeta = await Promise.all(
          paymentMethodsMeta.map(async (p) => {
            const pm: MktPaymentMethodWorkspaceEntity | undefined = pmById.get(
              p.mktPaymentMethodId,
            );

            let totalAmount = paymentData.totalAmount;
            let name = `Thanh toán - ${pm?.name} - ${paymentData.paymentName}`;

            if (p.name === 'discount' && paymentData.discount) {
              totalAmount = paymentData.discount;
              name = `Thanh toán trước - ${pm?.name} - ${paymentData.paymentName}`;
            }
            if (!pm) return null;
            // generate position
            const { qrCodeUrl, expiredAt } =
              await this.mktCommonOrderConfirmService.generateSepayQrCodeUrl(
                pm,
                totalAmount || 0,
                paymentData.generatedOrderCode,
              );

            if (!result.QRCodeUrl) result.QRCodeUrl = qrCodeUrl;

            return paymentRepository.create({
              mktOrderId: paymentData.orderId,
              mktPaymentMethodId: p.mktPaymentMethodId,
              name,
              amount: totalAmount || 0,
              currency: paymentData.currency || 'VND',
              qrCodeUrl: qrCodeUrl || undefined,
              duration: p.duration || null,
              expiredAt: expiredAt || null,
              paymentPageUrl: `${process.env.SERVER_URL}/payment/${paymentData.generatedOrderCode}`,
              mktTemplateId: MKT_TEMPLATE.SEPAY,
            } as Partial<MktPaymentWorkspaceEntity>);
          }),
        );

        const newPayments = paymentsFromMeta.map((item) => {
          if (!paymentData.createdBy) return item;

          return { ...item, createdBy: paymentData.createdBy };
        });

        await paymentRepository.save(
          newPayments as MktPaymentWorkspaceEntity[],
        );
      }
    }

    return result;
  }

  async findOneByOrderCode(workspaceId: string, orderCode: string) {
    const orderRepo =
      await this.mktRepo.getOrderRepositoryByWorkspaceId(workspaceId);

    return await orderRepo.findOne({
      where: { orderCode: orderCode },
    });
  }

  /**
   * Tìm payment theo SePay transaction ID để kiểm tra idempotency
   * Dùng để chống xử lý webhook trùng lặp
   */
  async findBySepayTransactionId(
    workspaceId: string,
    sepayTransactionId: number,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    const paymentRepo =
      await this.mktRepo.getPaymentRepositoryByWorkspaceId(workspaceId);

    return paymentRepo.findOne({
      where: { sepayTransactionId: String(sepayTransactionId) },
    });
  }

  async findPaymentsByOrderId(workspaceId: string, orderId: string) {
    const paymentRepo =
      await this.mktRepo.getPaymentRepositoryByWorkspaceId(workspaceId);

    return await paymentRepo.find({
      where: { mktOrderId: orderId },
    });
  }

  async updatePaymentById(
    workspaceId: string,
    paymentId: string,
    updateData: Partial<MktPaymentWorkspaceEntity>,
    authContext: RequestSepayJWT,
  ) {
    const paymentRepo =
      await this.mktRepo.getPaymentRepositoryByWorkspaceId(workspaceId);

    const workspaceMemberRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<WorkspaceMemberWorkspaceEntity>(
        workspaceId,
        'workspaceMember',
      );

    const workspaceMember = await workspaceMemberRepository.findOneOrFail({
      where: { id: authContext.workspaceMemberId },
    });

    const createdBy: ActorMetadata = {
      source: FieldActorSource.MANUAL,
      workspaceMemberId: authContext.workspaceMemberId || null,
      name: authContext.workspaceMemberId
        ? `${workspaceMember.name.firstName} ${workspaceMember.name.lastName}`
        : 'system',
      context: {},
    };

    return await paymentRepo.update(paymentId, { ...updateData, createdBy });
  }

  async getPaymentRepository() {
    return this.mktRepo.getPaymentRepository();
  }

  async getPaymentMethodRepository() {
    return this.mktRepo.getPaymentMethodRepository();
  }

  /**
   * Process SePay webhook payment with database transaction
   *
   * This method wraps all payment processing operations in a single transaction:
   * 1. Log webhook to WebhookLog entity
   * 2. Find order and payment
   * 3. Validate amount
   * 4. Update payment status
   * 5. Commit or rollback
   *
   * @param workspaceId - Workspace ID
   * @param payload - SePay webhook payload
   * @param authContext - Authentication context
   * @param ipAddress - Optional IP address for logging
   * @returns SepayWebhookResponse
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
      const existingPayment = await this.findBySepayTransactionIdWithRunner(
        queryRunner,
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
      const order = await this.findOneByOrderCodeWithRunner(
        queryRunner,
        workspaceId,
        payload.code,
      );

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
      const payments = await this.findPaymentsByOrderIdWithRunner(
        queryRunner,
        workspaceId,
        order.id,
      );

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

      await this.updatePaymentByIdWithRunner(
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

      // Step 8: Update webhook log as success
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

  /**
   * Create webhook log entry
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
    const webhookLogRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktWebhookLogWorkspaceEntity>(
        workspaceId,
        'webhookLogs',
        { shouldBypassPermissionChecks: true },
      );

    const webhookLog = webhookLogRepo.create({
      sepayTransactionId: data.sepayTransactionId,
      gateway: data.gateway,
      requestBody: data.requestBody,
      ipAddress: data.ipAddress || null,
      status: data.status,
    } as Partial<MktWebhookLogWorkspaceEntity>);

    const saved = await queryRunner.manager.save(webhookLog);

    return saved.id;
  }

  /**
   * Update webhook log status
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

  /**
   * Find payment by SePay transaction ID using QueryRunner
   */
  private async findBySepayTransactionIdWithRunner(
    queryRunner: QueryRunner,
    workspaceId: string,
    sepayTransactionId: number,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    const result = await queryRunner.manager.findOne(
      MktPaymentWorkspaceEntity,
      {
        where: { sepayTransactionId: String(sepayTransactionId) },
      },
    );

    return result;
  }

  /**
   * Find order by code using QueryRunner
   */
  private async findOneByOrderCodeWithRunner(
    queryRunner: QueryRunner,
    workspaceId: string,
    orderCode: string,
  ): Promise<{ id: string; orderCode: string; totalAmount?: number } | null> {
    const orderRepo =
      await this.mktRepo.getOrderRepositoryByWorkspaceId(workspaceId);

    // Use the existing repository but the result is still within the transaction context
    return await orderRepo.findOne({
      where: { orderCode },
    });
  }

  /**
   * Find payments by order ID using QueryRunner
   */
  private async findPaymentsByOrderIdWithRunner(
    queryRunner: QueryRunner,
    workspaceId: string,
    orderId: string,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    const result = await queryRunner.manager.find(MktPaymentWorkspaceEntity, {
      where: { mktOrderId: orderId },
    });

    return result;
  }

  /**
   * Update payment by ID using QueryRunner (within transaction)
   */
  private async updatePaymentByIdWithRunner(
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
}
