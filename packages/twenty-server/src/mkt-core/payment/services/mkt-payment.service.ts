import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import compact from 'lodash.compact';

import {
  ActorMetadata,
  FieldActorSource,
} from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { OrderConfirmUtilsService } from 'src/mkt-core/order/services/core/order-confirm-utils.service';
import { MKT_TEMPLATE } from 'src/mkt-core/order/constants/mkt-template.constant';
import { ORDER_METADATA } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { paymentConfig } from 'src/mkt-core/payment/config';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/workspace-entities/mkt-payment-method.workspace-entity';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import {
  PaymentQrResult,
  RequestSepayJWT,
} from 'src/mkt-core/payment/types/payment.type';
import {
  CreatePaymentInputDto,
  UpdatePaymentInputDto,
} from 'src/mkt-core/payment/dto/payment.input';
import {
  CreatePaymentResponseDto,
  PaymentResponseDto,
  UpdatePaymentResponseDto,
} from 'src/mkt-core/payment/dto/payment.output';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';
import { PaymentCurrency, PaymentStatus } from 'src/mkt-core/payment/types';
import { MktWorkspaceMemberRepository } from 'src/mkt-core/workspace-member/repositories';

const SEPAY_QR_METHOD_NAME = 'SEPay QR';
const DEFAULT_CURRENCY = 'VND';
const PAYMENT_NAME_DISCOUNT = 'discount';

type PaymentMethodMeta = NonNullable<ORDER_METADATA['paymentMethods']>[number];

type PaymentCreatedBy = {
  source: string | null;
  workspaceMemberId: string | null;
  name: string | null;
  context?: Record<string, unknown>;
};

type CreatePaymentData = {
  paymentName: string;
  totalAmount: number;
  currency: string;
  generatedOrderCode: string | null;
  orderId: string;
  workspaceId: string | null;
  createdBy?: PaymentCreatedBy;
  discount?: number | null;
};

/**
 * MktPaymentService - Core payment operations
 *
 * This service handles:
 * - Payment CRUD operations
 * - Payment creation from orders
 * - QR code generation logic
 *
 * For webhook processing, see MktPaymentWebhookService
 */
