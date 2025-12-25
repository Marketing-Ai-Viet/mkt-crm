import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';

import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_PAYMENT_STATUS } from 'src/mkt-core/seeder/constants/mkt-payment-data-seeds.constants';
import { MKT_TEMPLATE_DATA_SEEDS_IDS } from 'src/mkt-core/order/constants/mkt-template.constant';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity';
import { RequestSepayJWT } from 'src/mkt-core/payment/constants/payment.type';
import { SEPAY_WEBHOOK_MESSAGES } from 'src/mkt-core/payment/constants/sepay.constants';
import { FireBaseIntegrationService } from 'src/mkt-core/payment/integration/firebase-integration.service';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';
import { MktPaymentService } from 'src/mkt-core/payment/services/mkt-payment.service';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

type SepayWebhookPayload = {
  gateway: string; // "sepay",
  transactionDate: string; // "2025-09-24 10:45:51",
  accountNumber: string; // "0971304083",
  subAccount: string | null; // null,
  code: string; // "MKT20250924001",
  content: string; // "MKT20250924001",
  transferType: string; // "in",
  description: string; // "Payment for order MKT20250924001",
  transferAmount: number; // 55000,
  referenceCode: string; // "",
  accumulated: number; // 33648579,
  id: number; // 237046
};

// Choose guards based on environment flag
// Removed unused sepayGuards variable

@Injectable()
@Controller()
export class SepayPaymentController {
  private readonly logger = new Logger(SepayPaymentController.name);

  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly mktPaymentService: MktPaymentService,
    private readonly fireBaseIntegrationService: FireBaseIntegrationService,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  /**
   * Validate API key from authorization header
   * @param apiKey - The API key to validate
   * @returns boolean indicating if the API key is valid
   */
  private isValidApiKey(apiKey: string): boolean {
    // Get the valid API key from environment variable
    const validApiKey = process.env.SEPAY_WEBHOOK_API_KEY;

    if (!validApiKey) {
      this.logger.warn('SEPAY_WEBHOOK_API_KEY environment variable not set');

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
  @UseGuards(PublicEndpointGuard)
  @Post('hooks/sepay-payment')
  @HttpCode(HttpStatus.OK)
  async handleSepayPayment(
    @Body() payload: SepayWebhookPayload,
    @Req() request: RequestSepayJWT,
    @Headers('authorization') authorization?: string,
  ) {
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

    const workspaceId = process.env.SEPAY_WORKSPACE_ID;

    if (!workspaceId) {
      this.logger.error('Workspace ID is not available');

      return { success: true };
    }

    // Step 2: Idempotency check - kiểm tra giao dịch đã xử lý chưa
    const existingPayment =
      await this.mktPaymentService.findBySepayTransactionId(
        workspaceId,
        payload.id,
      );

    if (existingPayment) {
      this.logger.log(`Transaction ${payload.id} already processed, skipping`);

      return {
        success: true,
        message: SEPAY_WEBHOOK_MESSAGES.ALREADY_PROCESSED,
        data: { transactionId: payload.id, status: 'ALREADY_PROCESSED' },
      };
    }

    // Step 3: Find order by code
    const order = await this.mktPaymentService.findOneByOrderCode(
      workspaceId,
      payload.code,
    );

    if (!order) {
      this.logger.error(`Order not found for code: ${payload.code}`);

      return {
        success: true,
        message: SEPAY_WEBHOOK_MESSAGES.ORDER_NOT_FOUND,
        data: { transactionId: payload.id, status: 'UNMATCHED' },
      };
    }

    // Step 4: Amount validation - kiểm tra số tiền thanh toán
    const expectedAmount = order.totalAmount || 0;
    const receivedAmount = payload.transferAmount || 0;

    if (!MoneyUtils.equals(receivedAmount, expectedAmount)) {
      this.logger.warn(
        `Amount mismatch for order ${payload.code}: expected ${expectedAmount}, received ${receivedAmount}`,
      );

      // Nếu số tiền ít hơn - ghi nhận partial payment
      if (MoneyUtils.lessThan(receivedAmount, expectedAmount)) {
        this.logger.warn(`Partial payment detected for order ${payload.code}`);
        // TODO: Xử lý partial payment nếu cần
      }
      // Nếu số tiền nhiều hơn - vẫn xử lý nhưng log warning
    }

    // Step 5: Find payments for order
    const payments = await this.mktPaymentService.findPaymentsByOrderId(
      workspaceId,
      order.id,
    );

    if (payments.length === 0) {
      this.logger.warn(`No payments found for order ${order.id}`);

      return {
        success: true,
        message: SEPAY_WEBHOOK_MESSAGES.NO_PAYMENT,
        data: {
          transactionId: payload.id,
          matchedOrder: order.orderCode,
          status: 'NO_PAYMENT',
        },
      };
    }

    // Step 6: Update payment với sepayTransactionId
    const authContext: RequestSepayJWT = {
      user: request.user,
      workspaceId: request.workspaceId,
      workspaceMemberId: request.workspaceMemberId,
      userWorkspaceId: request.userWorkspaceId,
    };

    // Chỉ xử lý payment đầu tiên
    const [primaryPayment] = payments;

    await this.mktPaymentService.updatePaymentById(
      workspaceId,
      primaryPayment.id,
      {
        status: MKT_PAYMENT_STATUS.COMPLETED,
        paymentDate: payload.transactionDate,
        amount: payload.transferAmount,
        description: payload.content || payload.description,
        sepayTransactionId: String(payload.id), // Lưu transaction ID cho idempotency
      },
      authContext,
    );

    this.logger.log(
      `Payment ${primaryPayment.id} completed for order ${order.orderCode}`,
    );

    // Notify Firebase
    await this.fireBaseIntegrationService.completedOrderToFirebase(order);

    return {
      success: true,
      message: SEPAY_WEBHOOK_MESSAGES.SUCCESS,
      data: {
        transactionId: payload.id,
        matchedOrder: order.orderCode,
        status: 'MATCHED',
      },
    };
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
      const workspaceId = process.env.MKT_WORKSPACE_ID;

      if (!workspaceId) {
        this.logger.error('Workspace ID is not available');
        throw new NotFoundException('Workspace not configured');
      }

      // Find order by order code
      const order = await this.mktPaymentService.findOneByOrderCode(
        workspaceId,
        orderCode,
      );

      if (!order) {
        this.logger.error(`Order not found for code: ${orderCode}`);
        throw new NotFoundException(`Order ${orderCode} not found`);
      }

      // Find payments for this order
      const payments = await this.mktPaymentService.findPaymentsByOrderId(
        workspaceId,
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

      // Format expired_at if available
      let formattedExpiredAt = payment.expiredAt;

      if (formattedExpiredAt) {
        try {
          const expiredDate = new Date(formattedExpiredAt);

          formattedExpiredAt = expiredDate.toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
        } catch (error) {
          this.logger.warn('Error formatting expired_at:', error);
        }
      }

      const templateVariables = {
        customer_name: order.name || 'Khách hàng',
        order_code: orderCode,
        amount: payment.amount?.toLocaleString('vi-VN') || '0',
        currency: payment.currency || 'VND',
        qr_code_url: payment.qrCodeUrl || '',
        expired_at: formattedExpiredAt || '" - trong vòng 24h"',
        company_name: 'MKT CRM',
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
