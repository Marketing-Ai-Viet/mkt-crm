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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { Response } from 'express';

import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { paymentConfig } from 'src/mkt-core/payment/config';
import { SepayWebhookDto } from 'src/mkt-core/payment/dto';
import { IpWhitelistGuard } from 'src/mkt-core/payment/guards/ip-whitelist.guard';
import { MktPaymentWebhookService } from 'src/mkt-core/payment/services/mkt-payment-webhook.service';
import { SepayAuthService } from 'src/mkt-core/payment/services/sepay-auth.service';
import { SepayQrPageService } from 'src/mkt-core/payment/services/sepay-qr-page.service';
import { SepayWebhookResponse } from 'src/mkt-core/payment/types';
import {
  RequestSepayJWT,
  SepayWebhookRequest,
} from 'src/mkt-core/payment/types/payment.type';

@Injectable()
@Controller()
export class SepayPaymentController {
  private readonly logger = new Logger(SepayPaymentController.name);

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
    private readonly mktPaymentWebhookService: MktPaymentWebhookService,
    private readonly sepayAuthService: SepayAuthService,
    private readonly sepayQrPageService: SepayQrPageService,
  ) {}

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

    // Step 1: Validate authorization header - delegate to auth service
    this.sepayAuthService.validateAuthorizationHeader(authorization);

    const workspaceId = this.config.sepay.workspaceId;

    if (!workspaceId) {
      this.logger.error('SEPAY_WORKSPACE_ID is not configured');

      return { success: true };
    }

    // Step 2: Build auth context from request
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

    // Step 3: Delegate payment processing to webhook service
    return this.mktPaymentWebhookService.processWebhookPayment(
      payload,
      authContext,
      ipAddress,
    );
  }

  @UseGuards(PublicEndpointGuard)
  @Get('payment/:orderCode')
  @HttpCode(HttpStatus.OK)
  async getPaymentQR(
    @Param('orderCode') orderCode: string,
    @Res() response: Response,
  ) {
    try {
      // Delegate QR page generation to service
      const result = await this.sepayQrPageService.generateQrPage(orderCode);

      // Return HTML response
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.send(result.htmlContent);
    } catch (error) {
      this.logger.error(`Error generating payment QR for ${orderCode}:`, error);

      // Re-throw NotFoundException để NestJS xử lý đúng HTTP status
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Return error page for unexpected errors
      const errorHtml = this.sepayQrPageService.generateErrorPage(orderCode);

      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(errorHtml);
    }
  }
}
