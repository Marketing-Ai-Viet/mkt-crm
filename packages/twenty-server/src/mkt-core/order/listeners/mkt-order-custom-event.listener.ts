import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { CustomEventName } from 'src/engine/workspace-event-emitter/types/custom-event-name.type';
import {
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
} from 'src/mkt-core/common/common.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
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
  constructor(private mktRepo: MktRepositoryService) {}

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

      // const userName =
      //       authContext.user?.firstName && authContext.user?.lastName
      //         ? `${authContext.user.firstName} ${authContext.user.lastName}`
      //         : authContext.user?.email || 'Unknown User';

      const newLicenseHistory = licenseRepo.create({
        name: 'Bản quyền được kích hoạt',
        action: license.status,
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
    // Implement your custom business logic here
    // For example:
    // - Send notifications
    // - Update related records
    // - Trigger external integrations
    // - Log analytics events

    this.mktRepo.workspaceId = event.workspaceId;
    const orderHistoryRepo = await this.mktRepo.getRepository(
      MktOrderHistoryWorkspaceEntity,
    );

    const orderRepo = await this.mktRepo.getRepository(MktOrderWorkspaceEntity);

    const updatedOrder = await orderRepo.findOne({
      where: { id: event.orderId },
      relations: ['mktLicense', 'mktPayments', 'mktCustomer'],
    });

    if (!updatedOrder) {
      this.logger.warn(`Order not found: ${event.orderId}`);

      return;
    }
    // const updatedOrder =
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

    await orderHistoryRepo.save(orderHistory);

    this.logger.log(
      `Processing order ${event.orderId} in workspace ${event.workspaceId}`,
    );

    // Example: Log order metadata if available
    if (updatedOrder.metadata) {
      this.logger.log(
        `Order metadata: ${JSON.stringify(updatedOrder.metadata)}`,
      );
    }

    // Add your specific logic here based on your requirements

    // // Parse metadata để xử lý theo loại order
    // const metadata = event.orderData.metadata;
    // const orderAction = metadata?.orderAction;

    // if (orderAction) {
    //   this.logger.log(`Order ${event.orderId} has action: ${orderAction}`);

    //   switch (orderAction) {
    //     case 'TRIAL':
    //       await this.handleTrialOrderCreated(event);
    //       break;
    //     case 'WAIT':
    //       await this.handleWaitOrderCreated(event);
    //       break;
    //     case 'TRIAL_TO_PAID':
    //       await this.handleTrialToPaidOrderCreated(event);
    //       break;
    //     default:
    //       await this.handleRegularOrderCreated(event);
    //   }
    // } else {
    //   await this.handleRegularOrderCreated(event);
    // }

    // Thực hiện các hành động bổ sung
    // await this.sendNotifications(event);
    // await this.updateAnalytics(event);
    return updatedOrder;
  }

  private async handleTrialOrderCreated(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    this.logger.log(`Processing trial order: ${event.orderId}`);
    // Thêm logic xử lý trial order
    // - Thiết lập thời hạn trial
    // - Gửi email welcome trial
    // - Tạo lịch nhắc nhở
  }

  private async handleWaitOrderCreated(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    this.logger.log(`Processing wait order: ${event.orderId}`);
    // Thêm logic xử lý wait order
    // - Gửi thông báo chờ thanh toán
    // - Tạo QR code thanh toán
    // - Thiết lập timeout
  }

  private async handleTrialToPaidOrderCreated(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    this.logger.log(`Processing trial to paid conversion: ${event.orderId}`);
    // Thêm logic chuyển đổi trial sang paid
    // - Cập nhật license
    // - Gửi email xác nhận upgrade
    // - Cập nhật billing
  }

  private async handleRegularOrderCreated(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    this.logger.log(`Processing regular order: ${event.orderId}`);
    // Thêm logic xử lý order thông thường
    // - Xử lý payment
    // - Cập nhật inventory
    // - Gửi receipt
  }

  private async sendNotifications(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    try {
      this.logger.log(`Sending notifications for order: ${event.orderId}`);

      // Gửi email notification
      const emailData = {
        orderId: event.orderId,
        //customerInfo: event.orderData.metadata?.customer,
        orderStatus: event.orderData.status,
        timestamp: event.timestamp,
      };

      this.logger.log(`Email notification data: ${JSON.stringify(emailData)}`);

      // Gửi webhook notification
      const webhookData = {
        event: 'order.created',
        orderId: event.orderId,
        workspaceId: event.workspaceId,
        data: event.orderData,
        timestamp: event.timestamp,
      };

      this.logger.log(
        `Webhook notification data: ${JSON.stringify(webhookData)}`,
      );

      // Gửi SMS notification (nếu cần)
      // await this.smsService.sendOrderConfirmation(event);
    } catch (error) {
      this.logger.error(
        `Failed to send notifications for order: ${event.orderId}`,
        error,
      );
    }
  }

  private async updateAnalytics(event: MktOrderCustomEventData): Promise<void> {
    try {
      this.logger.log(`Updating analytics for order: ${event.orderId}`);

      const analyticsEvent = {
        event_name: 'mkt_order_created',
        event_time: event.timestamp,
        workspace_id: event.workspaceId,
        properties: {
          order_id: event.orderId,
          order_status: event.orderData.status,
          is_trial: event.orderData.trialLicense,
          // order_action: event.orderData.metadata?.orderAction,
          // has_variants: event.orderData.metadata?.variants?.length > 0,
          // has_payment_methods:
          //   event.orderData.metadata?.paymentMethods?.length > 0,
          // has_customer: !!event.orderData.metadata?.customer,
        },
      };

      this.logger.log(`Analytics event: ${JSON.stringify(analyticsEvent)}`);

      // Gửi đến analytics service
      // await this.analyticsService.track(analyticsEvent);

      // Cập nhật metrics
      // await this.metricsService.incrementOrderCount(event.workspaceId);
    } catch (error) {
      this.logger.error(
        `Failed to update analytics for order: ${event.orderId}`,
        error,
      );
    }
  }

  private async makeOrderHistoryData(
    eventType?: CustomEventName,
    updatedOrder?: MktOrderWorkspaceEntity,
  ) {
    let name = '';
    let action = '';
    let fieldName = '';
    let newValue = '';
    let oldValue = '';
    let note = '';

    switch (eventType) {
      case MKT_ORDER_EVENT_TYPES.ORDER_CREATED:
        name = 'Tạo hóa đơn';
        action = ORDER_HISTORY_ACTION.CREATED;
        fieldName = 'status';
        newValue = ORDER_STATUS.WAIT;
        oldValue = 'N/A';
        note = `Hóa đơn được tạo bởi ${updatedOrder?.createdBy?.name}`;
        break;
      case MKT_ORDER_EVENT_TYPES.ORDER_UPDATED:
        name = 'Cập nhật trạng thái';
        action = ORDER_HISTORY_ACTION.UPDATED;
        fieldName = 'status';
        newValue = ORDER_STATUS.COMPLETED;
        oldValue = 'N/A';
        break;
      case MKT_ORDER_EVENT_TYPES.ACCOUNTING_CONFIRMED:
        name = 'Cập nhật trạng thái';
        action = ORDER_HISTORY_ACTION.ACCOUNTING_CONFIRMED;
        fieldName = 'accountingConfirmed';
        newValue = 'true';
        oldValue = 'N/A';
        note = 'Trạng thái hiện tại: Kế toán đã xác nhận';
        break;
      case MKT_ORDER_EVENT_TYPES.FROM_LICENSE:
        name = 'Tạo từ bản quyền';
        action = ORDER_HISTORY_ACTION.LICENSE_UPDATED;
        break;
      default:
        name = 'Cập nhật trạng thái';
        action = ORDER_HISTORY_ACTION.UPDATED;
    }

    return { name, action, fieldName, newValue, oldValue, note };
  }
}
