import { Inject, Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { ORDER_CONFIG_KEY, OrderConfig } from 'src/mkt-core/order/config';
import { OrderConfirmUtilsService } from 'src/mkt-core/order/services/core/order-confirm-utils.service';
import { MKT_TEMPLATE } from 'src/mkt-core/order/constants/mkt-template.constant';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types/order-saga.interface';
import {
  CreateOrderWithItemsInput,
  CreatePaymentStepOutput,
  OrderPaymentMethodInput,
  PaymentCreationParams,
} from 'src/mkt-core/order/types';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { DEFAULT_PAYMENT_CURRENCY } from 'src/mkt-core/payment/constants';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';
import { PaymentCurrency } from 'src/mkt-core/payment/types';
import { CreatePaymentData } from 'src/mkt-core/payment/types/repository.types';

/**
 * CreatePaymentStep - Step 4: Tạo payment records
 *
 * Thực hiện:
 * - Tạo payment records cho từng payment method
 * - Generate QR code URL cho SEPay payments
 * - Lưu payment ID và QR code URL vào context
 *
 * Compensate:
 * - Hard delete payment records đã tạo
 *
 * Note: Step này được skip cho TRIAL action (không cần thanh toán)
 */
@Injectable()
export class CreatePaymentStep extends SagaStep<
  CreateOrderWithItemsInput,
  CreatePaymentStepOutput
> {
  readonly name = 'create_payment';
  readonly description = 'Create payment records for order';

  private readonly logger = new Logger(CreatePaymentStep.name);

  constructor(
    private readonly paymentMethodRepository: MktPaymentMethodRepository,
    private readonly paymentRepository: MktPaymentRepository,
    private readonly orderConfirmUtilsService: OrderConfirmUtilsService,
    @Inject(ORDER_CONFIG_KEY)
    private readonly config: OrderConfig,
  ) {
    super();
  }

  /**
   * Determine if payment creation should be skipped
   *
   * - isDraft: Skip (draft orders don't create payments/QR codes)
   * - Otherwise: Always create payment
   *
   * Note: Trial orders are handled by TrialOrderService which doesn't require payment.
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    // Draft mode: Skip payment creation
    if (input.isDraft) {
      this.logger.debug('Skipping: Draft order - no payment creation');

      return true;
    }

    return false;
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreatePaymentStepOutput>> {
    try {
      const validationResult = this.validateInput(context, input);

      if (validationResult) return validationResult;

      this.logger.log(`Creating payments for order: ${context.orderId}`);

      const paymentMethods = input.paymentMethods ?? [];
      const paymentMethodMap = await this.getPaymentMethodMap(
        context.workspaceId,
        paymentMethods,
      );

      if (paymentMethodMap.size === 0) {
        return {
          success: false,
          error: new Error('No valid payment methods found'),
        };
      }

      const totalAmount = (context.metadata.get('totalAmount') as number) ?? 0;
      const currency = (input.currency ??
        DEFAULT_PAYMENT_CURRENCY) as PaymentCurrency;

      const { payments, primaryQrCodeUrl } = await this.createPayments(
        paymentMethods,
        paymentMethodMap,
        totalAmount,
        context,
        currency,
      );

      this.storeInContext(context, payments, primaryQrCodeUrl);

      return {
        success: true,
        data: { payments, qrCodeUrl: primaryQrCodeUrl },
      };
    } catch (error) {
      this.logger.error('Failed to create payments', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const data = context.rollbackData.get(this.name) as {
      paymentIds: string[];
    } | null;

    if (!data?.paymentIds?.length) {
      this.logger.warn('No payments to compensate');

      return;
    }

    try {
      this.logger.warn(`Hard deleting ${data.paymentIds.length} payments`);

      // Uses MktPaymentRepository for thread-safe access
      await this.paymentRepository.softDeleteMany(
        context.workspaceId,
        data.paymentIds,
      );

      this.logger.log('Payments deleted successfully');
    } catch (error) {
      this.logger.error('Failed to delete payments', error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private validateInput(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
  ): SagaStepResult<CreatePaymentStepOutput> | null {
    if (!context.orderId) {
      return {
        success: false,
        error: new Error('Order ID is required from previous step'),
      };
    }

    if (!input.paymentMethods?.length) {
      this.logger.warn(
        'No payment methods provided, skipping payment creation',
      );

      return { success: true, data: { payments: [] } };
    }

    return null;
  }

  /**
   * Get payment method map by IDs
   * Uses MktPaymentMethodRepository for thread-safe access
   */
  private async getPaymentMethodMap(
    workspaceId: string,
    paymentMethodInputs: OrderPaymentMethodInput[],
  ): Promise<Map<string, MktPaymentMethodWorkspaceEntity>> {
    const paymentMethodIds = paymentMethodInputs.map((p) => p.paymentMethodId);

    return this.paymentMethodRepository.findManyByIds(
      workspaceId,
      paymentMethodIds,
    );
  }

  /**
   * Create payments for all payment methods
   * Uses MktPaymentRepository for thread-safe access
   */
  private async createPayments(
    paymentMethodInputs: OrderPaymentMethodInput[],
    paymentMethodMap: Map<string, MktPaymentMethodWorkspaceEntity>,
    totalAmount: number,
    context: SagaContext,
    currency: PaymentCurrency,
  ): Promise<{
    payments: MktPaymentWorkspaceEntity[];
    primaryQrCodeUrl?: string;
  }> {
    const payments: MktPaymentWorkspaceEntity[] = [];
    let primaryQrCodeUrl: string | undefined;

    for (const paymentMethodInput of paymentMethodInputs) {
      const paymentMethod = paymentMethodMap.get(
        paymentMethodInput.paymentMethodId,
      );

      if (!paymentMethod) {
        this.logger.warn(
          `Payment method ${paymentMethodInput.paymentMethodId} not found, skipping`,
        );
        continue;
      }

      const savedPayment = await this.createSinglePayment({
        paymentMethodInput,
        paymentMethod,
        totalAmount,
        context,
        currency,
      });

      payments.push(savedPayment);

      if (!primaryQrCodeUrl && savedPayment.qrCodeUrl) {
        primaryQrCodeUrl = savedPayment.qrCodeUrl;
      }
    }

    this.logger.log(`Created ${payments.length} payment records`);

    return { payments, primaryQrCodeUrl };
  }

  /**
   * Create a single payment record
   * Uses MktPaymentRepository for thread-safe access
   */
  private async createSinglePayment(
    params: PaymentCreationParams,
  ): Promise<MktPaymentWorkspaceEntity> {
    const {
      paymentMethodInput,
      paymentMethod,
      totalAmount,
      context,
      currency,
    } = params;

    const { amount, paymentName } = this.calculatePaymentDetails(
      paymentMethodInput,
      paymentMethod,
      totalAmount,
      context.orderCode,
    );

    const { qrCodeUrl, expiredAt } =
      await this.orderConfirmUtilsService.generateSepayQrCodeUrl(
        paymentMethod,
        amount,
        context.orderCode ?? null,
      );

    const orderId = context.orderId ?? '';
    const paymentData = this.buildPaymentData({
      orderId,
      paymentMethodId: paymentMethodInput.paymentMethodId,
      paymentName,
      amount,
      currency,
      qrCodeUrl,
      expiredAt,
      duration: paymentMethodInput.duration,
      orderCode: context.orderCode,
    });

    // Uses MktPaymentRepository for thread-safe access
    return this.paymentRepository.create(context.workspaceId, paymentData);
  }

  private calculatePaymentDetails(
    paymentMethodInput: OrderPaymentMethodInput,
    paymentMethod: MktPaymentMethodWorkspaceEntity,
    totalAmount: number,
    orderCode?: string,
  ): { amount: number; paymentName: string } {
    const isDiscountPayment =
      paymentMethodInput.name === 'discount' && paymentMethodInput.amount;

    const amount = isDiscountPayment
      ? (paymentMethodInput.amount ?? totalAmount)
      : totalAmount;

    const prefix = isDiscountPayment ? 'Thanh toán trước' : 'Thanh toán';
    const paymentName = `${prefix} - ${paymentMethod.name} - ${orderCode}`;

    return { amount, paymentName };
  }

  private buildPaymentData(params: {
    orderId: string;
    paymentMethodId: string;
    paymentName: string;
    amount: number;
    currency: PaymentCurrency;
    qrCodeUrl?: string;
    expiredAt?: string | null;
    duration?: number;
    orderCode?: string;
  }): CreatePaymentData {
    return {
      name: params.paymentName,
      amount: params.amount,
      currency: params.currency,
      mktOrderId: params.orderId,
      mktPaymentMethodId: params.paymentMethodId,
      qrCodeUrl: params.qrCodeUrl ?? undefined,
      duration: params.duration ?? undefined,
      expiredAt: params.expiredAt ?? undefined,
      paymentPageUrl: `${this.config.urls.serverUrl}${this.config.urls.paymentPagePath}/${params.orderCode}`,
      mktTemplateId: MKT_TEMPLATE.SEPAY,
    };
  }

  private storeInContext(
    context: SagaContext,
    payments: MktPaymentWorkspaceEntity[],
    primaryQrCodeUrl?: string,
  ): void {
    context.paymentId = payments[0]?.id;
    context.metadata.set('paymentQrCode', primaryQrCodeUrl);
    context.rollbackData.set(this.name, {
      paymentIds: payments.map((p) => p.id),
    });
  }
}
