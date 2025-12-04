import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { firstValueFrom } from 'rxjs';

import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import {
  BidvSepayApiResponse,
  BidvSepayOrderRequest,
} from 'src/mkt-core/payment/types/bidv-sepay.types';

@Injectable()
export class MktPaymentPrepareService {
  private readonly logger = new Logger(MktPaymentPrepareService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly httpService: HttpService,
  ) {}

  async prepareCreateOnePayload(
    payload: CreateOneResolverArgs<MktPaymentWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktPaymentWorkspaceEntity>> {
    const input = payload?.data;
    const workspaceId =
      this.scopedWorkspaceContextFactory.create().workspaceId || '';

    if (!workspaceId || !input?.mktOrderId) {
      this.logger.warn('Missing workspaceId or mktOrderId in payment creation');

      return payload;
    }

    try {
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
          workspaceId,
          'mktOrder',
          { shouldBypassPermissionChecks: true },
        );

      const order = await orderRepository.findOne({
        where: { id: input.mktOrderId },
      });

      if (!order) {
        this.logger.warn(`Order not found with id: ${input.mktOrderId}`);

        return payload;
      }

      // amount
      if (!input.amount && order.totalAmount) {
        payload.data = { ...payload.data, amount: order.totalAmount };
        this.logger.log(
          `Copied amount ${order.totalAmount} from order ${order.id}`,
        );
      }

      // name
      if (!input.name && (order.orderCode || order.name)) {
        const orderCode = order.orderCode || '';
        const orderName = order.name || '';
        const paymentName =
          orderCode && orderName
            ? `${orderCode}-${orderName}`
            : orderCode || orderName || 'Payment';

        payload.data = { ...payload.data, name: paymentName };
        this.logger.log(`Generated payment name: ${paymentName}`);
      }

      // currency
      if (!input.currency && order?.currency) {
        payload.data = { ...payload.data, currency: order.currency };
        this.logger.log(
          `Copied currency ${order.currency} from order ${order.id}`,
        );
      }
    } catch (error) {
      this.logger.error('Error while preparing payment payload:', error);
    }

    return payload;
  }

  async prepareCreatePayment(
    data: Partial<MktPaymentWorkspaceEntity>,
  ): Promise<Partial<MktPaymentWorkspaceEntity>> {
    const prepared = await this.prepareCreateOnePayload({
      data,
    } as CreateOneResolverArgs<MktPaymentWorkspaceEntity>);

    return prepared.data as Partial<MktPaymentWorkspaceEntity>;
  }

  async _draftSepayQrCodeUrl(
    mktPaymentMethod: MktPaymentMethodWorkspaceEntity,
    customAmount?: number,
    orderCode?: string | null,
  ) {
    const result: { qrCodeUrl: string; expiredAt: string | null } = {
      qrCodeUrl: '',
      expiredAt: null,
    };

    this.logger.log('Generating SEPay QR code URL...');
    if (mktPaymentMethod?.name !== 'SEPay QR') return result;

    // Check if BIDV business mode is enabled
    const isBidvBusiness = process.env.IS_BIDV_BUSINESS === 'true';

    if (isBidvBusiness) {
      return this.generateBidvSepayQr(customAmount, orderCode);
    }

    try {
      // Get environment variables
      const sepayAcc = process.env.SEPAY_ACC || '';
      const sepayBank = process.env.SEPAY_BANK || '';
      const sepayVa = process.env.SEPAY_VA || '';

      if (!sepayAcc || !sepayBank) {
        this.logger.warn(
          'SEPAY_ACC or SEPAY_BANK environment variables not set',
        );

        return result;
      }

      // Get order information

      if (!orderCode) {
        this.logger.warn('No order code found for payment');

        return result;
      }

      if (!customAmount || customAmount <= 0) {
        this.logger.warn('Invalid amount for QR code generation');

        return result;
      }

      // Generate QR code URL
      const qrCodeUrl = `https://qr.sepay.vn/img?acc=${sepayAcc}&bank=${sepayBank}&amount=${customAmount}&des=${sepayVa}${orderCode}&template=qronly&download=false`;

      this.logger.log(
        `Generated SEPay QR code URL for order ${orderCode} with amount ${customAmount}`,
      );

      return { ...result, qrCodeUrl };
    } catch (error) {
      this.logger.error('Error generating SEPay QR code URL:', error);

      return result;
    }
  }

  async generateBidvSepayQr(customAmount?: number, orderCode?: string | null) {
    const result: { qrCodeUrl: string; expiredAt: string | null } = {
      qrCodeUrl: '',
      expiredAt: null,
    };

    this.logger.log('Generating BIDV SEPay QR code...');

    try {
      // Get environment variables for BIDV API
      const bidvApiUrl = process.env.BIDV_SEPAY_API_URL || '';
      const bidvAuthToken = process.env.BIDV_SEPAY_AUTH_TOKEN || '';
      const _bidvCookie = process.env.BIDV_SEPAY_COOKIE || '';

      if (!bidvApiUrl || !bidvAuthToken) {
        this.logger.warn('BIDV SEPay API URL or Auth Token not configured');

        return result;
      }

      if (!orderCode) {
        this.logger.warn('No order code found for BIDV payment');

        return result;
      }

      if (!customAmount || customAmount <= 0) {
        this.logger.warn('Invalid amount for BIDV QR code generation');

        return result;
      }

      // Prepare API request
      const requestData: BidvSepayOrderRequest = {
        amount: customAmount,
        order_code: orderCode,
        duration: 300, // 5 minutes expiry
        with_qrcode: true,
      };

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bidvAuthToken}`,
        //Cookie: bidvCookie,
      };

      this.logger.log(
        `Calling BIDV SEPay API for order ${orderCode} with amount ${customAmount}`,
      );

      // Call BIDV SEPay API
      const response = await firstValueFrom(
        this.httpService.post<BidvSepayApiResponse>(bidvApiUrl, requestData, {
          headers,
        }),
      );

      if (response.data.status === 'success' && response.data.data) {
        const { qr_code_url, qr_code, order_id, expired_at } =
          response.data.data;

        this.logger.log(
          `Successfully generated BIDV SEPay QR for order ${orderCode}, order_id: ${order_id}`,
        );

        // Return QR code URL if available, otherwise return base64 QR code
        result.qrCodeUrl = qr_code_url || qr_code || '';
        result.expiredAt = expired_at || null;

        return result;
      } else {
        this.logger.error(`BIDV SEPay API error: ${response.data.message}`);

        return result;
      }
    } catch (error) {
      this.logger.error('Error calling BIDV SEPay API:', error);

      // Log additional error details if available
      if (error?.response?.data) {
        this.logger.error('API Response:', error.response.data);
      }

      return result;
    }
  }
}
