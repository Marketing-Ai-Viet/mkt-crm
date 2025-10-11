import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { CustomEventName } from 'src/engine/workspace-event-emitter/types/custom-event-name.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
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

  @OnEvent('mktOrder.custom')
  async handleMktOrderCustom(payload: MktOrderCustomEventPayload) {
    this.logger.log(
      `Received mktOrderCustom event for workspace: ${payload.workspaceId}`,
    );

    for (const event of payload.events) {
      try {
        const updateOrder = await this.processOrderCustomEvent(event);

        await this.pushLicenseHistory(updateOrder);
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
    const license = updateOrder?.mktLicense?.[0] as MktLicenseWorkspaceEntity;

    if (!license) {
      this.logger.warn(`No license associated with the order`);

      return;
    }

    const licenseRepo = await this.mktRepo.getRepository(
      MktLicenseHistoryWorkspaceEntity,
    );

    // const userName =
    //       authContext.user?.firstName && authContext.user?.lastName
    //         ? `${authContext.user.firstName} ${authContext.user.lastName}`
    //         : authContext.user?.email || 'Unknown User';

    const newLicenseHistory = licenseRepo.create({
      name: 'Bản quyền được kích hoạt',
      action: license.status,
      note: 'Khách hàng đã kích hoạt thành công bản quyền',
      mktLicenseId: license.id,
      createdBy: updateOrder.createdBy,
      // createdBy: {
      //   source: FieldActorSource.MANUAL,
      //   workspaceMemberId: authContext.workspaceMemberId || null,
      //   name: userName,
      //   context: {},
      // },
    });

    // Explicitly set createdBy after create
    // newLicenseHistory.createdBy = {
    //   source: FieldActorSource.MANUAL,
    //   workspaceMemberId: authContext.workspaceMemberId || null,
    //   name: userName,
    //   context: {},
    // };

    await licenseRepo.save(newLicenseHistory);

    // Push license history logic here
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
    const orderHistory = orderHistoryRepo.create({
      name: `${event?.orderData?.note ?? ''} - ${event.eventType}`,
      mktOrderId: event.orderId,
      action: null,
      metadata: updatedOrder as MktOrderWorkspaceEntity as unknown as JSON,
      note: `Order ${event.orderId} updated with total ${updatedOrder.totalAmount}`,
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
}
