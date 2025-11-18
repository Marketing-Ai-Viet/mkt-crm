import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { CustomEventName } from 'src/engine/workspace-event-emitter/types/custom-event-name.type';
import {
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
} from 'src/mkt-core/common/common.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktCustomerQueueService } from 'src/mkt-core/customer/services';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';
import { MktLicenseEventService } from 'src/mkt-core/license/services/mkt-license.event.service';
import {
  ORDER_HISTORY_ACTION,
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
} from 'src/mkt-core/order/constants';
import { MktOrderHistoryWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-template.workspace-entity';

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
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
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

        if (updateOrder?.status === ORDER_STATUS.WAIT) {
          await this.sendOrderCreatedEmail(updateOrder);
        }

        this.logger.log(
          `check for send complete email ${updateOrder?.status} - ${updateOrder?.accountingConfirmed}`,
        );

        if (
          updateOrder?.status === ORDER_STATUS.COMPLETED &&
          updateOrder?.accountingConfirmed
        ) {
          await this.sendOrderCompletedEmail(updateOrder);
        }

        if (
          updateOrder?.status === ORDER_STATUS.OVERDUE ||
          updateOrder?.status === ORDER_STATUS.BLOCKED
        ) {
          this.logger.log(
            `Order ${updateOrder.id} has moved to OVERDUE status.`,
          );
          this.mktLicenseEventService.mktRepo.workspaceId = event.workspaceId;
          await this.mktLicenseEventService.lockLicensesFromOrder(updateOrder);
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

  private async handleTrialOrderCreated(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    this.logger.log(`Processing trial order: ${event.orderId}`);
  }

  private async handleWaitOrderCreated(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    this.logger.log(`Processing wait order: ${event.orderId}`);
  }

  private async handleTrialToPaidOrderCreated(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    this.logger.log(`Processing trial to paid conversion: ${event.orderId}`);
  }

  private async handleRegularOrderCreated(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    this.logger.log(`Processing regular order: ${event.orderId}`);
  }

  private async sendNotifications(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    try {
      this.logger.log(`Sending notifications for order: ${event.orderId}`);
      const emailData = {
        orderId: event.orderId,
        orderStatus: event.orderData.status,
        timestamp: event.timestamp,
      };

      this.logger.log(`Email notification data: ${JSON.stringify(emailData)}`);

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
        },
      };

      this.logger.log(`Analytics event: ${JSON.stringify(analyticsEvent)}`);
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

  private async sendOrderCreatedEmail(
    fullOrder: MktOrderWorkspaceEntity,
  ): Promise<void> {
    try {
      const templateRepo = await this.mktRepo.getRepository(
        MktTemplateWorkspaceEntity,
      );

      if (!fullOrder) {
        this.logger.warn(`Order not found, skipping email`);

        return;
      }

      // Check if customer has email
      if (!fullOrder.mktCustomer?.email) {
        this.logger.warn(`Order has no customer email, skipping notification`);

        return;
      }

      // Find email template for new order
      const template = await templateRepo.findOne({
        where: {
          templateKey: 'new_order_notification',
        },
      });

      if (!template) {
        this.logger.warn(
          'New order email template not found, skipping email send',
        );

        return;
      }

      // Determine locale - map from workspace member or default to VN
      // Map APP_LOCALES format (vi-VN, en) to template format (VN, EN)
      // const workspaceLocale = fullOrder.accountOwner?.locale || 'vi-VN';
      // const locale = workspaceLocale === 'vi-VN' ? 'VI' : 'EN';
      const locale = 'VI';
      const orderStatus =
        ORDER_STATUS_OPTIONS.labels?.[locale]?.[
          fullOrder?.status as ORDER_STATUS
        ] || 'Đang chờ xử lý';

      this.logger.log(`Using locale ${locale} for order email`);

      const companyName = 'Phần Mềm MKT';
      const customerName = fullOrder.mktCustomer.name || 'Quý khách';
      const customerEmail = fullOrder.mktCustomer.email || '';
      const customerPhone = fullOrder.mktCustomer.phone || 'N/A';
      const orderCode = fullOrder.orderCode;
      const orderTotal = this.formatCurrency(fullOrder.totalAmount || 0);
      // Get translated order status
      const _orderStatusTmp = this.getTranslatedOrderStatus(
        fullOrder.status || '',
        locale,
      );
      const orderDate = new Date(fullOrder.createdAt).toLocaleString('vi-VN');
      const orderUrl = `${this.twentyConfigService.get('FRONTEND_URL')}/objects/mktOrder/${fullOrder.id}`;
      const shippingAddress = fullOrder.mktCustomer.address || 'Chưa cập nhật';
      const orderNotes = fullOrder.note || '';
      const qrCodeUrl = fullOrder?.mktPayments?.[0]?.qrCodeUrl || '';
      const paymentPageUrl = fullOrder.mktPayments?.[0]?.paymentPageUrl || '';

      // Format order items as HTML table rows
      const orderItemsHtml =
        fullOrder.orderItems
          ?.map(
            (item) => `
                                    <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 12px; color: #111827; font-size: 14px;">
                                            ${item.name || 'Sản phẩm'}
                                        </td>
                                        <td style="padding: 12px; text-align: center; color: #6b7280; font-size: 14px;">
                                            ${item.quantity || 1}
                                        </td>
                                        <td style="padding: 12px; text-align: right; color: #111827; font-size: 14px; font-weight: 600;">
                                            ${this.formatCurrency(item.unitPrice || 0)}
                                        </td>
                                    </tr>`,
          )
          .join('') ||
        `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #6b7280;">Không có sản phẩm</td></tr>`;

      // Replace placeholders in template
      const replaceAll = (input: string) => {
        let result = input;

        // Step 1: Handle nested conditionals - process from innermost to outermost
        // First process payment_page_url (innermost)
        result = result.replace(
          /{{#if\s+payment_page_url\s*}}([\s\S]*?){{\/if\s*}}/g,
          paymentPageUrl ? '$1' : '',
        );

        // Then process qr_code_url (outer)
        result = result.replace(
          /{{#if\s+qr_code_url\s*}}([\s\S]*?){{\/if\s*}}/g,
          qrCodeUrl ? '$1' : '',
        );

        // Process order_notes
        result = result.replace(
          /{{#if\s+order_notes\s*}}([\s\S]*?){{\/if\s*}}/g,
          orderNotes ? '$1' : '',
        );

        // Step 2: Replace all placeholders with actual values AFTER conditionals
        const replacements = {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          company_name: companyName,
          order_number: orderCode,
          order_code: orderCode,
          order_value: orderTotal,
          order_total: orderTotal,
          order_status: orderStatus,
          order_date: orderDate,
          order_items: orderItemsHtml,
          order_url: orderUrl,
          shipping_address: shippingAddress,
          order_notes: orderNotes,
          qr_code_url: qrCodeUrl,
          payment_page_url: paymentPageUrl,
        };

        // Replace both {{ variable }} and { variable } patterns
        Object.entries(replacements).forEach(([key, value]) => {
          const pattern1 = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          const pattern2 = new RegExp(`{\\s*${key}\\s*}`, 'g');

          result = result.replace(pattern1, value).replace(pattern2, value);
        });

        return result;
      };

      const subject = replaceAll(template.name || '');
      const html = replaceAll(template.content || '');

      // Send email
      await this.emailService.send({
        from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
        to: fullOrder.mktCustomer.email,
        subject,
        html,
      });

      this.logger.log(
        `Sent order notification email for order to ${fullOrder.mktCustomer.email}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send order notification email for order`);
      // Don't throw - we don't want email failures to break order creation
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  /**
   * Get translated order status based on locale
   * @param status - The ORDER_STATUS enum value
   * @param locale - The locale (EN or VI)
   * @returns Translated status label
   */
  private getTranslatedOrderStatus(
    status: string,
    locale: 'EN' | 'VI' = 'VI',
  ): string {
    const labels = ORDER_STATUS_OPTIONS.labels[locale];

    if (!labels || !status) {
      return status || 'Đang chờ xử lý';
    }

    return labels[status as keyof typeof labels] || status;
  }

  private async sendOrderCompletedEmail(
    fullOrder: MktOrderWorkspaceEntity,
  ): Promise<void> {
    try {
      // Set workspace context
      const templateRepo = await this.mktRepo.getRepository(
        MktTemplateWorkspaceEntity,
      );

      // Fetch full order with relations
      if (!fullOrder) {
        this.logger.warn(`Order not found, skipping email`);

        return;
      }

      // Check if customer has email
      if (!fullOrder.mktCustomer?.email) {
        this.logger.warn(`Order has no customer email, skipping notification`);

        return;
      }

      // Find email template for completed order
      const template = await templateRepo.findOne({
        where: {
          templateKey: 'order_completed_notification',
        },
      });

      if (!template) {
        this.logger.warn(
          'Order completed email template not found, skipping email send',
        );

        return;
      }

      // Determine locale
      const locale = 'VI';
      const orderStatus =
        ORDER_STATUS_OPTIONS.labels?.[locale]?.[
          fullOrder?.status as ORDER_STATUS
        ] || 'Hoàn thành';

      this.logger.log(`Using locale ${locale} for order completion email`);

      const companyName = 'Phần Mềm MKT';
      const customerName = fullOrder.mktCustomer.name || 'Quý khách';
      const orderCode = fullOrder.orderCode;
      const orderTotal = this.formatCurrency(fullOrder.totalAmount || 0);
      const orderDate = new Date().toLocaleString('vi-VN');
      const orderUrl = `${this.twentyConfigService.get('FRONTEND_URL')}/objects/mktOrder/${fullOrder.id}`;

      // Format order items as HTML table rows
      const orderItemsHtml =
        fullOrder.orderItems
          ?.map(
            (item) => `
                                    <tr style="border-bottom: 1px solid #f3f4f6;">
                                        <td style="padding: 12px; color: #111827; font-size: 14px;">
                                            ${item.name || 'Sản phẩm'}
                                        </td>
                                        <td style="padding: 12px; text-align: center; color: #6b7280; font-size: 14px;">
                                            ${item.quantity || 1}
                                        </td>
                                        <td style="padding: 12px; text-align: right; color: #111827; font-size: 14px; font-weight: 600;">
                                            ${this.formatCurrency(item.unitPrice || 0)}
                                        </td>
                                    </tr>`,
          )
          .join('') ||
        `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #6b7280;">Không có sản phẩm</td></tr>`;

      // Replace placeholders in template
      const replaceAll = (input: string) => {
        let result = input;

        const replacements = {
          customer_name: customerName,
          company_name: companyName,
          order_number: orderCode,
          order_code: orderCode,
          order_total: orderTotal,
          order_status: orderStatus,
          order_date: orderDate,
          order_items: orderItemsHtml,
          order_url: orderUrl,
        };

        // Replace both {{ variable }} and { variable } patterns
        Object.entries(replacements).forEach(([key, value]) => {
          const pattern1 = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          const pattern2 = new RegExp(`{\\s*${key}\\s*}`, 'g');

          result = result.replace(pattern1, value).replace(pattern2, value);
        });

        return result;
      };

      const subject = replaceAll(template.name || '');
      const html = replaceAll(template.content || '');

      // Send email
      await this.emailService.send({
        from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
        to: fullOrder.mktCustomer.email,
        subject,
        html,
      });

      this.logger.log(
        `Sent order completed email for order to ${fullOrder.mktCustomer.email}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send order completed email for order`);
      // Don't throw - we don't want email failures to break order processing
    }
  }
}
