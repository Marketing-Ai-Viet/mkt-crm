import { Injectable, Logger } from '@nestjs/common';

import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import {
  FIREBASE_AUTH_RESPONSE,
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
  PAYMENT_HISTORY_TYPE,
} from 'src/mkt-core/common/common.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
import {
  ORDER_METADATA,
  ORDER_STATUS,
  RefundItem,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

@Injectable()
export class MktCommonOrderService {
  private readonly logger = new Logger(MktCommonOrderService.name);
  private orderMetadata: ORDER_METADATA | null = null;
  public licenseHistory: MktLicenseHistoryWorkspaceEntity | null | undefined =
    null;

  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly workspaceEventEmitter: WorkspaceEventEmitter,
  ) {}

  async updateOrderForRenew(
    orderId: string,
    status: ORDER_STATUS,
    workspaceId: string,
    trialLicense?: boolean,
    authFirebase?: void | FIREBASE_AUTH_RESPONSE,
  ) {
    const orderRepository = await this.mktRepo.getOrderRepository();

    this.logger.log('authFirebase: ' + JSON.stringify(authFirebase));

    const updateData: Partial<MktOrderWorkspaceEntity> = {
      status,
      trialLicense: trialLicense ?? false,
    };

    // Nếu có authFirebase thì update vào metadata
    if (authFirebase) {
      await this.updateMetadata({ authFirebase } as unknown as ORDER_METADATA);
      this.logger.log(
        `Updated metadata with Firebase auth info for order: ${orderId}`,
      );
    }

    updateData.metadata = JSON.stringify(this.orderMetadata) as unknown as JSON;

    this.logger.log(
      `Updating order ${orderId} with data: ${JSON.stringify(updateData)}`,
    );

    if (this.licenseHistory?.createdBy) {
      updateData.createdBy = this.licenseHistory.createdBy;
    }

    await orderRepository.update(orderId, updateData);
  }

  async updateOrderForRefund(
    status: ORDER_STATUS,
    updateOrder: MktOrderWorkspaceEntity | null,
  ) {
    if (!updateOrder?.id) return;
    const orderRepository = await this.mktRepo.getOrderRepository();
    const updateData: Partial<MktOrderWorkspaceEntity> = {
      status,
      metadata: JSON.stringify(this.orderMetadata) as unknown as JSON,
    };

    if (this.licenseHistory?.createdBy) {
      updateData.createdBy = this.licenseHistory.createdBy;
    }

    await orderRepository.update(updateOrder?.id, updateData);
  }

  async updateFirstMetadata(
    oldOrder: MktOrderWorkspaceEntity | null | undefined,
    updateMetadata: ORDER_METADATA,
  ) {
    let metadata: ORDER_METADATA = {};

    if (oldOrder?.metadata) {
      try {
        const parsed =
          typeof oldOrder.metadata === 'string'
            ? JSON.parse(oldOrder.metadata)
            : oldOrder.metadata;

        metadata = { ...parsed };
      } catch (error) {
        this.logger.warn('Failed to parse existing metadata:', error);
        metadata = {};
      }
    }
    this.orderMetadata = { ...metadata, ...updateMetadata };
  }

  async updateMetadata(updateMetadata: ORDER_METADATA) {
    this.orderMetadata = { ...this.orderMetadata, ...updateMetadata };
  }

  async updateRefundMetadata(newRefund: RefundItem) {
    const refund = this.orderMetadata?.refund ?? [];

    this.orderMetadata = {
      ...this.orderMetadata,
      refund: [...refund, newRefund],
    };
  }

  getRefundHistory(): RefundItem[] {
    return this.orderMetadata?.refund ?? [];
  }

  async eventUpdated(
    orderId: string | null,
    workspaceId: string | null,
    orderType: MKT_ORDER_EVENT_TYPES,
    note?: string,
  ): Promise<void> {
    if (!orderId || !workspaceId) return;
    try {
      this.logger.log(`Emitting order updated event for order: ${orderId}`);

      // Phát sự kiện custom cho order updated
      const orderUpdatedEvent = {
        eventType: orderType,
        orderId,
        workspaceId,
        orderData: {
          id: orderId,
          note,
        },
        timestamp: new Date().toISOString(),
      };

      this.workspaceEventEmitter.emitCustomBatchEvent(
        MKT_EVENT_TYPE.MKT_ORDER,
        [orderUpdatedEvent],
        workspaceId,
      );

      this.logger.log(
        `Successfully emitted order updated event for order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit order updated event for order: ${orderId}`,
        error,
      );
      // Không throw error để không làm gián đoạn flow tạo order
    }
  }

  async paymentUpdated(
    orderId: string | null,
    workspaceId: string | null,
    paymentType: PAYMENT_HISTORY_TYPE,
    note?: string,
  ) {
    if (!orderId || !workspaceId) return;
    try {
      const paymentUpdatedEvent = {
        eventType: paymentType,
        orderId,
        workspaceId,
        orderData: {
          id: orderId,
          note,
        },
        timestamp: new Date().toISOString(),
      };

      this.workspaceEventEmitter.emitCustomBatchEvent(
        MKT_EVENT_TYPE.MKT_PAYMENT,
        [paymentUpdatedEvent],
        workspaceId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit payment updated event for order: ${orderId}`,
        error,
      );
    }
  }
}
