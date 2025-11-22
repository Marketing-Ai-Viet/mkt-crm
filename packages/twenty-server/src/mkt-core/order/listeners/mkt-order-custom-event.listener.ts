import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { CustomEventName } from 'src/engine/workspace-event-emitter/types/custom-event-name.type';
import {
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
} from 'src/mkt-core/common/common.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktCustomerQueueService } from 'src/mkt-core/customer/services';
import { MktEmailService } from 'src/mkt-core/email/service/mkt-email.service';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
import {
  ORDER_HISTORY_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

export interface MktOrderCustomEventData {
  eventType?: CustomEventName;
  orderId?: string;
  workspaceId: string;
  orderData: {
    id: string;
    status: string;
    note?: string;
    licenseHistory?: {
      action: string;
      note?: string;
    };
    trialLicense?: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  timestamp: string;
}

export interface MktOrderCustomEventPayload {
  name: CustomEventName;
  workspaceId: string;
  events: MktOrderCustomEventData[];
}

@Injectable()
export class MktOrderCustomEventListener {
  private readonly logger = new Logger(MktOrderCustomEventListener.name);
  constructor(
    private mktRepo: MktRepositoryService,
    public mktLicenseEventService: MktLicenseEventService,
    private customerQueueService: MktCustomerQueueService,
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

        if (orderType === MKT_ORDER_EVENT_TYPES.ORDER_CREATED) {
          await this.pushLicenseHistory(updateOrder);
        }

        if (updateOrder) await this.mktEmailService.sendOrderEmail(updateOrder);

        if (
          updateOrder?.status === ORDER_STATUS.OVERDUE ||
          updateOrder?.status === ORDER_STATUS.BLOCKED
        ) {
          this.mktLicenseEventService.mktRepo.workspaceId = event.workspaceId;
          await this.mktLicenseEventService.lockLicensesFromOrder(updateOrder);
        }

        this.logger.log(`Order type 82: ${orderType}`);
        if (orderType === MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED) {
          await this.mktLicenseEventService.refundLicensesFromOrder(
            updateOrder,
          );
        }

        if (updateOrder?.status === ORDER_STATUS.COMPLETED) {
          this.logger.log(
            `Order ${updateOrder.id} has moved to COMPLETED status.`,
          );
          this.mktLicenseEventService.mktRepo.workspaceId = event.workspaceId;
          await this.mktLicenseEventService.activateLicensesFromOrder(
            updateOrder,
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

  private async pushLicenseHistory(
    updateOrder: MktOrderWorkspaceEntity | void,
  ): Promise<void> {
    if (!updateOrder?.mktLicense) {
      this.logger.warn(`Order has no license information`);

      return;
    }

    const licenseRepo = await this.mktRepo.getRepository(
      MktLicenseHistoryWorkspaceEntity,
    );

    if (!updateOrder?.mktLicense) return;

    for (const license of updateOrder.mktLicense) {
      //const licenses = updateOrder?.mktLicense?.[0] as MktLicenseWorkspaceEntity;

      if (!license) {
        this.logger.warn(`No license associated with the order`);
      }
      const newLicenseHistory = licenseRepo.create({
        name: 'Bản quyền được kích hoạt',
        action: license.status as ORDER_HISTORY_ACTION,
        note: 'Khách hàng đã kích hoạt thành công bản quyền',
        mktLicenseId: license.id,
      });

      newLicenseHistory.createdBy = updateOrder.createdBy;
      await licenseRepo.save(newLicenseHistory);
      // Push license history logic here
    }
  }

  private async processOrderCustomEvent(
    event: MktOrderCustomEventData,
  ): Promise<MktOrderWorkspaceEntity | void> {
    this.mktRepo.workspaceId = event.workspaceId;
    const orderHistoryRepo = await this.mktRepo.getRepository(
      MktOrderHistoryWorkspaceEntity,
    );

    const orderRepo = await this.mktRepo.getRepository(MktOrderWorkspaceEntity);

    const updatedOrder = await orderRepo.findOne({
      where: { id: event.orderId },
      relations: [
        'mktLicense',
        'mktPayments',
        'mktCustomer',
        'orderItems',
        'accountOwner',
      ],
    });

    if (!updatedOrder) {
      this.logger.warn(`Order not found: ${event.orderId}`);

      return;
    }

    this.logger.log(`start tier update for customer`);

    await this.tierForCustomer(updatedOrder);

    const orderHistoryData = await this.makeOrderHistoryData(
      event.eventType,
      updatedOrder,
    );
    const orderHistory = orderHistoryRepo.create({
      name: orderHistoryData.name,
      mktOrderId: event.orderId,
      action: orderHistoryData.action as ORDER_HISTORY_ACTION,
      fieldName: orderHistoryData.fieldName ?? null,
      newValue: orderHistoryData.newValue ?? null,
      oldValue: orderHistoryData.oldValue ?? null,
      metadata: updatedOrder as MktOrderWorkspaceEntity as unknown as JSON,
      note: orderHistoryData.note ?? '',
    });

    orderHistory.createdBy = updatedOrder.createdBy;

    await orderHistoryRepo.save(orderHistory);

    this.logger.log(
      `Processing order ${event.orderId} in workspace ${event.workspaceId}`,
    );

    if (updatedOrder.metadata) {
      this.logger.log(
        `Order metadata: ${JSON.stringify(updatedOrder.metadata)}`,
      );
    }

    return updatedOrder;
  }

  private async makeOrderHistoryData(
    eventType?: CustomEventName,
    updatedOrder?: MktOrderWorkspaceEntity,
  ) {
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

  private async tierForCustomer(order: MktOrderWorkspaceEntity) {
    // Trigger customer tier update via queue when order is updated
    if (order.mktCustomerId) {
      try {
        this.logger.log(
          `Enqueuing customer tier update for customer ${order.mktCustomerId}`,
        );

        await this.customerQueueService.updateCustomerTier(order.mktCustomerId);

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
