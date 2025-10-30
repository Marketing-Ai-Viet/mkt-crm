import { Inject, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { getQueueToken } from 'src/engine/core-modules/message-queue/utils/get-queue-token.util';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { SInvoiceIntegrationService } from 'src/mkt-core/invoice/integration/s-invoice.integration.service';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderActionService } from 'src/mkt-core/order/services/order.action.service';
import { OrderPayloadService } from 'src/mkt-core/order/services/order.payload.service';

@WorkspaceQueryHook('mktOrder.updateOne')
export class MktOrderUpdateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktOrderUpdateOnePreQueryHook.name);

  constructor(
    @Inject(getQueueToken(MessageQueue.billingQueue))
    private readonly messageQueueService: MessageQueueService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly orderActionService: OrderActionService,
    private readonly orderPayloadService: OrderPayloadService,
    private readonly sInvoiceIntegrationService: SInvoiceIntegrationService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<MktOrderWorkspaceEntity>> {
    const input = payload?.data;
    const orderId = payload?.id;
    const workspaceId =
      this.scopedWorkspaceContextFactory.create().workspaceId || '';

    if (!orderId || !workspaceId) return payload;
    const orderRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
        workspaceId,
        'mktOrder',
        { shouldBypassPermissionChecks: true },
      );
    const currentOrder = await this.getOrder(orderId, orderRepository);

    await this.validateOrder(orderId, workspaceId);
    const action = (await this.orderActionService.getAction(
      payload,
      currentOrder,
    )) as ORDER_ACTION | null;

    this.logger.log(`action: ${action}`);
    if (action === null) {
      this.logger.log(`current order status ${currentOrder?.status}`);
      this.logger.log(`input status ${input?.status}`);
      this.logger.log(`input trialLicense ${input?.trialLicense}`);
      this.logger.log(`input licenseStatus ${input?.licenseStatus}`);
      this.logger.log(`input sInvoiceStatus ${input?.sInvoiceStatus}`);
      this.logger.log(
        `current order trialLicense ${currentOrder?.trialLicense}`,
      );
      this.logger.log(
        `current order licenseStatus ${currentOrder?.licenseStatus}`,
      );
      this.logger.log(
        `current order sInvoiceStatus ${currentOrder?.sInvoiceStatus}`,
      );
    }

    if (
      action === ORDER_ACTION.SINVOICE &&
      currentOrder?.trialLicense === false
    ) {
      await this.sInvoiceIntegrationService.syncSInvoice(orderId);
    }

    if (!action) {
      const currentStatus = currentOrder?.status || 'null';
      const targetStatus = input?.status || 'null';

      throw new Error(
        `Invalid state transition: Cannot transition from ${currentStatus} to ${targetStatus}. This transition is not allowed by business rules.`,
      );
    }

    const newPayload = await this.orderPayloadService.getNewPayload(
      payload,
      action,
      currentOrder,
    );

    const accountingConfirmed =
      action === ORDER_ACTION.COMPLETED && input?.accountingConfirmed;

    return {
      ...newPayload,
      data: {
        ...(newPayload.data as MktOrderWorkspaceEntity),
        updatedAt: new Date().toISOString(),
        ...(accountingConfirmed ? { accountingConfirmed: true } : {}),
      },
    };
  }

  private async validateOrder(
    orderId: string,
    workspaceId: string | null,
  ): Promise<void> {
    if (!orderId || !workspaceId) {
      throw new Error('Order ID and workspace ID are required');
    }
  }

  private async getOrder(
    orderId: string,
    orderRepository: WorkspaceRepository<MktOrderWorkspaceEntity>,
  ): Promise<MktOrderWorkspaceEntity | null> {
    const currentOrder = await orderRepository.findOne({
      where: { id: orderId },
      relations: ['orderItems'],
    });

    return currentOrder;
  }
}
