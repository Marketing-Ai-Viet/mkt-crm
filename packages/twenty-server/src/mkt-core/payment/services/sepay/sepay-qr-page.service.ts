import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-email/workspace-entities';
import { MKT_TEMPLATE_DATA_SEEDS_IDS } from 'src/mkt-core/order/constants/mkt-template.constant';
import { paymentConfig } from 'src/mkt-core/payment/config';
import {
  SEPAY_TEMPLATE_DEFAULTS,
  VIETNAM_TIMEZONE,
} from 'src/mkt-core/payment/constants/sepay.constants';
import { MktPaymentService } from 'src/mkt-core/payment/services/core';
import {
  DATE_TIME_FORMATS,
  DateTimeUtils,
} from 'src/mkt-core/utils/date-time.utils';

// ============================================
// TYPES
// ============================================

/**
 * Template variables for QR payment page
 */
type QrPageTemplateVariables = {
  customer_name: string;
  order_code: string;
  amount: string;
  currency: string;
  qr_code_url: string;
  expired_at: string;
  company_name: string;
};

/**
 * Result from generating QR page
 */
export type QrPageResult = {
  success: true;
  htmlContent: string;
};

// ============================================
// CONSTANTS
// ============================================

const QR_PAGE_MESSAGES = {
  LOG: {
    FETCHING_QR: (orderCode: string) =>
      `Fetching payment QR for order: ${orderCode}`,
    PAGE_GENERATED: (orderCode: string) =>
      `Generated payment page for order ${orderCode}`,
    DATE_FORMAT_ERROR: 'Error formatting expired_at',
  },
  ERROR: {
    WORKSPACE_NOT_CONFIGURED: 'Workspace not configured',
    ORDER_NOT_FOUND: (orderCode: string) => `Order ${orderCode} not found`,
    NO_PAYMENTS: (orderCode: string) =>
      `No payments found for order ${orderCode}`,
    TEMPLATE_NOT_FOUND: 'Payment template not found',
  },
} as const;

// ============================================
// SERVICE
// ============================================

/**
 * SepayQrPageService - Generates QR payment page HTML
 *
 * Responsibilities:
 * - Fetch order and payment data
 * - Fetch and render QR page template
 * - Replace template variables
 * - Generate error pages
 *
 * Does NOT handle:
 * - HTTP response handling (handled by controller)
 * - Authentication (handled by guards/auth service)
 */
@Injectable()
export class SepayQrPageService {
  private readonly logger = new Logger(SepayQrPageService.name);

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
    private readonly mktPaymentService: MktPaymentService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Generate QR payment page HTML for an order
   *
   * @param orderCode - The order code to generate page for
   * @returns HTML content for the payment page
   * @throws NotFoundException if order, payment, or template not found
   */
  async generateQrPage(orderCode: string): Promise<QrPageResult> {
    this.logger.log(QR_PAGE_MESSAGES.LOG.FETCHING_QR(orderCode));

    const workspaceId = this.config.workspace.mktWorkspaceId;

    if (!workspaceId) {
      this.logger.error(QR_PAGE_MESSAGES.ERROR.WORKSPACE_NOT_CONFIGURED);
      throw new NotFoundException(
        QR_PAGE_MESSAGES.ERROR.WORKSPACE_NOT_CONFIGURED,
      );
    }

    // Tìm order theo order code
    const order = await this.mktPaymentService.findOneByOrderCode(orderCode);

    if (!order) {
      this.logger.error(QR_PAGE_MESSAGES.ERROR.ORDER_NOT_FOUND(orderCode));
      throw new NotFoundException(
        QR_PAGE_MESSAGES.ERROR.ORDER_NOT_FOUND(orderCode),
      );
    }

    // Tìm payments cho order
    const payments = await this.mktPaymentService.findPaymentsByOrderId(
      order.id,
    );

    if (payments.length === 0) {
      this.logger.error(QR_PAGE_MESSAGES.ERROR.NO_PAYMENTS(orderCode));
      throw new NotFoundException(
        QR_PAGE_MESSAGES.ERROR.NO_PAYMENTS(orderCode),
      );
    }

    const payment = payments[0];

    // Lấy template từ DB
    const template = await this.fetchQrTemplate(workspaceId);

    if (!template) {
      this.logger.error(QR_PAGE_MESSAGES.ERROR.TEMPLATE_NOT_FOUND);
      throw new NotFoundException(QR_PAGE_MESSAGES.ERROR.TEMPLATE_NOT_FOUND);
    }

    // Tạo template variables
    const templateVariables = this.buildTemplateVariables(
      order,
      payment,
      orderCode,
    );

    // Replace variables trong template
    const htmlContent = this.renderTemplate(
      template.content || '',
      templateVariables,
    );

    this.logger.log(QR_PAGE_MESSAGES.LOG.PAGE_GENERATED(orderCode));

    return {
      success: true,
      htmlContent,
    };
  }

