import { Injectable, Logger } from '@nestjs/common';

import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import {
  FIREBASE_AUTH_RESPONSE,
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
  PAYMENT_HISTORY_TYPE,
} from 'src/mkt-core/common/common.type';
import {
  ORDER_METADATA,
  ORDER_STATUS,
  RefundItem,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify, safeJsonParse } from 'src/mkt-core/utils/json.util';

/**
 * OrderMetadataService - Service for managing order metadata and events
 *
 * Handles:
 * - Order metadata updates
 * - Refund metadata tracking
 * - Order status updates for renew/refund flows
 * - Event emission for order and payment updates
 */
@Injectable()
export class OrderMetadataService {
  private readonly logger = new Logger(OrderMetadataService.name);
  private orderMetadata: ORDER_METADATA | null = null;

  constructor(
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly workspaceEventEmitter: WorkspaceEventEmitter,
  ) {}

  async updateOrderForRenew(
    orderId: string,
    status: ORDER_STATUS,
    workspaceId: string,
    trialLicense?: boolean,
    authFirebase?: void | FIREBASE_AUTH_RESPONSE,
  ) {
    this.logger.log('authFirebase: ' + safeJsonStringify(authFirebase));

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

    updateData.metadata = safeJsonStringify(
      this.orderMetadata,
    ) as unknown as JSON;

    this.logger.log(
      `Updating order ${orderId} with data: ${safeJsonStringify(updateData)}`,
    );

    await this.mktOrderRepository.update(workspaceId, orderId, updateData);
  }

  async updateOrderForRefund(
    status: ORDER_STATUS,
    updateOrder: MktOrderWorkspaceEntity | null,
    workspaceId: string,
  ) {
    if (!updateOrder?.id) {
      return;
    }

    const updateData: Partial<MktOrderWorkspaceEntity> = {
      status,
      metadata: safeJsonStringify(this.orderMetadata) as unknown as JSON,
    };

    await this.mktOrderRepository.update(
      workspaceId,
      updateOrder.id,
      updateData,
    );
  }

  async updateFirstMetadata(
    oldOrder: MktOrderWorkspaceEntity | null | undefined,
    updateMetadata: ORDER_METADATA,
  ) {
    let metadata: ORDER_METADATA = {};

    if (oldOrder?.metadata) {
      const parsed = safeJsonParse<ORDER_METADATA>(
        typeof oldOrder.metadata === 'string'
          ? oldOrder.metadata
          : (safeJsonStringify(oldOrder.metadata) ?? ''),
      );

      if (parsed.success && parsed.data) {
        metadata = { ...parsed.data };
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
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
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
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
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
    _currentOrder: Partial<MktOrderWorkspaceEntity> | null,
    _payload: UpdateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): Promise<number> {
    this.logger.log('Handling refund process in OrderMetadataService');

    // TODO: Implement refund logic using product integration services
    this.logger.warn(
      'Refund logic needs to be reimplemented with product integration services',
    );

    return 0;
  }
}

/**
 * @deprecated Use OrderMetadataService instead
 * Alias for backward compatibility
 */
export const MktCommonOrderService = OrderMetadataService;
