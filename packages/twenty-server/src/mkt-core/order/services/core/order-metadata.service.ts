import { Injectable, Logger } from '@nestjs/common';

import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/order/types';
import { PAYMENT_HISTORY_TYPE } from 'src/mkt-core/payment/types/payment.type';
import {
  ORDER_METADATA,
  ORDER_STATUS,
  RefundItem,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderEventService } from 'src/mkt-core/order/services/core/order-event.service';
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
    private readonly orderEventService: OrderEventService,
  ) {}

  async updateOrderForRenew(
    orderId: string,
    status: ORDER_STATUS,
    workspaceId: string,
    trialLicense?: boolean,
  ) {
    const updateData: Partial<MktOrderWorkspaceEntity> = {
      status,
      trialLicense: trialLicense ?? false,
    };

    updateData.metadata = safeJsonStringify(
      this.orderMetadata,
    ) as unknown as JSON;

    this.logger.log(
      `Updating order ${orderId} with data: ${safeJsonStringify(updateData)}`,
    );

    await this.mktOrderRepository.update(orderId, updateData);
  }

  async updateOrderForRefund(
    status: ORDER_STATUS,
    updateOrder: MktOrderWorkspaceEntity | null,
  ) {
    if (!updateOrder?.id) {
      return;
    }

    const updateData: Partial<MktOrderWorkspaceEntity> = {
      status,
      metadata: safeJsonStringify(this.orderMetadata) as unknown as JSON,
    };

    await this.mktOrderRepository.update(updateOrder.id, updateData);
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

  /**
   * Emit order event - delegates to OrderEventService
   *
   * @deprecated Consider using OrderEventService directly for new code
   */
  async eventUpdated(
    orderId: string | null,
    workspaceId: string | null,
    orderType: MKT_ORDER_EVENT_TYPES,
    note?: string,
  ): Promise<void> {
    if (!orderId || !workspaceId) {
      return;
    }

    await this.orderEventService.emitOrderEvent(
      orderId,
      workspaceId,
      orderType,
      {
        note,
      },
    );
  }

  /**
   * Emit payment event - delegates to OrderEventService
   *
   * @deprecated Consider using OrderEventService directly for new code
   */
  async paymentUpdated(
    orderId: string | null,
    workspaceId: string | null,
    paymentType: PAYMENT_HISTORY_TYPE,
    note?: string,
  ): Promise<void> {
    if (!orderId || !workspaceId) {
      return;
    }

    await this.orderEventService.emitPaymentEvent(
      orderId,
      workspaceId,
      paymentType,
      { note },
    );
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
