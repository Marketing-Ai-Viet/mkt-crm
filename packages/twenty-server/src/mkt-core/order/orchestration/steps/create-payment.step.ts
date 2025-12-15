import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktOrderCommonConfirmService } from 'src/mkt-core/common/service/mkt.common-order.confirm.service';
import { MKT_TEMPLATE } from 'src/mkt-core/order/constants/mkt-template.constant';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga/order-saga.interface';
import { CreateOrderWithItemsInput } from 'src/mkt-core/order/types';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';

// ============================================
// STEP OUTPUT TYPE
// ============================================

export type CreatePaymentStepOutput = {
  payments: MktPaymentWorkspaceEntity[];
  qrCodeUrl?: string;
};

// ============================================
// DEFAULT CONSTANTS
// ============================================

const DEFAULT_CURRENCY = 'VND';

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
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly mktCommonOrderConfirmService: MktOrderCommonConfirmService,
  ) {
    super();
  }

  /**
   * Skip payment creation for TRIAL action
   */
  shouldSkip(_context: SagaContext, input: CreateOrderWithItemsInput): boolean {
    return input.action === ORDER_ACTION.TRIAL;
  }

  async execute(
    context: SagaContext,
    input: CreateOrderWithItemsInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<CreatePaymentStepOutput>> {
    try {
      if (!context.orderId) {
        return {
          success: false,
          error: new Error('Order ID is required from previous step'),
        };
      }

      if (!input.paymentMethods || input.paymentMethods.length === 0) {
        this.logger.warn(
          'No payment methods provided, skipping payment creation',
        );

        return {
          success: true,
          data: { payments: [] },
        };
      }

      this.logger.log(`Creating payments for order: ${context.orderId}`);

      // Get payment methods from database
      const paymentMethodIds = input.paymentMethods.map(
        (p) => p.paymentMethodId,
      );
      const paymentMethods = await this.getPaymentMethods(
        context.workspaceId,
        paymentMethodIds,
      );

      if (paymentMethods.length === 0) {
        return {
          success: false,
          error: new Error('No valid payment methods found'),
        };
      }

      // Get total amount from context
      const totalAmount = (context.metadata.get('totalAmount') as number) ?? 0;

      // Create payment repository
      const paymentRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          context.workspaceId,
          MktPaymentWorkspaceEntity,
          { shouldBypassPermissionChecks: true },
        );

      const payments: MktPaymentWorkspaceEntity[] = [];
      let primaryQrCodeUrl: string | undefined;

      // Create payments for each payment method
      for (const paymentMethodInput of input.paymentMethods) {
        const paymentMethod = paymentMethods.find(
          (pm) => pm.id === paymentMethodInput.paymentMethodId,
        );

        if (!paymentMethod) {
          this.logger.warn(
            `Payment method ${paymentMethodInput.paymentMethodId} not found, skipping`,
          );
          continue;
        }

        // Calculate amount for this payment
        let amount = totalAmount;
        let paymentName = `Thanh toán - ${paymentMethod.name} - ${context.orderCode}`;

        // Handle discount payment (pre-payment)
        if (
          paymentMethodInput.name === 'discount' &&
          paymentMethodInput.amount
        ) {
          amount = paymentMethodInput.amount;
          paymentName = `Thanh toán trước - ${paymentMethod.name} - ${context.orderCode}`;
        }

        // Generate QR code for SEPay
        const { qrCodeUrl, expiredAt } =
          await this.mktCommonOrderConfirmService.generateSepayQrCodeUrl(
            paymentMethod,
            amount,
            context.orderCode ?? null,
          );

        // Store primary QR code URL
        if (!primaryQrCodeUrl && qrCodeUrl) {
          primaryQrCodeUrl = qrCodeUrl;
        }

        // Create payment record
        const paymentData: Partial<MktPaymentWorkspaceEntity> = {
          mktOrderId: context.orderId,
          mktPaymentMethodId: paymentMethodInput.paymentMethodId,
          name: paymentName,
          amount,
          currency: input.currency ?? DEFAULT_CURRENCY,
          qrCodeUrl: qrCodeUrl ?? undefined,
          duration: paymentMethodInput.duration ?? undefined,
          expiredAt: expiredAt ?? undefined,
          paymentPageUrl: `${process.env.SERVER_URL}/payment/${context.orderCode}`,
          mktTemplateId: MKT_TEMPLATE.SEPAY,
        };

        const payment = paymentRepository.create(paymentData);

        const savedPayment = await queryRunner.manager.save(payment);

        payments.push(savedPayment as MktPaymentWorkspaceEntity);
      }

      this.logger.log(`Created ${payments.length} payment records`);

      // Store in context
      context.paymentId = payments[0]?.id;
      context.metadata.set('paymentQrCode', primaryQrCodeUrl);
      context.rollbackData.set(this.name, {
        paymentIds: payments.map((p) => p.id),
      });

      return {
        success: true,
        data: {
          payments,
          qrCodeUrl: primaryQrCodeUrl,
        },
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
    queryRunner: QueryRunner,
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

      await queryRunner.manager.delete(
        MktPaymentWorkspaceEntity,
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

  /**
   * Get payment methods from database
   */
  private async getPaymentMethods(
    workspaceId: string,
    paymentMethodIds: string[],
  ): Promise<MktPaymentMethodWorkspaceEntity[]> {
    const repository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace(
        workspaceId,
        MktPaymentMethodWorkspaceEntity,
        { shouldBypassPermissionChecks: true },
      );

    return repository.find({
      where: paymentMethodIds.map((id) => ({ id })),
    });
  }
}
