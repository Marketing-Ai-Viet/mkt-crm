import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/common/common.type';
import { MktCommonOrderService } from 'src/mkt-core/common/service/mkt-common-order.service';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderActionService } from 'src/mkt-core/order/services/order.action.service';
import { OrderConfirmService } from 'src/mkt-core/order/services/order.confirm.service';
import { OrderService } from 'src/mkt-core/order/services/order.service';
import { FireBaseIntegrationService } from 'src/mkt-core/payment/integration/firebase-integration.service';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';
import { ORDER_ACTION } from 'src/mkt-core/order/constants';

export type Updated = MktOrderWorkspaceEntity;

@Injectable()
@WorkspaceQueryHook({
  key: 'mktOrder.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktOrderUpdateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(MktOrderUpdateOnePostQueryHook.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly recordPositionService: RecordPositionService,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
    private readonly orderConfirmService: OrderConfirmService,
    private readonly orderService: OrderService,
    private readonly orderActionService: OrderActionService,
    private readonly fireBaseIntegrationService: FireBaseIntegrationService,
    private readonly mktCommonOrderService: MktCommonOrderService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktOrderWorkspaceEntity[],
  ): Promise<void> {
    // Lấy thông tin của đơn hàng vừa được cập nhật
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) return;
    const updated: Updated = payload?.[0];

    if (!updated) return;
    let eventType = MKT_ORDER_EVENT_TYPES.ORDER_UPDATED;

    const actionMetadata = await this.orderActionService.getOrderAction(
      updated?.metadata,
    );

    this.logger.log('[Order POST HOOK] action: ' + actionMetadata);

    if (updated?.accountingConfirmed === true && !actionMetadata)
      eventType = MKT_ORDER_EVENT_TYPES.ACCOUNTING_CONFIRMED;

    if (actionMetadata === ORDER_ACTION.REFUND) {
      eventType = MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED;
    }
    try {
      await this.mktCommonOrderService.eventUpdated(
        updated.id,
        workspaceId,
        eventType,
      );

      return;
    } catch (error) {
      this.logger.error(
        '[Order POST HOOK] Failed to create related entities',
        error,
      );
      throw error;
    }
  }
}
