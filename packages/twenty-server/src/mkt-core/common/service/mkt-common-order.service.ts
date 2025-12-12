import { Injectable, Logger } from '@nestjs/common';

import { In } from 'typeorm';

import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

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
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/constants/license.constants';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';

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

  async handleRefund(
    currentOrder: Partial<MktOrderWorkspaceEntity> | null,
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): Promise<number> {
    this.logger.log('Handling refund process in MktCommonOrderService');
    const licenseRefundIds = await this.getLicenseIdsRefund(
      currentOrder,
      payload,
    );

    this.logger.log(
      `License IDs to refund: ${JSON.stringify(licenseRefundIds)}`,
    );

    await this.updateLicenseStatusForRefund(licenseRefundIds);

    return await this.calculateRefundAmount(licenseRefundIds);
  }

  private async updateLicenseStatusForRefund(licenseRefundIds: string[]) {
    if (licenseRefundIds.length === 0) return;

    const licenseRepo = await this.mktRepo.getRepository(
      MktLicenseWorkspaceEntity,
    );

    await licenseRepo.update(licenseRefundIds, {
      status: MKT_LICENSE_STATUS.REFUND,
    });
  }

  private async calculateRefundAmount(licenseRefundIds: string[]) {
    const licenseRepo = await this.mktRepo.getRepository(
      MktLicenseWorkspaceEntity,
    );
    const licenses = await licenseRepo.find({
      where: {
        id: In(licenseRefundIds),
      },
      relations: ['mktVariant'],
    });

    let totalRefundAmount = 0;

    for (const license of licenses) {
      const variant = license.mktVariant as MktVariantWorkspaceEntity;

      this.logger.log(`Calculating refund for license `);

      if (variant) {
        totalRefundAmount += variant.price || 0;
      }
    }

    return totalRefundAmount;
  }

  private async getLicenseIdsRefund(
    currentOrder: Partial<MktOrderWorkspaceEntity> | null,
    payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
  ) {
    const licenses = currentOrder?.mktLicense;

    const licenseIds = licenses?.map((license) => license.id) || [];
    let updateRefundLicenseIds: string[] = [];
    let refundMetadata: ORDER_METADATA;
    let licenseRefundIds: string[] = [];

    try {
      refundMetadata = JSON.parse(
        payload.data?.metadata as unknown as string,
      ) as ORDER_METADATA;
      licenseRefundIds = refundMetadata.licenseRefundIds || [];
    } catch (e) {
      this.logger.log('No refund metadata found or failed to parse');
    }

    if (licenseRefundIds.length) {
      updateRefundLicenseIds = licenseIds.filter((id) =>
        licenseRefundIds.includes(id),
      );
    } else {
      return licenseIds;
    }

    return updateRefundLicenseIds;
  }
}
