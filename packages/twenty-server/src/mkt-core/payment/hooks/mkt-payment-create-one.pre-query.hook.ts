import { Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';

@WorkspaceQueryHook('mktPayment.createOne')
export class MktPaymentCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktPaymentCreateOnePreQueryHook.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
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
      // get order information to copy amount and create name
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

      // Copy amount from order if payment doesn't have amount
      if (!input.amount && order.totalAmount) {
        payload.data = {
          ...payload.data,
          amount: order.totalAmount,
        };
        this.logger.log(`Copied amount ${order.totalAmount} from order ${order.id}`);
      }

      // create name format orderCode-OrderName if payment doesn't have name
      if (!input.name && (order.orderCode || order.name)) {
        const orderCode = order.orderCode || '';
        const orderName = order.name || '';
        const paymentName = orderCode && orderName 
          ? `${orderCode}-${orderName}`
          : orderCode || orderName || 'Payment';

        payload.data = {
          ...payload.data,
          name: paymentName,
        };
        this.logger.log(`Generated payment name: ${paymentName}`);
      }

      // Copy currency from order if payment doesn't have currency
      if (!input.currency && order.currency) {
        payload.data = {
          ...payload.data,
          currency: order.currency,
        };
        this.logger.log(`Copied currency ${order.currency} from order ${order.id}`);
      }

    } catch (error) {
      this.logger.error('Error in payment creation hook:', error);
      // Don't throw error to not interrupt the payment creation process
    }

    return payload;
  }
}
