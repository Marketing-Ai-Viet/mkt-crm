import { Injectable, Logger } from '@nestjs/common';

import Handlebars from 'handlebars';

import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_CUSTOMER_NAME,
  DEFAULT_LOCALE,
  DEFAULT_TRIAL_PERIOD_DAYS,
  MKT_EMAIL_STATUS,
  ORDER_STATUS_TEMPLATE_MAP,
} from 'src/mkt-core/mkt-email/constants';
import {
  EMAIL_MESSAGES,
  MKT_EMAIL_LOG_CONTEXT,
} from 'src/mkt-core/mkt-email/messages';
import {
  MktEmailRepository,
  MktTemplateRepository,
} from 'src/mkt-core/mkt-email/repositories';
import {
  EmailSenderConfig,
  OrderEmailReplacements,
} from 'src/mkt-core/mkt-email/types';
import {
  MktEmailWorkspaceEntity,
  MktTemplateWorkspaceEntity,
} from 'src/mkt-core/mkt-email/workspace-entities';
import {
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
} from 'src/mkt-core/order/constants';
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/order/constants/mkt-template.constant';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOptionRepository } from 'src/mkt-core/setting/repositories';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktEmailService - Business logic layer for Email entity
 *
 * Responsibilities:
 * - Email sending logic
 * - Order notification emails
 * - Template processing
 */
