import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { RecordPositionService } from 'src/engine/core-modules/record-position/services/record-position.service';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderActionService } from 'src/mkt-core/order/services/order.action.service';
import { OrderConfirmService } from 'src/mkt-core/order/services/order.confirm.service';
import { OrderService } from 'src/mkt-core/order/services/order.service';
import { callFireBaseType } from 'src/mkt-core/payment/constants/payment.type';
import {
  FireBaseIntegrationService,
  FirebaseAuthResponse,
} from 'src/mkt-core/payment/integration/firebase-integration.service';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';

export type Metadata = {
  variants?: Array<{ mktVariantId: string; quantity?: number }>;
  paymentMethods?: Array<{ mktPaymentMethodId: string; name?: string }>;
  customer?: { mktCustomerId: string; name?: string };
  orderAction?: ORDER_ACTION;
  trialOrderId?: string; // ID của đơn hàng trial gốc khi chuyển đổi
  authFirebase?: void;
};
export type Created = MktOrderWorkspaceEntity & {
  id: string;
  metadata?: Metadata;
};

@Injectable()
@WorkspaceQueryHook({
  key: 'mktOrder.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktOrderCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(MktOrderCreateOnePostQueryHook.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly recordPositionService: RecordPositionService,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
    private readonly orderConfirmService: OrderConfirmService,
    private readonly orderService: OrderService,
    private readonly orderActionService: OrderActionService,
    private readonly fireBaseIntegrationService: FireBaseIntegrationService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktOrderWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) return;
    const created: Created = payload?.[0];

    if (!created) return;
    try {
      let metadata: Metadata = created?.metadata;

      await this.validateMetadata(metadata);

      if (typeof metadata === 'string') metadata = JSON.parse(metadata);

      const variantsMeta = metadata?.variants;
      const customerMeta = metadata?.customer;
      const paymentMethodsMeta = metadata?.paymentMethods;
      const trialOrderId = metadata?.trialOrderId || null;
      const action =
        await this.orderActionService.getActionFromMetadata(metadata);

      if (action === ORDER_ACTION.WAIT || action === ORDER_ACTION.TRIAL) {
        this.logger.log(`Processing ${action} action for order creation`);
        const fireBaseData: callFireBaseType | void =
          await this.orderConfirmService.confirmOrder(
            action,
            created,
            workspaceId,
            variantsMeta,
            customerMeta,
            paymentMethodsMeta,
          );

        this.logger.log(`Firebase data: ${JSON.stringify(fireBaseData)}`);
        const authFirebase = await this.callFireBase(fireBaseData);

        // Update order status based on action
        await this.orderService.updateOrderStatus(
          created.id,
          await this.orderActionService.getOrderStatusFromAction(action),
          await this.orderActionService.isTrialAction(action),
          authFirebase,
          workspaceId,
        );

        return;
      }

      if (action === ORDER_ACTION.TRIAL_TO_PAID) {
        // Handle TRIAL_TO_PAID action
        await this.orderConfirmService.trialToPaidOrder(
          action,
          created,
          workspaceId,
          trialOrderId,
          paymentMethodsMeta,
        );

        return;
      }
    } catch (error) {
      this.logger.error(
        '[Order POST HOOK] Failed to create related entities',
        error,
      );
      throw error;
    }
  }

  private async callFireBase(
    fireBaseData: callFireBaseType | void,
  ): Promise<FirebaseAuthResponse | void> {
    if (!fireBaseData) return;
    if (!fireBaseData.orderCode) return;
    if (!fireBaseData.QRCodeUrl) return;
    const orderCode = fireBaseData.orderCode;
    const qrCodeUrl = fireBaseData.QRCodeUrl;

    try {
      this.logger.log(`Sending order ${orderCode} to Firebase`);
      // Send order info to Firebase with PENDING status
      const userFirebase =
        await this.fireBaseIntegrationService.authenticateWithFirebase();

      // Add null check for authentication result
      if (userFirebase) {
        await this.fireBaseIntegrationService.pendingOrderToFirebase(
          userFirebase,
          orderCode,
          qrCodeUrl,
        );
      }

      this.logger.log('User Firebase: ' + JSON.stringify(userFirebase));
      this.logger.log(`Successfully sent order ${orderCode} to Firebase`);

      return userFirebase;
    } catch (error) {
      this.logger.error('Failed to call Firebase', error);

      // Don't throw to prevent breaking the order creation flow
      return;
    }
  }

  private async validateMetadata(metadata: Metadata): Promise<void> {
    // Handle case where metadata might be stored as JSON string
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (error) {
        throw new Error(`Failed to parse metadata JSON: ${error.message}`);
      }
    }

    const variantsMeta = metadata?.variants;
    const customerMeta = metadata?.customer;
    const paymentMethodsMeta = metadata?.paymentMethods;
    const orderAction = metadata?.orderAction || null;
    const status = () => {
      if (
        metadata?.orderAction &&
        metadata?.orderAction == ORDER_ACTION.TRIAL
      ) {
        return ORDER_STATUS.TRIAL;
      }

      return ORDER_STATUS.WAIT;
    };
    const reqStatus = status();

    if (!variantsMeta && orderAction !== ORDER_ACTION.TRIAL_TO_PAID)
      throw new Error('no variants provided for order creation');
    if (!customerMeta && orderAction !== ORDER_ACTION.TRIAL_TO_PAID)
      throw new Error('No customer provided for order creation');
    if (!paymentMethodsMeta && reqStatus !== ORDER_STATUS.TRIAL)
      throw new Error('No payment methods provided for order creation');
  }
}
