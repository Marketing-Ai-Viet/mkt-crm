import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';

import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_PAYMENT_STATUS } from 'src/mkt-core/dev-seeder/constants/mkt-payment-data-seeds.constants';
import { MKT_TEMPLATE_DATA_SEEDS_IDS } from 'src/mkt-core/order/constants/mkt-template.constant';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-template.workspace-entity';
import { RequestSepayJWT } from 'src/mkt-core/payment/constants/payment.type';
import { FireBaseIntegrationService } from 'src/mkt-core/payment/integration/firebase-integration.service';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';
import { MktPaymentService } from 'src/mkt-core/payment/services/mkt-payment.service';

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

  // eslint-disable-next-line @nx/workspace-rest-api-methods-should-be-guarded
  @UseGuards(JwtAuthGuard, UserAuthGuard)
  @Post('hooks/sepay-payment')
  @HttpCode(HttpStatus.OK)
  async handleSepayPayment(
    @Body() payload: SepayWebhookPayload,
    @Req() request: RequestSepayJWT,
  ) {
    this.logger.warn('SEPAY_AUTH_ENABLED=' + process.env.SEPAY_AUTH_ENABLED);
    this.logger.log('Received sepay-payment webhook', payload);

    this.logger.log('Request user info', {
      user: request.user,
      workspaceId: request.workspaceId,
      workspaceMemberId: request.workspaceMemberId,
      userWorkspaceId: request.userWorkspaceId,
    });
    const workspaceId = process.env.SEPAY_WORKSPACE_ID;

    if (!workspaceId) {
      this.logger.error('Workspace ID is not available');

      return { success: true };
    }

    const order = await this.mktPaymentService.findOneByOrderCode(
      workspaceId,
      payload.code,
    );

    if (!order) {
      this.logger.error(`Order not found for code: ${payload.code}`);

      return { success: true };
    }

    const payments = await this.mktPaymentService.findPaymentsByOrderId(
      workspaceId,
      order.id,
    );

    if (payments.length === 0) {
      this.logger.warn(`No payments found for order ${order.id}`);
    }
    const authContext: RequestSepayJWT = {
      user: request.user,
      workspaceId: request.workspaceId,
      workspaceMemberId: request.workspaceMemberId,
      userWorkspaceId: request.userWorkspaceId,
    };

    for (const payment of payments) {
      await this.mktPaymentService.updatePaymentById(
        workspaceId,
        payment.id,
        {
          status: MKT_PAYMENT_STATUS.COMPLETED,
          paymentDate: payload.transactionDate,
          amount: payload.transferAmount,
          description: payload.content || payload.description,
        },
        authContext,
      );
      this.logger.log(`Updated payment ${payment.id} for order ${order.id}`);
      this.fireBaseIntegrationService.completedOrderToFirebase(order);
      break; // Assuming only one payment needs to be updated
    }

    return { success: true };
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

      // Replace all template variables
      Object.entries(templateVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');

        htmlContent = htmlContent.replace(regex, value || '');
      });

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
