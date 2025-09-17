import { Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';

@WorkspaceQueryHook('mktPayment.updateOne')
export class MktPaymentUpdateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktPaymentUpdateOnePreQueryHook.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<MktPaymentWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<MktPaymentWorkspaceEntity>> {
    const input = payload?.data;
    const paymentId = payload?.id;
    const workspaceId =
      this.scopedWorkspaceContextFactory.create().workspaceId || '';

    if (!workspaceId || !paymentId) {
      this.logger.warn('Missing workspaceId or paymentId in payment update');
      return payload;
    }

    try {
      // Get current payment information
      const paymentRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentWorkspaceEntity>(
          workspaceId,
          'mktPayment',
          { shouldBypassPermissionChecks: true },
        );

      const currentPayment = await paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['mktPaymentMethod', 'mktOrder'],
      });

      if (!currentPayment) {
        this.logger.warn(`Payment not found with id: ${paymentId}`);
        return payload;
      }

      // Check if payment method is being updated
      const newPaymentMethodId = input?.mktPaymentMethodId;
      const currentPaymentMethodId = currentPayment.mktPaymentMethodId;

      // If payment method is being updated, get the new payment method
      if (newPaymentMethodId && newPaymentMethodId !== currentPaymentMethodId) {
        const paymentMethodRepository =
          await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPaymentMethodWorkspaceEntity>(
            workspaceId,
            'mktPaymentMethod',
            { shouldBypassPermissionChecks: true },
          );

        const newPaymentMethod = await paymentMethodRepository.findOne({
          where: { id: newPaymentMethodId },
        });

        if (newPaymentMethod) {
          // Check if the new payment method is SEPay QR
          if (newPaymentMethod.name === 'SEPay QR') {
            const qrCodeUrl = await this.generateSepayQrCodeUrl(
              currentPayment,
              newPaymentMethod,
            );

            if (qrCodeUrl) {
              payload.data = {
                ...payload.data,
                qrCodeUrl: qrCodeUrl,
              };
              this.logger.log(`Generated SEPay QR code URL: ${qrCodeUrl}`);
            }
          } else {
            // Clear QR code URL if switching to non-SEPay QR method
            payload.data = {
              ...payload.data,
              qrCodeUrl: undefined,
            };
            this.logger.log('Cleared QR code URL for non-SEPay QR payment method');
          }
        }
      }

      // If payment method is already SEPay QR and amount is being updated, regenerate QR code
      if (
        currentPayment.mktPaymentMethod?.name === 'SEPay QR' &&
        input?.amount &&
        input.amount !== currentPayment.amount
      ) {
        const qrCodeUrl = await this.generateSepayQrCodeUrl(
          currentPayment,
          currentPayment.mktPaymentMethod,
          input.amount,
        );

        if (qrCodeUrl) {
          payload.data = {
            ...payload.data,
            qrCodeUrl: qrCodeUrl,
          };
          this.logger.log(`Regenerated SEPay QR code URL for amount change: ${qrCodeUrl}`);
        }
      }

    } catch (error) {
      this.logger.error('Error in payment update hook:', error);
      // Don't throw error to not interrupt the payment update process
    }

    return payload;
  }

  private async generateSepayQrCodeUrl(
    payment: MktPaymentWorkspaceEntity,
    paymentMethod: MktPaymentMethodWorkspaceEntity,
    customAmount?: number,
  ): Promise<string | null> {
    try {
      // Get environment variables
      const sepayAcc = process.env.SEPAY_ACC || '';
      const sepayBank = process.env.SEPAY_BANK || '';

      if (!sepayAcc || !sepayBank) {
        this.logger.warn('SEPAY_ACC or SEPAY_BANK environment variables not set');
        return null;
      }

      // Get order information
      const order = payment.mktOrder;
      if (!order) {
        this.logger.warn('No order found for payment');
        return null;
      }

      // Get order code
      const orderCode = order.orderCode;
      if (!orderCode) {
        this.logger.warn('No order code found for payment');
        return null;
      }

      // Get amount (use custom amount if provided, otherwise use payment amount)
      const amount = customAmount || payment.amount;
      if (!amount || amount <= 0) {
        this.logger.warn('Invalid amount for QR code generation');
        return null;
      }

      // Generate QR code URL
      const qrCodeUrl = `https://qr.sepay.vn/img?acc=${sepayAcc}&bank=${sepayBank}&amount=${amount}&des=${orderCode}&template=qronly&download=false`;

      this.logger.log(`Generated SEPay QR code URL for order ${orderCode} with amount ${amount}`);

      return qrCodeUrl;
    } catch (error) {
      this.logger.error('Error generating SEPay QR code URL:', error);
      return null;
    }
  }
}