@Injectable()
export class MktPaymentService {
  private readonly logger = new Logger(MktPaymentService.name);
  public discount = 0;

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
    private readonly orderConfirmUtilsService: OrderConfirmUtilsService,
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktPaymentMethodRepository: MktPaymentMethodRepository,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly mktWorkspaceMemberRepository: MktWorkspaceMemberRepository,
  ) {}

  // ============================================
  // ORDER PAYMENT CREATION
  // ============================================

  async createPaymentFromOrder(
    paymentData: CreatePaymentData,
    paymentMethodsMeta: ORDER_METADATA['paymentMethods'] | null,
  ): Promise<PaymentQrResult> {
    const result: PaymentQrResult = {
      orderCode: paymentData.generatedOrderCode,
      QRCodeUrl: null,
    };

    const validMethods = this.extractValidPaymentMethods(paymentMethodsMeta);

    if (validMethods.length === 0) {
      return result;
    }

    const pmById = await this.fetchPaymentMethodsMap(
      validMethods,
      paymentData.workspaceId,
    );
    const payments = await this.buildPaymentsFromMeta(
      paymentData,
      paymentMethodsMeta ?? [],
      pmById,
      result,
    );

    if (payments.length > 0 && paymentData.workspaceId) {
      const paymentRepository = await this.getPaymentRepository(
        paymentData.workspaceId,
      );

      await paymentRepository.save(payments as MktPaymentWorkspaceEntity[]);
    }

    return result;
  }

  /**
   * Extract valid payment method IDs from meta
   */
  private extractValidPaymentMethods(
    paymentMethodsMeta: ORDER_METADATA['paymentMethods'] | null,
  ): string[] {
    if (!Array.isArray(paymentMethodsMeta) || paymentMethodsMeta.length === 0) {
      return [];
    }

    return compact(paymentMethodsMeta.map((p) => p.mktPaymentMethodId));
  }

  /**
   * Fetch payment methods and create ID->Entity map
   */
  private async fetchPaymentMethodsMap(
    pmIds: string[],
    workspaceId: string | null,
  ): Promise<Map<string, MktPaymentMethodWorkspaceEntity>> {
    if (!workspaceId) {
      return new Map();
    }

    const paymentMethodRepository =
      await this.getPaymentMethodRepository(workspaceId);
    const methods = await paymentMethodRepository.find({
      where: pmIds.map((id) => ({ id })) as unknown as { id: string },
    });

    return new Map(
      methods.map((m: MktPaymentMethodWorkspaceEntity) => [m.id, m]),
    );
  }

  /**
   * Build payment entities from metadata
   */
  private async buildPaymentsFromMeta(
    paymentData: CreatePaymentData,
    paymentMethodsMeta: PaymentMethodMeta[],
    pmById: Map<string, MktPaymentMethodWorkspaceEntity>,
    result: PaymentQrResult,
  ): Promise<Partial<MktPaymentWorkspaceEntity>[]> {
    if (!paymentData.workspaceId) {
      return [];
    }

    const paymentRepository = await this.getPaymentRepository(
      paymentData.workspaceId,
    );

    const paymentPromises = paymentMethodsMeta.map((meta) =>
      this.buildSinglePayment(
        paymentData,
        meta,
        pmById,
        paymentRepository,
        result,
      ),
    );

    const payments = await Promise.all(paymentPromises);

    return compact(payments);
  }

  /**
   * Build a single payment entity from metadata
   */
  private async buildSinglePayment(
    paymentData: CreatePaymentData,
    meta: PaymentMethodMeta,
    pmById: Map<string, MktPaymentMethodWorkspaceEntity>,
    paymentRepository: Awaited<ReturnType<typeof this.getPaymentRepository>>,
    result: PaymentQrResult,
  ): Promise<Partial<MktPaymentWorkspaceEntity> | null> {
    const paymentMethod = pmById.get(meta.mktPaymentMethodId);

    if (!paymentMethod) {
      return null;
    }

    const { amount, name } = this.calculatePaymentAmountAndName(
      paymentData,
      meta,
      paymentMethod,
    );

    const { qrCodeUrl, expiredAt } =
      await this.orderConfirmUtilsService.generateSepayQrCodeUrl(
        paymentMethod,
        amount,
        paymentData.generatedOrderCode,
      );

    // Set first QR code URL as primary
    if (!result.QRCodeUrl) {
      result.QRCodeUrl = qrCodeUrl;
    }

    const payment = paymentRepository.create({
      mktOrderId: paymentData.orderId,
      mktPaymentMethodId: meta.mktPaymentMethodId,
      name,
      amount,
      currency: paymentData.currency || DEFAULT_CURRENCY,
      qrCodeUrl: qrCodeUrl || undefined,
      duration: meta.duration || null,
      expiredAt: expiredAt || null,
      paymentPageUrl: `${this.config.urls.serverUrl}${this.config.urls.paymentPagePath}/${paymentData.generatedOrderCode}`,
      mktTemplateId: MKT_TEMPLATE.SEPAY,
    } as Partial<MktPaymentWorkspaceEntity>);

    if (paymentData.createdBy) {
      return {
        ...payment,
        createdBy: paymentData.createdBy as unknown as ActorMetadata,
      };
    }

    return payment;
  }

  /**
   * Calculate payment amount and name based on discount flag
   */
  private calculatePaymentAmountAndName(
    paymentData: CreatePaymentData,
    meta: PaymentMethodMeta,
    paymentMethod: MktPaymentMethodWorkspaceEntity,
  ): { amount: number; name: string } {
    const isDiscount =
      meta.name === PAYMENT_NAME_DISCOUNT && paymentData.discount;

    if (isDiscount) {
      return {
        amount: paymentData.discount ?? 0,
        name: `Thanh toán trước - ${paymentMethod.name} - ${paymentData.paymentName}`,
      };
    }

    return {
      amount: paymentData.totalAmount || 0,
      name: `Thanh toán - ${paymentMethod.name} - ${paymentData.paymentName}`,
    };
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findOneByOrderCode(orderCode: string) {
    return this.mktOrderRepository.findByOrderCode(orderCode);
  }

  /**
   * Find payment by SePay transaction ID
   */
  async findBySepayTransactionId(
    sepayTransactionId: number,
  ): Promise<MktPaymentWorkspaceEntity | null> {
    return this.mktPaymentRepository.findBySepayTransactionId(
      String(sepayTransactionId),
    );
  }

  async findPaymentsByOrderId(
    orderId: string,
  ): Promise<MktPaymentWorkspaceEntity[]> {
    return this.mktPaymentRepository.findByOrderId(orderId);
  }

  // ============================================
  // UPDATE METHODS
  // ============================================

  async updatePaymentById(
    paymentId: string,
    updateData: Partial<MktPaymentWorkspaceEntity>,
    authContext: RequestSepayJWT,
  ): Promise<void> {
    let createdByName = 'system';

    if (authContext.workspaceMemberId) {
      const workspaceMember = await this.mktWorkspaceMemberRepository.findById(
        authContext.workspaceMemberId,
      );

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

    await this.mktPaymentRepository.updatePayment(paymentId, {
      ...updateData,
      createdBy,
    });
  }

  // ============================================
  // REPOSITORY ACCESSORS
  // ============================================

  async getPaymentRepository(workspaceId: string) {
    return this.mktPaymentRepository.getRepository(workspaceId);
  }

  async getPaymentMethodRepository(workspaceId: string) {
    return this.mktPaymentMethodRepository.getRepository(workspaceId);
  }

  // ============================================
  // MUTATION METHODS (GraphQL)
  // ============================================

  /**
   * Create a new payment via GraphQL mutation
   */
  async createPaymentMutation(
    input: CreatePaymentInputDto,
  ): Promise<CreatePaymentResponseDto> {
    try {
      // Prepare payment data from order
      const preparedData =
        await this.mktPaymentPrepareService.prepareCreatePayment({
          mktOrderId: input.mktOrderId,
          mktPaymentMethodId: input.mktPaymentMethodId,
          name: input.name,
          amount: input.amount,
          currency: input.currency as PaymentCurrency | undefined,
          description: input.description,
          invoiceId: input.invoiceId,
          mktTemplateId: input.mktTemplateId,
        });

      // Create payment using repository
      const payment = await this.mktPaymentRepository.createPayment({
        name: preparedData.name ?? 'Payment',
        amount: preparedData.amount ?? 0,
        currency: preparedData.currency,
        mktOrderId: preparedData.mktOrderId,
        mktPaymentMethodId: preparedData.mktPaymentMethodId,
        description: preparedData.description,
        invoiceId: preparedData.invoiceId,
        mktTemplateId: preparedData.mktTemplateId,
      });

      this.logger.log(
        `Created payment ${payment.id} for order ${input.mktOrderId}`,
      );

      return {
        success: true,
        message: 'Payment created successfully',
        payment: this.mapToPaymentResponse(payment),
      };
    } catch (error) {
      this.logger.error('Error creating payment:', error);

      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to create payment',
      };
    }
  }

  /**
   * Update a payment via GraphQL mutation
   */
  async updatePaymentMutation(
    input: UpdatePaymentInputDto,
  ): Promise<UpdatePaymentResponseDto> {
    try {
      // Get current payment
      const currentPayment =
        await this.mktPaymentRepository.findByIdWithRelations(input.paymentId);

      if (!currentPayment) {
        return {
          success: false,
          message: `Payment not found with id: ${input.paymentId}`,
        };
      }

      // Build update data
      const updateData: Partial<MktPaymentWorkspaceEntity> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.amount !== undefined) updateData.amount = input.amount;
      if (input.currency !== undefined) {
        updateData.currency = input.currency as PaymentCurrency;
      }
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.status !== undefined)
        updateData.status = input.status as PaymentStatus;
      if (input.paymentDate !== undefined)
        updateData.paymentDate = input.paymentDate;
      if (input.mktPaymentMethodId !== undefined) {
        updateData.mktPaymentMethodId = input.mktPaymentMethodId;
      }

      // Handle QR code logic
      const qrCodeResult = await this.handleQrCodeLogic(currentPayment, input);

      if (qrCodeResult.qrCodeUrl !== undefined) {
        updateData.qrCodeUrl = qrCodeResult.qrCodeUrl;
      }

      // Update payment
      await this.mktPaymentRepository.updatePayment(
        input.paymentId,
        updateData,
      );

      // Fetch updated payment
      const updatedPayment = await this.mktPaymentRepository.findById(
        input.paymentId,
      );

      this.logger.log(`Updated payment ${input.paymentId}`);

      return {
        success: true,
        message: 'Payment updated successfully',
        payment: updatedPayment
          ? this.mapToPaymentResponse(updatedPayment)
          : undefined,
      };
    } catch (error) {
      this.logger.error('Error updating payment:', error);

      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to update payment',
      };
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Handle QR code generation logic for payment updates
   */
  private async handleQrCodeLogic(
    currentPayment: MktPaymentWorkspaceEntity,
    input: UpdatePaymentInputDto,
  ): Promise<{ qrCodeUrl?: string }> {
    const result: { qrCodeUrl?: string } = {};

    try {
      const newPaymentMethodId = input.mktPaymentMethodId;
      const currentPaymentMethodId = currentPayment.mktPaymentMethodId;

      // Case 1: Payment method is being changed
      if (newPaymentMethodId && newPaymentMethodId !== currentPaymentMethodId) {
        const newPaymentMethod =
          await this.mktPaymentMethodRepository.findById(newPaymentMethodId);

        if (newPaymentMethod) {
          if (newPaymentMethod.name === SEPAY_QR_METHOD_NAME) {
            // Switching to SEPay QR - generate QR code
            const qrResult =
              await this.mktPaymentPrepareService._draftSepayQrCodeUrl(
                newPaymentMethod,
                input.amount ?? currentPayment.amount,
                currentPayment.mktOrder?.orderCode,
              );

            if (qrResult.qrCodeUrl) {
              result.qrCodeUrl = qrResult.qrCodeUrl;
              this.logger.log(
                `Generated SEPay QR code URL for payment method change`,
              );
            }
          } else {
            // Switching from SEPay QR - clear QR code
            result.qrCodeUrl = '';
            this.logger.log(
              'Cleared QR code URL for non-SEPay QR payment method',
            );
          }
        }

        return result;
      }

      // Case 2: Amount is being changed for existing SEPay QR payment
      const currentPaymentMethod = currentPayment.mktPaymentMethod;

      if (
        currentPaymentMethod?.name === SEPAY_QR_METHOD_NAME &&
        input.amount !== undefined &&
        input.amount !== currentPayment.amount
      ) {
        const qrResult =
          await this.mktPaymentPrepareService._draftSepayQrCodeUrl(
            currentPaymentMethod,
            input.amount,
            currentPayment.mktOrder?.orderCode,
          );

        if (qrResult.qrCodeUrl) {
          result.qrCodeUrl = qrResult.qrCodeUrl;
          this.logger.log(`Regenerated SEPay QR code URL for amount change`);
        }
      }
    } catch (error) {
      this.logger.error('Error handling QR code logic:', error);
      // Don't throw - QR code generation failure shouldn't block payment update
    }

    return result;
  }

  /**
   * Map payment entity to response DTO
   */
  private mapToPaymentResponse(
    payment: MktPaymentWorkspaceEntity,
  ): PaymentResponseDto {
    return {
      id: payment.id,
      name: payment.name,
      amount: payment.amount ?? 0,
      currency: payment.currency ?? 'VND',
      status: payment.status ?? 'PENDING',
      qrCodeUrl: payment.qrCodeUrl ?? undefined,
      paymentPageUrl: payment.paymentPageUrl ?? undefined,
      expiredAt: payment.expiredAt ?? undefined,
      mktOrderId: payment.mktOrderId ?? undefined,
      mktPaymentMethodId: payment.mktPaymentMethodId ?? undefined,
    };
  }
}