@Injectable()
export class MktEmailService {
  private readonly logger = new Logger(`${MKT_EMAIL_LOG_CONTEXT}:Service`);

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly emailService: EmailService,
    private readonly emailRepository: MktEmailRepository,
    private readonly templateRepository: MktTemplateRepository,
    private readonly optionRepository: MktOptionRepository,
  ) {}

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Save email record using repository
   */
  async save(emailData: Partial<MktEmailWorkspaceEntity>): Promise<void> {
    try {
      await this.emailRepository.save(emailData);

      if (emailData.to) {
        this.logger.debug(EMAIL_MESSAGES.LOG.SAVE_SUCCESS(emailData.to));
      }
    } catch (error) {
      this.logger.error(EMAIL_MESSAGES.ERROR.SAVE_FAILED, error);
    }
  }

  /**
   * Send order notification email
   * Refactored để giảm complexity
   */
  async sendOrderEmail(
    fullOrder: MktOrderWorkspaceEntity,
    senderConfig?: EmailSenderConfig,
  ): Promise<void> {
    try {
      // Bước 1: Xác định template key dựa trên status
      const templateKey = this.getTemplateKeyForOrderStatus(fullOrder);

      if (!templateKey) {
        this.logger.debug(
          EMAIL_MESSAGES.WARN.NO_TEMPLATE_FOR_STATUS(fullOrder?.status ?? ''),
        );

        return;
      }

      // Bước 2: Validate order có đủ thông tin để gửi email
      const validationError = this.validateOrderForEmail(fullOrder);

      if (validationError) {
        this.logger.warn(validationError);

        return;
      }

      // Bước 3: Lấy template từ database
      const template = await this.findEmailTemplate(templateKey);

      if (!template) {
        this.logger.warn(EMAIL_MESSAGES.WARN.TEMPLATE_NOT_FOUND(templateKey));

        return;
      }

      // Bước 4: Build template variables
      const replacements = await this.buildEmailTemplateVariables(fullOrder);

      // Bước 5: Compile template và gửi email
      await this.processAndSendEmail(
        fullOrder,
        template,
        replacements,
        senderConfig,
      );
    } catch (error) {
      this.logger.error(
        EMAIL_MESSAGES.ERROR.ORDER_EMAIL_FAILED(fullOrder?.id ?? 'unknown'),
      );
      // Don't throw - we don't want email failures to break order creation
    }
  }

  // ============================================
  // PRIVATE METHODS - Template Key Resolution
  // ============================================

  /**
   * Xác định template key dựa trên order status
   */
  private getTemplateKeyForOrderStatus(
    order: MktOrderWorkspaceEntity | null,
  ): string | null {
    if (!order?.status) {
      return null;
    }

    // Case đặc biệt: COMPLETED cần kiểm tra accountingConfirmed
    if (order.status === ORDER_STATUS.COMPLETED && order.accountingConfirmed) {
      return 'order_completed_notification';
    }

    // Các case khác dựa vào mapping
    const templateKey = ORDER_STATUS_TEMPLATE_MAP[order.status as ORDER_STATUS];

    if (typeof templateKey === 'string') {
      return templateKey;
    }

    return null;
  }

  // ============================================
  // PRIVATE METHODS - Validation
  // ============================================

  /**
   * Validate order có đủ thông tin để gửi email
   * Returns error message nếu invalid, null nếu valid
   */
  private validateOrderForEmail(
    order: MktOrderWorkspaceEntity | null,
  ): string | null {
    if (!order) {
      return EMAIL_MESSAGES.WARN.ORDER_NOT_FOUND('unknown');
    }

    if (!order.mktCustomer?.email) {
      return EMAIL_MESSAGES.WARN.ORDER_NO_CUSTOMER_EMAIL;
    }

    return null;
  }

  // ============================================
  // PRIVATE METHODS - Template Operations
  // ============================================

  /**
   * Tìm email template từ database
   * Uses MktTemplateRepository for thread-safe access
   */
  private async findEmailTemplate(
    templateKey: string,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    return this.templateRepository.findByKey(templateKey);
  }

  /**
   * Build template variables từ order data
   */
  private async buildEmailTemplateVariables(
    order: MktOrderWorkspaceEntity,
  ): Promise<OrderEmailReplacements> {
    const locale = DEFAULT_LOCALE;
    const orderStatus =
      ORDER_STATUS_OPTIONS.labels?.[locale]?.[order.status as ORDER_STATUS] ||
      'Đang chờ xử lý';

    // Lấy trial period từ options
    const trialDuration = await this.getTrialPeriodDays();

    this.logger.log(EMAIL_MESSAGES.LOG.USING_LOCALE(locale));

    return {
      customer_name: order.mktCustomer?.name || DEFAULT_CUSTOMER_NAME,
      customer_email: order.mktCustomer?.email || '',
      customer_phone: order.mktCustomer?.phone || 'N/A',
      company_name: DEFAULT_COMPANY_NAME,
      order_number: order.orderCode ?? '',
      order_code: order.orderCode ?? '',
      order_value: this.formatCurrency(order.totalAmount || 0),
      order_total: this.formatCurrency(order.totalAmount || 0),
      order_status: orderStatus,
      order_date: this.formatOrderDate(order.createdAt),
      order_items: this.formatOrderItemsHtml(order.orderItems),
      order_url: this.buildOrderUrl(order.id),
      shipping_address: order.mktCustomer?.address || 'Chưa cập nhật',
      order_notes: order.note || '',
      qr_code_url: order.mktPayments?.[0]?.qrCodeUrl || '',
      payment_page_url: order.mktPayments?.[0]?.paymentPageUrl || '',
      trial_duration: trialDuration,
    };
  }

  /**
   * Lấy trial period days từ MktOption
   * Uses MktOptionRepository for thread-safe access
   */
  private async getTrialPeriodDays(): Promise<number> {
    try {
      return this.optionRepository.getNumberValue(
        'default_trial_period_days',
        DEFAULT_TRIAL_PERIOD_DAYS,
      );
    } catch {
      return DEFAULT_TRIAL_PERIOD_DAYS;
    }
  }

  /**
   * Format order items thành HTML table rows
   */
  private formatOrderItemsHtml(
    items: MktOrderWorkspaceEntity['orderItems'],
  ): string {
    if (!items || items.length === 0) {
      return '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #6b7280;">Không có sản phẩm</td></tr>';
    }

    return items
      .map(
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
      .join('');
  }

  /**
   * Compile template string with Handlebars
   * Uses noEscape since templates contain HTML content
   */
  private compileTemplate(
    template: string,
    replacements: OrderEmailReplacements,
  ): string {
    const compiled = Handlebars.compile(template, { noEscape: true });

    return compiled(replacements);
  }

  // ============================================
  // PRIVATE METHODS - Email Sending
  // ============================================

  /**
   * Process template và gửi email
   * Status flow: QUEUED → SENT (success) / FAILED (error)
   */
  private async processAndSendEmail(
    order: MktOrderWorkspaceEntity,
    template: MktTemplateWorkspaceEntity,
    replacements: OrderEmailReplacements,
    senderConfig?: EmailSenderConfig,
  ): Promise<void> {
    const customerEmail = order.mktCustomer?.email;

    if (!customerEmail) {
      this.logger.warn(EMAIL_MESSAGES.WARN.ORDER_NO_CUSTOMER_EMAIL);

      return;
    }

    const subject = this.compileTemplate(template.name || '', replacements);
    const html = this.compileTemplate(template.content || '', replacements);

    const fromName =
      senderConfig?.fromName || this.twentyConfigService.get('EMAIL_FROM_NAME');
    const fromAddress =
      senderConfig?.fromAddress ||
      this.twentyConfigService.get('EMAIL_FROM_ADDRESS');

    const emailData = {
      from: `${fromName} <${fromAddress}>`,
      to: customerEmail,
      subject,
    };

    // Bước 1: Lưu record với status QUEUED
    const savedEmail = await this.emailRepository.createEmail({
      ...emailData,
      body: html,
      status: MKT_EMAIL_STATUS.QUEUED,
      emailType: MKT_TEMPLATE_TYPE.ORDER_EMAIL,
      sentAt: DateTimeUtils.now().toJSDate(),
    });

    this.logger.log(
      EMAIL_MESSAGES.LOG.EMAIL_QUEUED(savedEmail.id, customerEmail),
    );

    // Bước 2: Gửi email và cập nhật status
    try {
      await this.emailService.send({ ...emailData, html });

      await this.emailRepository.updateEmail(savedEmail.id, {
        status: MKT_EMAIL_STATUS.SENT,
      });

      this.logger.log(
        EMAIL_MESSAGES.LOG.SEND_ORDER_EMAIL_SUCCESS(order.id, customerEmail),
      );
    } catch (error) {
      await this.emailRepository.updateEmail(savedEmail.id, {
        status: MKT_EMAIL_STATUS.FAILED,
      });

      this.logger.error(EMAIL_MESSAGES.ERROR.QUEUE_FAILED(customerEmail));
    }
  }

  // ============================================
  // PRIVATE METHODS - Utilities
  // ============================================

  private getWorkspaceId(): string {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new Error(EMAIL_MESSAGES.ERROR.WORKSPACE_NOT_FOUND);
    }

    return workspaceId;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  private formatOrderDate(createdAt: Date | string): string {
    const fallbackDate = DateTimeUtils.now().toJSDate();

    if (!createdAt) {
      return fallbackDate.toLocaleString('vi-VN');
    }

    const dateTime =
      typeof createdAt === 'string'
        ? DateTimeUtils.fromISO(createdAt)
        : DateTimeUtils.fromDate(createdAt);

    const jsDate = dateTime.isValid ? dateTime.toJSDate() : fallbackDate;

    return jsDate.toLocaleString('vi-VN');
  }

  private buildOrderUrl(orderId: string): string {
    return `${this.twentyConfigService.get('FRONTEND_URL')}/objects/mktOrder/${orderId}`;
  }
}