  /**
   * Generate error page HTML
   *
   * @param orderCode - The order code that caused error
   * @returns Error page HTML
   */
  generateErrorPage(orderCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Lỗi thanh toán</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: #dc3545; }
          </style>
      </head>
      <body>
          <h1 class="error">❌ Có lỗi xảy ra</h1>
          <p>Không thể tải trang thanh toán cho đơn hàng: <strong>${this.escapeHtml(orderCode)}</strong></p>
          <p>Vui lòng thử lại sau hoặc liên hệ hỗ trợ.</p>
      </body>
      </html>
    `;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Fetch QR template from database
   */
  private async fetchQrTemplate(
    workspaceId: string,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    const templateRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktTemplateWorkspaceEntity>(
        workspaceId,
        'mktTemplate',
        { shouldBypassPermissionChecks: true },
      );

    return templateRepository.findOne({
      where: { id: MKT_TEMPLATE_DATA_SEEDS_IDS.SEPAY_QR_ID },
    });
  }

  /**
   * Build template variables from order and payment data
   */
  private buildTemplateVariables(
    order: { name?: string },
    payment: {
      amount?: number;
      currency?: string;
      qrCodeUrl?: string;
      expiredAt?: string;
    },
    orderCode: string,
  ): QrPageTemplateVariables {
    return {
      customer_name:
        order.name || SEPAY_TEMPLATE_DEFAULTS.DEFAULT_CUSTOMER_NAME,
      order_code: orderCode,
      amount: payment.amount?.toLocaleString('vi-VN') || '0',
      currency: payment.currency || SEPAY_TEMPLATE_DEFAULTS.DEFAULT_CURRENCY,
      qr_code_url: payment.qrCodeUrl || '',
      expired_at: this.formatExpiredAt(payment.expiredAt),
      company_name: SEPAY_TEMPLATE_DEFAULTS.COMPANY_NAME,
    };
  }

  /**
   * Format expired_at date for display
   */
  private formatExpiredAt(expiredAt: string | undefined): string {
    if (!expiredAt) {
      return SEPAY_TEMPLATE_DEFAULTS.DEFAULT_EXPIRY_TEXT;
    }

    try {
      const expiredDateTime = DateTimeUtils.fromISO(expiredAt);

      return expiredDateTime
        .setZone(VIETNAM_TIMEZONE)
        .toFormat(DATE_TIME_FORMATS.DISPLAY_DATE_TIME);
    } catch (error) {
      this.logger.warn(QR_PAGE_MESSAGES.LOG.DATE_FORMAT_ERROR, error);

      return SEPAY_TEMPLATE_DEFAULTS.DEFAULT_EXPIRY_TEXT;
    }
  }

  /**
   * Render template by replacing variables
   */
  private renderTemplate(
    templateContent: string,
    variables: QrPageTemplateVariables,
  ): string {
    let htmlContent = templateContent;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');

      htmlContent = htmlContent.replace(regex, String(value ?? ''));
    }

    return htmlContent;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char);
  }
}
