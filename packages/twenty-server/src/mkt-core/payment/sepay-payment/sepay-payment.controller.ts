import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { Response } from 'express';

import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-email/workspace-entities';
import { MKT_TEMPLATE_DATA_SEEDS_IDS } from 'src/mkt-core/order/constants/mkt-template.constant';
import { paymentConfig } from 'src/mkt-core/payment/config';
import {
  SEPAY_TEMPLATE_DEFAULTS,
  VIETNAM_TIMEZONE,
} from 'src/mkt-core/payment/constants/sepay.constants';
import { SepayWebhookDto } from 'src/mkt-core/payment/dto';
import { IpWhitelistGuard } from 'src/mkt-core/payment/guards/ip-whitelist.guard';
import { MktPaymentWebhookService } from 'src/mkt-core/payment/services/mkt-payment-webhook.service';
import { MktPaymentService } from 'src/mkt-core/payment/services/mkt-payment.service';
import { SepayWebhookResponse } from 'src/mkt-core/payment/types';
import {
  RequestSepayJWT,
  SepayWebhookRequest,
} from 'src/mkt-core/payment/types/payment.type';
import {
  DATE_TIME_FORMATS,
  DateTimeUtils,
} from 'src/mkt-core/utils/date-time.utils';

// Choose guards based on environment flag
// Removed unused sepayGuards variable

@Injectable()
@Controller()
export class SepayPaymentController {
  private readonly logger = new Logger(SepayPaymentController.name);

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
    private readonly mktPaymentService: MktPaymentService,
    private readonly mktPaymentWebhookService: MktPaymentWebhookService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Validate API key from authorization header
   * @param apiKey - The API key to validate
   * @returns boolean indicating if the API key is valid
   */
  private isValidApiKey(apiKey: string): boolean {
    const validApiKey = this.config.sepay.webhookApiKey;

    if (!validApiKey) {
      this.logger.warn('SEPAY_WEBHOOK_API_KEY not configured');

      return false;
    }

    // Simple string comparison for API key validation
    const isValid = apiKey === validApiKey;

    if (!isValid) {
      this.logger.warn('Invalid API key provided');
    }

    return isValid;
  }

