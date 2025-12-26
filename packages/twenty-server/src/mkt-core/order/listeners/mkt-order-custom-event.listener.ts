import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
  MktCustomEventName,
} from 'src/mkt-core/common/common.type';
import { MktCustomerQueueService } from 'src/mkt-core/customer/services';
import { MktEmailService } from 'src/mkt-core/email/service/mkt-email.service';
import {
  ORDER_HISTORY_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  MktOrderRepository,
  MktOrderHistoryRepository,
} from 'src/mkt-core/order/repositories';
import {
  MktOrderCustomEventData,
  MktOrderCustomEventPayload,
} from 'src/mkt-core/order/types';
import { safeJsonStringify } from 'src/mkt-core/utils';

@Injectable()
export class MktOrderCustomEventListener {
  private readonly logger = new Logger(MktOrderCustomEventListener.name);
  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderHistoryRepository: MktOrderHistoryRepository,
    private readonly customerQueueService: MktCustomerQueueService,
    private readonly mktEmailService: MktEmailService,
  ) {}

  @OnEvent(MKT_EVENT_TYPE.MKT_ORDER)
  async handleMktOrderCustom(payload: MktOrderCustomEventPayload) {
    this.logger.log(
      `Received mktOrderCustom event for workspace: ${payload.workspaceId}`,
    );

    for (const event of payload.events) {
      try {
        const updateOrder = await this.processOrderCustomEvent(event);

        const orderType = event.eventType as MKT_ORDER_EVENT_TYPES;

        if (updateOrder) await this.mktEmailService.sendOrderEmail(updateOrder);

        // NOTE: License event handling has been removed.
        // License operations should be handled via MktLicenseIntegration service separately.
        if (orderType === MKT_ORDER_EVENT_TYPES.ORDER_CREATED) {
          this.logger.log('ORDER_CREATED event - license handling removed');
        }

        if (
          updateOrder?.status === ORDER_STATUS.OVERDUE ||
          updateOrder?.status === ORDER_STATUS.BLOCKED
        ) {
          this.logger.log(
            'Order OVERDUE/BLOCKED - license locking removed, handle separately',
          );
        }

        if (orderType === MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED) {
          this.logger.log('ORDER_REFUNDED event - license handling removed');
        }

        if (updateOrder?.status === ORDER_STATUS.COMPLETED) {
          this.logger.log(
            `Order ${updateOrder.id} has moved to COMPLETED status - license activation removed`,
          );
        }
        this.logger.log(
          `Successfully processed order custom event: ${event.orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process order custom event: ${event.orderId}`,
          error,
        );
      }
    }
  }

  /**
   * REMOVED: License history tracking
   * License module has been removed. License history should be handled
   * via MktLicenseIntegration service separately.
   */

  private async processOrderCustomEvent(
    event: MktOrderCustomEventData,
  ): Promise<MktOrderWorkspaceEntity | void> {
    if (!event.orderId) {
      this.logger.warn(
        'Event missing orderId, skipping order event processing',
      );

      return;
    }

    const updatedOrder = await this.orderRepository.findById(
      event.workspaceId,
      event.orderId,
      {
        relations: {
          mktPayments: true,
          mktCustomer: true,
          orderItems: true,
          accountOwner: true,
        },
      },
    );

    if (!updatedOrder) {
      this.logger.warn(`Order not found: ${event.orderId}`);

      return;
    }

    this.logger.log(`start tier update for customer`);

    await this.tierForCustomer(updatedOrder, event.workspaceId);

    const orderHistoryData = this.makeOrderHistoryData(
      event.eventType,
      updatedOrder,
    );

    // Use repository to create order history
    await this.orderHistoryRepository.create(event.workspaceId, {
      orderId: event.orderId,
      action: orderHistoryData.action,
      name: orderHistoryData.name,
      fieldName: orderHistoryData.fieldName,
      newValue: orderHistoryData.newValue,
      oldValue: orderHistoryData.oldValue,
      note: orderHistoryData.note,
      metadata: updatedOrder as unknown as Record<string, unknown>,
    });

    this.logger.log(
      `Processing order ${event.orderId} in workspace ${event.workspaceId}`,
    );

    if (updatedOrder.metadata) {
      this.logger.log(
        `Order metadata: ${safeJsonStringify(updatedOrder.metadata)}`,
      );
    }

    return updatedOrder;
  }

  private makeOrderHistoryData(
    eventType?: MktCustomEventName,
    updatedOrder?: MktOrderWorkspaceEntity,
  ): {
    name: string;
    action: ORDER_HISTORY_ACTION;
    fieldName: string;
    newValue: string;
    oldValue: string;
    note: string;
  } {
    let name = 'Cập nhật trạng thái';
    let action = ORDER_HISTORY_ACTION.UPDATED;
    let fieldName = 'status';
    let newValue = updatedOrder?.status || '';
    const oldValue = 'N/A';
    let note = '';

    switch (eventType) {
      case MKT_ORDER_EVENT_TYPES.ORDER_CREATED:
        name = 'Tạo hóa đơn';
        action = ORDER_HISTORY_ACTION.CREATED;
        note = `Hóa đơn được tạo bởi ${updatedOrder?.createdBy?.name}`;
        break;
      case MKT_ORDER_EVENT_TYPES.ORDER_UPDATED:
        break;
      case MKT_ORDER_EVENT_TYPES.ACCOUNTING_CONFIRMED:
        action = ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED;
        fieldName = 'accountingConfirmed';
        newValue = 'true';
        note = 'Trạng thái hiện tại: Kế toán đã xác nhận';
        break;
      case MKT_ORDER_EVENT_TYPES.FROM_LICENSE:
        action = ORDER_HISTORY_ACTION.LICENSE_UPDATED;
        break;
      case MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED:
        action = ORDER_HISTORY_ACTION.REFUNDED;
        name = 'Hoàn tiền đơn hàng';
        note = 'Đơn hàng đã được hoàn tiền';
        break;
      default:
        action = ORDER_HISTORY_ACTION.UPDATED;
    }

    return { name, action, fieldName, newValue, oldValue, note };
  }

  private async tierForCustomer(
    order: MktOrderWorkspaceEntity,
    workspaceId: string,
  ) {
    // Trigger customer tier update via queue when order is updated
    if (order.mktCustomerId) {
      try {
        this.logger.log(
          `Enqueuing customer tier update for customer ${order.mktCustomerId}`,
        );

        await this.customerQueueService.updateCustomerTier(
          order.mktCustomerId,
          workspaceId,
          { reason: 'order_completed' },
        );

        this.logger.log(
          `Successfully enqueued customer tier update for customer ${order.mktCustomerId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to enqueue customer tier update for customer ${order.mktCustomerId}`,
          error,
        );
        // Don't throw error to prevent order processing failure
      }
    } else {
      this.logger.warn(
        `Order ${order.id} has no mktCustomerId, skipping tier update`,
      );
    }
  }
}
