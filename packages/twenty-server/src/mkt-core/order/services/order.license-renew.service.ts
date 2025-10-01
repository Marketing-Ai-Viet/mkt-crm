import { Injectable, Logger } from '@nestjs/common';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { ObjectRecordUpdateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-update.event';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
import { ORDER_ACTION, ORDER_STATUS } from 'src/mkt-core/order/constants';
import { Metadata } from 'src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook';
import { OrderActionService } from 'src/mkt-core/order/services/order.action.service';
import { OrderConfirmService } from 'src/mkt-core/order/services/order.confirm.service';
import { OrderService } from 'src/mkt-core/order/services/order.service';
import { callFireBaseType } from 'src/mkt-core/payment/constants/payment.type';
import {
  FireBaseIntegrationService,
  FirebaseAuthResponse,
} from 'src/mkt-core/payment/integration/firebase-integration.service';
import { VariantService } from 'src/mkt-core/product/services/variant.service';
@Injectable()
export class OrderLicenseRenewService {
  private readonly logger = new Logger(OrderLicenseRenewService.name);

  constructor(
    private readonly licenseService: MktLicenseEventService,
    private readonly orderService: OrderService,
    private readonly variantService: VariantService,
    private readonly mktRepo: MktRepositoryService,
    private readonly orderActionService: OrderActionService,
    private readonly fireBaseIntegrationService: FireBaseIntegrationService,
    private readonly orderConfirmService: OrderConfirmService,
  ) {}

  @OnDatabaseBatchEvent('mktLicense', DatabaseEventAction.UPDATED)
  async handleLicenseUpdateMutation(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<MktLicenseWorkspaceEntity>
    >,
  ) {
    this.logger.log(
      `Received license update events for workspace: ${payload.workspaceId}`,
    );

    for (const event of payload.events) {
      const status = event.properties.after?.status;
      const metadata = event.properties.after?.metadata as Metadata;
      if (status === 'RENEWING') {
        const licenseId = event.properties.after.id;
        const workspaceId = payload.workspaceId; // Lấy workspaceId từ payload

        await this.processLicenseRenewalFromMutation(
          licenseId,
          workspaceId,
          metadata,
        );
      }
    }
  }

  private async processLicenseRenewalFromMutation(
    licenseId: string,
    workspaceId: string,
    metadata: Metadata | string,
  ) {
    if (typeof metadata === 'string')
      metadata = JSON.parse(metadata) as Metadata;

    const variantsMeta = metadata?.variants;
    const customerMeta = metadata?.customer;
    const paymentMethodsMeta = metadata?.paymentMethods;
    const trialOrderId = metadata?.trialOrderId || null;
    const action =
      await this.orderActionService.getActionFromMetadata(metadata);
    if (action !== ORDER_ACTION.LICENSE_RENEWING) {
      this.logger.warn(
        `Ignoring license renewal for non-renew action: ${action}`,
      );
      return;
    }

    const order = await this.createOrder(workspaceId);

    this.logger.log(
      `Created order ${order.id} for license renewal of license ${licenseId}`,
    );
    const fireBaseData: callFireBaseType | void =
      await this.orderConfirmService.confirmOrder(
        action,
        order,
        workspaceId,
        variantsMeta,
        customerMeta,
        paymentMethodsMeta,
        licenseId,
      );

    this.logger.log(`Firebase data: ${JSON.stringify(fireBaseData)}`);
    const authFirebase = await this.callFireBase(fireBaseData);

    // Update order status based on action
    await this.orderService.updateOrderStatus(
      order.id,
      await this.orderActionService.getOrderStatusFromAction(action),
      await this.orderActionService.isTrialAction(action),
      authFirebase,
      workspaceId,
    );

    return;
  }

  private async createOrder(workspaceId: string) {
    const orderRepository =
      await this.mktRepo.getOrderRepositoryByWorkspaceId(workspaceId);

    const newOrder = orderRepository.create({
      status: ORDER_STATUS.DRAFT,
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      name: 'License Renewal Order',
    });

    const createdOrder = await orderRepository.save(newOrder);
    return createdOrder;
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
}
