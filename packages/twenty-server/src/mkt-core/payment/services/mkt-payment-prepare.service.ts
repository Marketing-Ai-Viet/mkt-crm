import { Injectable, Logger } from '@nestjs/common';

import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';

@Injectable()
export class MktPaymentPrepareService {
  private readonly logger = new Logger(MktPaymentPrepareService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async prepareCreateOnePayload(
    payload: CreateOneResolverArgs<MktPaymentWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktPaymentWorkspaceEntity>> {
    const input = payload?.data;
    const workspaceId =
      this.scopedWorkspaceContextFactory.create().workspaceId || '';

    if (!workspaceId || !input?.mktOrderId) {
      this.logger.warn('Missing workspaceId or mktOrderId in payment creation');

      return payload;
    }

    try {
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
          workspaceId,
          'mktOrder',
          { shouldBypassPermissionChecks: true },
        );

      const order = await orderRepository.findOne({
        where: { id: input.mktOrderId },
      });

      if (!order) {
        this.logger.warn(`Order not found with id: ${input.mktOrderId}`);

        return payload;
      }

      // amount
      if (!input.amount && order.totalAmount) {
        payload.data = { ...payload.data, amount: order.totalAmount };
        this.logger.log(
          `Copied amount ${order.totalAmount} from order ${order.id}`,
        );
      }

      // name
      if (!input.name && (order.orderCode || order.name)) {
        const orderCode = order.orderCode || '';
        const orderName = order.name || '';
        const paymentName =
          orderCode && orderName
            ? `${orderCode}-${orderName}`
            : orderCode || orderName || 'Payment';

        payload.data = { ...payload.data, name: paymentName };
        this.logger.log(`Generated payment name: ${paymentName}`);
      }

      // currency
      if (!input.currency && order?.currency) {
        payload.data = { ...payload.data, currency: order.currency };
        this.logger.log(
          `Copied currency ${order.currency} from order ${order.id}`,
        );
      }
    } catch (error) {
      this.logger.error('Error while preparing payment payload:', error);
    }

    return payload;
  }

  async prepareCreatePayment(
    data: Partial<MktPaymentWorkspaceEntity>,
  ): Promise<Partial<MktPaymentWorkspaceEntity>> {
    const prepared = await this.prepareCreateOnePayload({
      data,
    } as CreateOneResolverArgs<MktPaymentWorkspaceEntity>);

    return prepared.data as Partial<MktPaymentWorkspaceEntity>;
  }

  async generateSepayQrCodeUrl(
    mktPaymentMethod: MktPaymentMethodWorkspaceEntity,
    customAmount?: number,
    orderCode?: string | null,
  ): Promise<string> {
    this.logger.log('Generating SEPay QR code URL...');
    if (mktPaymentMethod?.name !== 'SEPay QR') return '';
    try {
      // Get environment variables
      const sepayAcc = process.env.SEPAY_ACC || '';
      const sepayBank = process.env.SEPAY_BANK || '';

      if (!sepayAcc || !sepayBank) {
        this.logger.warn(
          'SEPAY_ACC or SEPAY_BANK environment variables not set',
        );

        return '';
      }

      // Get order information

      if (!orderCode) {
        this.logger.warn('No order code found for payment');

        return '';
      }

      if (!customAmount || customAmount <= 0) {
        this.logger.warn('Invalid amount for QR code generation');

        return '';
      }

      // Generate QR code URL
      const qrCodeUrl = `https://qr.sepay.vn/img?acc=${sepayAcc}&bank=${sepayBank}&amount=${customAmount}&des=${orderCode}&template=qronly&download=false`;

      this.logger.log(
        `Generated SEPay QR code URL for order ${orderCode} with amount ${customAmount}`,
      );

      return qrCodeUrl;
    } catch (error) {
      this.logger.error('Error generating SEPay QR code URL:', error);

      return '';
    }
  }
}
