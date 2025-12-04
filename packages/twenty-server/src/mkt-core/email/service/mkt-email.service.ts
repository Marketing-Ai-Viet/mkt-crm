import { Injectable, Logger } from '@nestjs/common';

import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_EMAIL_STATUS } from 'src/mkt-core/email/constants/mkt-email.constant';
import { MktEmailWorkspaceEntity } from 'src/mkt-core/email/objects/mkt-email.workspace-entity';
import {
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
} from 'src/mkt-core/order/constants';
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/order/constants/mkt-template.constant';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-template.workspace-entity';

@Injectable()
export class MktEmailService {
  private readonly logger = new Logger(MktEmailService.name);

  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly emailService: EmailService,
  ) {}

  async save(emailData: Partial<MktEmailWorkspaceEntity>) {
    try {
      const emailRepo = await this.mktRepo.getRepository(
        MktEmailWorkspaceEntity,
      );

      const email = emailRepo.create(emailData);

      await emailRepo.save(email);
    } catch (error) {
      this.logger.error('Failed to save email record', error);
    }
  }

  async sendOrderEmail(fullOrder: MktOrderWorkspaceEntity): Promise<void> {
    try {
      let templateKey = null;

      if (fullOrder?.status === ORDER_STATUS.WAIT) {
        templateKey = 'new_order_notification';
      }

      if (fullOrder?.status === ORDER_STATUS.TRIAL) {
        templateKey = 'order_trial_notification';
      }

      if (
        fullOrder?.status === ORDER_STATUS.COMPLETED &&
        fullOrder?.accountingConfirmed
      ) {
        templateKey = 'order_completed_notification';
      }

      if (!templateKey) return;

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
          templateKey,
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

      const mktOptionRepo = await this.mktRepo.getOptionRepository();
      const option = await mktOptionRepo.findOne({
        where: { key: 'default_trial_period_days' },
      });

      this.logger.log(`Using locale ${locale} for order email`);

      const companyName = 'Phần Mềm MKT';
      const customerName = fullOrder.mktCustomer.name || 'Quý khách';
      const customerEmail = fullOrder.mktCustomer.email || '';
      const customerPhone = fullOrder.mktCustomer.phone || 'N/A';
      const orderCode = fullOrder.orderCode;
      const orderTotal = this.formatCurrency(fullOrder.totalAmount || 0);

      const orderDate = new Date(fullOrder.createdAt).toLocaleString('vi-VN');
      const orderUrl = `${this.twentyConfigService.get('FRONTEND_URL')}/objects/mktOrder/${fullOrder.id}`;
      const shippingAddress = fullOrder.mktCustomer.address || 'Chưa cập nhật';
      const orderNotes = fullOrder.note || '';
      const qrCodeUrl = fullOrder?.mktPayments?.[0]?.qrCodeUrl || '';
      const paymentPageUrl = fullOrder.mktPayments?.[0]?.paymentPageUrl || '';
      const trialDuration = option ? parseInt(option.value) || 7 : 7; // Default trial duration in days

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
          (match, content) => (paymentPageUrl ? content : ''),
        );

        // Then process qr_code_url (outer)
        result = result.replace(
          /{{#if\s+qr_code_url\s*}}([\s\S]*?){{\/if\s*}}/g,
          (match, content) => (qrCodeUrl ? content : ''),
        );

        // Process order_notes
        result = result.replace(
          /{{#if\s+order_notes\s*}}([\s\S]*?){{\/if\s*}}/g,
          (match, content) => (orderNotes ? content : ''),
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
          trial_duration: trialDuration,
        };

        // Replace both {{ variable }} and { variable } patterns
        Object.entries(replacements).forEach(([key, value]) => {
          const pattern1 = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          const pattern2 = new RegExp(`{\\s*${key}\\s*}`, 'g');

          const stringValue = String(value ?? '');

          result = result
            .replace(pattern1, stringValue)
            .replace(pattern2, stringValue);
        });

        return result;
      };

      const subject = replaceAll(template.name || '');
      const html = replaceAll(template.content || '');

      const emailData = {
        from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
        to: fullOrder.mktCustomer.email,
        subject,
      };

      // Send email
      await this.emailService.send({ ...emailData, html });
      await this.save({
        ...emailData,
        body: html,
        status: MKT_EMAIL_STATUS.SENT,
        emailType: MKT_TEMPLATE_TYPE.ORDER_EMAIL,
        sentAt: new Date(),
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
}