  /**
   * Extract and validate authorization header
   * @param authorization - Authorization header value
   * @returns Extracted API key if valid
   * @throws UnauthorizedException if invalid
   */
  private validateAuthorizationHeader(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    if (!authorization.startsWith('Apikey ')) {
      throw new UnauthorizedException(
        'Authorization header must start with "Apikey "',
      );
    }

    const apiKey = authorization.substring('Apikey '.length).trim();

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Always validate the API key against environment variable
    if (!this.isValidApiKey(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return apiKey;
  }

  // eslint-disable-next-line @nx/workspace-rest-api-methods-should-be-guarded
  @UseGuards(PublicEndpointGuard, IpWhitelistGuard)
  @Post('hooks/sepay-payment')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleSepayPayment(
    @Body() payload: SepayWebhookDto,
    @Req() request: SepayWebhookRequest,
    @Headers('authorization') authorization?: string,
  ): Promise<SepayWebhookResponse> {
    this.logger.log('Received sepay-payment webhook', {
      id: payload.id,
      code: payload.code,
    });

    // Step 1: Validate authorization header with API key from .env
    try {
      this.validateAuthorizationHeader(authorization);
      this.logger.log('API key validation successful');
    } catch (error) {
      this.logger.error('Authorization validation failed:', error.message);
      throw error;
    }

    const workspaceId = this.config.sepay.workspaceId;

    if (!workspaceId) {
      this.logger.error('SEPAY_WORKSPACE_ID is not configured');

      return { success: true };
    }

    // Step 2: Process payment with transaction (includes logging, validation, update)
    const authContext: RequestSepayJWT = {
      user: request.user,
      workspaceId: request.workspaceId,
      workspaceMemberId: request.workspaceMemberId,
      userWorkspaceId: request.userWorkspaceId,
    };

    // Get client IP address for logging
    const ipAddress =
      (request.headers?.['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      undefined;

    // Delegate all logic to webhook service with DB transaction
    const result = await this.mktPaymentWebhookService.processWebhookPayment(
      payload,
      authContext,
      ipAddress,
    );

    return result;
  }

  @UseGuards(PublicEndpointGuard)
  @Get('payment/:orderCode')
  @HttpCode(HttpStatus.OK)
  async getPaymentQR(
    @Param('orderCode') orderCode: string,
    @Res() response: Response,
  ) {
    this.logger.log(`Fetching payment QR for order: ${orderCode}`);

    try {
      const workspaceId = this.config.workspace.mktWorkspaceId;

      if (!workspaceId) {
        this.logger.error('MKT_WORKSPACE_ID is not configured');
        throw new NotFoundException('Workspace not configured');
      }

      // Find order by order code
      const order = await this.mktPaymentService.findOneByOrderCode(orderCode);

      if (!order) {
        this.logger.error(`Order not found for code: ${orderCode}`);
        throw new NotFoundException(`Order ${orderCode} not found`);
      }

      // Find payments for this order
      const payments = await this.mktPaymentService.findPaymentsByOrderId(
        order.id,
      );

      if (payments.length === 0) {
        this.logger.error(`No payments found for order ${order.id}`);
        throw new NotFoundException(`No payments found for order ${orderCode}`);
      }

      const payment = payments[0]; // Get first payment

      // Get SEPay QR template
      const templateRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktTemplateWorkspaceEntity>(
          workspaceId,
          'mktTemplate',
          { shouldBypassPermissionChecks: true },
        );

      const template = await templateRepository.findOne({
        where: { id: MKT_TEMPLATE_DATA_SEEDS_IDS.SEPAY_QR_ID },
      });

      if (!template) {
        this.logger.error('SEPay QR template not found');
        throw new NotFoundException('Payment template not found');
      }

      // Replace template variables
      let htmlContent = template.content || '';

      // Format expired_at if available using DateTimeUtils
      let formattedExpiredAt = payment.expiredAt;

      if (formattedExpiredAt) {
        try {
          const expiredDateTime = DateTimeUtils.fromISO(formattedExpiredAt);

          // Convert to Vietnam timezone and format
          formattedExpiredAt = expiredDateTime
            .setZone(VIETNAM_TIMEZONE)
            .toFormat(DATE_TIME_FORMATS.DISPLAY_DATE_TIME);
        } catch (error) {
          this.logger.warn('Error formatting expired_at:', error);
        }
      }

      const templateVariables = {
        customer_name:
          order.name || SEPAY_TEMPLATE_DEFAULTS.DEFAULT_CUSTOMER_NAME,
        order_code: orderCode,
        amount: payment.amount?.toLocaleString('vi-VN') || '0',
        currency: payment.currency || SEPAY_TEMPLATE_DEFAULTS.DEFAULT_CURRENCY,
        qr_code_url: payment.qrCodeUrl || '',
        expired_at:
          formattedExpiredAt || SEPAY_TEMPLATE_DEFAULTS.DEFAULT_EXPIRY_TEXT,
        company_name: SEPAY_TEMPLATE_DEFAULTS.COMPANY_NAME,
      };

      // Replace all template variables - sử dụng for...of thay vì forEach
      for (const [key, value] of Object.entries(templateVariables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');

        htmlContent = htmlContent.replace(regex, String(value ?? ''));
      }

      this.logger.log(`Generated payment page for order ${orderCode}`);

      // Return HTML response
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.send(htmlContent);
    } catch (error) {
      this.logger.error(`Error generating payment QR for ${orderCode}:`, error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      // Return error page
      const errorHtml = `
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
            <p>Không thể tải trang thanh toán cho đơn hàng: <strong>${orderCode}</strong></p>
            <p>Vui lòng thử lại sau hoặc liên hệ hỗ trợ.</p>
        </body>
        </html>
      `;

      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(errorHtml);
    }
  }
}
