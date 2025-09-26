import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { PublicEndpointGuard } from 'src/engine/guards/public-endpoint.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
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
const sepayGuards =
  process.env.SEPAY_AUTH_ENABLED === 'true'
    ? [JwtAuthGuard, UserAuthGuard]
    : [PublicEndpointGuard];

@Controller('hooks')
export class SepayPaymentController {
  private readonly logger = new Logger(SepayPaymentController.name);

  constructor(private readonly mktPaymentService: MktPaymentService) {}

  // eslint-disable-next-line @nx/workspace-rest-api-methods-should-be-guarded
  @UseGuards(...sepayGuards)
  @Post('sepay-payment')
  @HttpCode(HttpStatus.OK)
  async handleSepayPayment(@Body() payload: SepayWebhookPayload) {
    this.logger.warn('SEPAY_AUTH_ENABLED=' + process.env.SEPAY_AUTH_ENABLED);
    this.logger.log('Received sepay-payment webhook', payload);
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
    for (const payment of payments) {
      await this.mktPaymentService.updatePaymentById(workspaceId, payment.id, {
        status: 'COMPLETED',
        paymentDate: payload.transactionDate,
        amount: payload.transferAmount,
        description: payload.content || payload.description,
      });
      this.logger.log(`Updated payment ${payment.id} for order ${order.id}`);
      break; // Assuming only one payment needs to be updated
    }

    return { success: true };
  }
}
