import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { firstValueFrom } from 'rxjs';

import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { paymentConfig } from 'src/mkt-core/payment/config';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/workspace-entities/mkt-payment-method.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import {
  BidvSepayApiResponse,
  BidvSepayOrderRequest,
} from 'src/mkt-core/payment/types/bidv-sepay.types';
import { PaymentCurrency } from 'src/mkt-core/payment/types';

@Injectable()
export class MktPaymentPrepareService {
  private readonly logger = new Logger(MktPaymentPrepareService.name);

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly config: ConfigType<typeof paymentConfig>,
    private readonly orderRepository: MktOrderRepository,
    private readonly httpService: HttpService,
  ) {}

  async prepareCreateOnePayload(
    payload: CreateOneResolverArgs<MktPaymentWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktPaymentWorkspaceEntity>> {
    const input = payload?.data;

    if (!input?.mktOrderId) {
      this.logger.warn('Missing mktOrderId in payment creation');

      return payload;
    }

    try {
      const order = await this.orderRepository.findById(input.mktOrderId);

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
        payload.data = {
          ...payload.data,
          currency: order.currency as PaymentCurrency,
        };
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
    if (this.config.bidv.enabled) {
      return this.generateBidvSepayQr(customAmount, orderCode);
    }

    try {
      // Get sepay config
      const {
        account: sepayAcc,
        bank: sepayBank,
        virtualAccount: sepayVa,
      } = this.config.sepay;

      if (!sepayAcc || !sepayBank) {
        this.logger.warn('SEPAY account or bank not configured');

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
      // Get BIDV config
      const {
        apiUrl: bidvApiUrl,
        authToken: bidvAuthToken,
        defaultDuration,
      } = this.config.bidv;

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
        duration: defaultDuration,
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
