import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { firstValueFrom } from 'rxjs';

import { ORDER_ACTION } from 'src/mkt-core/order/constants';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { MKT_TEMPLATE } from 'src/mkt-core/order/constants/mkt-template.constant';
import {
  ORDER_CODE_PREFIX,
  ORDER_METADATA,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { MktPaymentMethodRepository } from 'src/mkt-core/payment-method/repositories';
import { SEPAY_DEFAULT_DURATION } from 'src/mkt-core/payment/constants';
import { callFireBaseType } from 'src/mkt-core/payment/constants/payment.type';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktPaymentRepository } from 'src/mkt-core/payment/repositories';
import {
  BidvSepayApiResponse,
  BidvSepayOrderRequest,
} from 'src/mkt-core/payment/types/bidv-sepay.types';
import { isSepayPaymentMethod } from 'src/mkt-core/payment/utils';

/**
 * Result type for order value calculations
 * Note: CalculateOrderResult is exported from legacy/order.confirm.service.ts
 * for backward compatibility
 */
type OrderCalculationResult = {
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
};

/**
 * OrderConfirmUtilsService - Utility service for order confirmation operations
 *
 * Provides:
 * - Order value calculations using MoneyUtils
 * - Order code generation
 * - Order name generation
 * - Refund operations
 * - SEPay QR code generation
 */
@Injectable()
export class OrderConfirmUtilsService {
  public changeVariantData = {
    oldVariantName: '',
    newVariantName: '',
  };
  private readonly logger = new Logger(OrderConfirmUtilsService.name);
  public orderMetadata: ORDER_METADATA | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktPaymentMethodRepository: MktPaymentMethodRepository,
  ) {}

  /**
   * calculate order values from order items
   */
  async calculateOrderValues(
    currentOrder: MktOrderWorkspaceEntity | null,
  ): Promise<OrderCalculationResult> {
    this.logger.log('Calculating order values...');
    try {
      const orderItems = currentOrder?.orderItems;

      if (!orderItems || orderItems.length === 0) {
        this.logger.warn(`No order items found for order`);

        return {
          subtotal: 0,
          tax: 0,
          discount: 0,
          totalAmount: 0,
        };
      }

      let subtotal = MoneyUtils.from(0);
      let totalTax = MoneyUtils.from(0);

      for (const item of orderItems) {
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const taxPercentage = item.taxPercentage || 0;

        const itemSubtotal = MoneyUtils.multiply(quantity, unitPrice);

        subtotal = MoneyUtils.add(subtotal.toNumber(), itemSubtotal.toNumber());

        const itemTax = MoneyUtils.percentage(
          itemSubtotal.toNumber(),
          taxPercentage,
        );

        totalTax = MoneyUtils.add(totalTax.toNumber(), itemTax.toNumber());

        this.logger.debug(
          `Order item ${item.id}: quantity=${quantity}, unitPrice=${unitPrice}, subtotal=${itemSubtotal.toNumber()}, tax=${itemTax.toNumber()}`,
        );
      }

      const discount = MoneyUtils.from(currentOrder?.discount || 0);

      const totalAmount = MoneyUtils.subtract(
        MoneyUtils.add(subtotal.toNumber(), totalTax.toNumber()).toNumber(),
        discount.toNumber(),
      );

      this.logger.log(
        `Calculated order values: subtotal=${subtotal.toNumber()}, tax=${totalTax.toNumber()}, discount=${discount.toNumber()}, totalAmount=${totalAmount.toNumber()}`,
      );

      return {
        subtotal: MoneyUtils.round(subtotal.toNumber(), 2).toNumber(),
        tax: MoneyUtils.round(totalTax.toNumber(), 2).toNumber(),
        discount: MoneyUtils.round(discount.toNumber(), 2).toNumber(),
        totalAmount: MoneyUtils.round(totalAmount.toNumber(), 2).toNumber(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate order values for order ${currentOrder?.id}:`,
        error,
      );

      return {
        subtotal: 0,
        tax: 0,
        discount: 0,
        totalAmount: 0,
      };
    }
  }

  /**
   * Generate unique order code
   */
  async generateOrderCode(workspaceId: string): Promise<string | null> {
    try {
      const orderRepository =
        await this.mktOrderRepository.getRepository(workspaceId);

      const now = DateTimeUtils.now();
      const jsDate = now.toJSDate();
      const year = jsDate.getFullYear();
      const month = String(jsDate.getMonth() + 1).padStart(2, '0');
      const day = String(jsDate.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      // Find the highest order number for today
      const todayOrders = await orderRepository
        .createQueryBuilder('order')
        .where('order.orderCode LIKE :pattern', {
          pattern: `${ORDER_CODE_PREFIX}${datePrefix}%`,
        })
        .orderBy('order.orderCode', 'DESC')
        .limit(1)
        .getOne();

      let nextNumber = 1;

      if (todayOrders?.orderCode) {
        // Extract number from existing order code (e.g., MKT20241201001 -> 1)
        const pattern = new RegExp(`${ORDER_CODE_PREFIX}\\d{8}(\\d{3})$`);
        const match = todayOrders.orderCode.match(pattern);

        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Generate new order code: ORDER_CODE_PREFIX + YYYYMMDD + 3-digit number
      const orderCode = `${ORDER_CODE_PREFIX}${datePrefix}${String(nextNumber).padStart(3, '0')}`;

      // Double-check uniqueness
      const existingOrder = await this.mktOrderRepository.findByOrderCode(
        workspaceId,
        orderCode,
      );

      if (existingOrder) {
        // If somehow duplicate, try with timestamp
        const timestamp = DateTimeUtils.toMillis(DateTimeUtils.now())
          .toString()
          .slice(-6);

        return `${ORDER_CODE_PREFIX}${datePrefix}${timestamp}`;
      }

      this.logger.log(`Generated orderCode: ${orderCode}`);

      return orderCode;
    } catch (error) {
      this.logger.error(`Failed to generate order code:`, error);

      return null;
    }
  }

  /**
   * Generate order name based on order items
   */
  async generateOrderName(
    currentOrder: MktOrderWorkspaceEntity | null,
  ): Promise<string | null> {
    try {
      if (!currentOrder?.orderItems || currentOrder.orderItems.length === 0) {
        const now = DateTimeUtils.now();
        const dateStr = now.toJSDate().toLocaleDateString('vi-VN');

        return `Đơn hàng ${dateStr}`;
      }

      // Generate name based on products
      const productNames = currentOrder.orderItems.map((item) => {
        if (item.snapshotProductName) {
          return item.snapshotProductName;
        }

        return 'Sản phẩm';
      });

      // Create order name
      let orderName = '';

      if (productNames.length === 1) {
        orderName = productNames[0];
      } else if (productNames.length === 2) {
        orderName = `${productNames[0]} và ${productNames[1]}`;
      } else {
        orderName = `${productNames[0]} và ${productNames.length - 1} sản phẩm khác`;
      }

      // Add quantity info if there are multiple quantities
      const totalQuantity = currentOrder.orderItems.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      );

      if (totalQuantity > 1) {
        orderName += ` (${totalQuantity} sản phẩm)`;
      }

      this.logger.log(`Generated order name: ${orderName}`);

      return orderName;
    } catch (error) {
      this.logger.error(`Failed to generate order name:`, error);

      return null;
    }
  }

  async refundOrder(
    action: ORDER_ACTION,
    licenseId: string,
    refundOrder: MktOrderWorkspaceEntity | null,
    workspaceId: string,
    note?: string,
  ) {
    if (!refundOrder?.id) {
      return;
    }

    if (action !== ORDER_ACTION.REFUND) {
      throw new Error('Action must be REFUND to refund order');
    }

    // Create refund note
    const refundNote = `[REFUND - ${DateTimeUtils.toISO(DateTimeUtils.now())}] Cần hoàn tiền cho khách hàng. Vui lòng xác nhận sau khi đã hoàn tiền. Status: PENDING_REFUND. License ID: ${licenseId}`;

    // Combine with existing note if any
    const existingNote = refundOrder.note || '';
    let updatedNote = existingNote
      ? `${existingNote}\n\n${refundNote}`
      : refundNote;

    if (note) {
      updatedNote = `${updatedNote}\n\n${note}`;
    }

    // Update order with all costs set to 0 and refund note
    await this.mktOrderRepository.update(workspaceId, refundOrder.id, {
      subtotal: 0,
      tax: 0,
      discount: 0,
      totalAmount: 0,
      note: updatedNote,
    });

    this.logger.log(
      `Order ${refundOrder.id} updated for refund. All costs set to 0. License ID: ${licenseId}`,
    );
  }

  /**
   * Confirm refund completion for an order
   */
  async confirmRefundCompleted(
    workspaceId: string,
    orderId: string,
    refundDetails?: string,
  ): Promise<void> {
    const order = await this.mktOrderRepository.findById(workspaceId, orderId);

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Create confirmation note
    const confirmationNote = `[REFUND CONFIRMED - ${DateTimeUtils.toISO(DateTimeUtils.now())}] Đã hoàn tiền thành công cho khách hàng.`;
    const additionalDetails = refundDetails
      ? ` Chi tiết: ${refundDetails}`
      : '';
    const fullConfirmationNote = `${confirmationNote}${additionalDetails}`;

    // Combine with existing note
    const existingNote = order.note || '';
    const updatedNote = existingNote
      ? `${existingNote}\n\n${fullConfirmationNote}`
      : fullConfirmationNote;

    await this.mktOrderRepository.update(workspaceId, orderId, {
      note: updatedNote,
    });

    this.logger.log(
      `Refund confirmed for order ${orderId}. Details: ${refundDetails || 'No additional details'}`,
    );
  }

  private async createPaymentFromOrder(
    paymentData: {
      paymentName: string;
      totalAmount: number;
      currency: string;
      generatedOrderCode: string | null;
      orderId: string;
      workspaceId: string | null;
    },
    paymentMethodsMeta: ORDER_METADATA['paymentMethods'] | null,
  ): Promise<callFireBaseType | void> {
    if (!paymentData.workspaceId) {
      return;
    }

    const paymentRepository = await this.mktPaymentRepository.getRepository(
      paymentData.workspaceId,
    );
    const paymentMethodRepository =
      await this.mktPaymentMethodRepository.getRepository(
        paymentData.workspaceId,
      );

    const result: callFireBaseType = {
      orderCode: paymentData.generatedOrderCode,
      QRCodeUrl: null,
    };

    if (Array.isArray(paymentMethodsMeta) && paymentMethodsMeta.length > 0) {
      const pmIds = paymentMethodsMeta
        .map((p) => p.mktPaymentMethodId)
        .filter(Boolean);

      if (pmIds.length > 0) {
        const methods = await paymentMethodRepository.find({
          where: pmIds.map((id) => ({ id })) as unknown as { id: string },
        });
        const pmById = new Map(
          methods.map((m: MktPaymentMethodWorkspaceEntity) => [m.id, m]),
        );

        const paymentsFromMeta = await Promise.all(
          paymentMethodsMeta.map(async (p) => {
            const pm: MktPaymentMethodWorkspaceEntity | undefined = pmById.get(
              p.mktPaymentMethodId,
            );

            if (!pm) {
              return null;
            }

            // generate position
            const { qrCodeUrl, expiredAt } = await this.generateSepayQrCodeUrl(
              pm,
              paymentData.totalAmount || 0,
              paymentData.generatedOrderCode,
            );

            if (!result.QRCodeUrl) {
              result.QRCodeUrl = qrCodeUrl;
            }

            return paymentRepository.create({
              mktOrderId: paymentData.orderId,
              mktPaymentMethodId: p.mktPaymentMethodId,
              name: `${pm?.name} - ${paymentData.paymentName}`,
              amount: paymentData.totalAmount || 0,
              currency: paymentData.currency || 'VND',
              qrCodeUrl: qrCodeUrl || undefined,
              duration: p.duration || null,
              expiredAt: expiredAt || null,
              paymentPageUrl: `${process.env.SERVER_URL}/payment/${paymentData.generatedOrderCode}`,
              mktTemplateId: MKT_TEMPLATE.SEPAY,
            } as Partial<MktPaymentWorkspaceEntity>);
          }),
        );

        await paymentRepository.save(
          paymentsFromMeta as MktPaymentWorkspaceEntity[],
        );
      }
    }

    return result;
  }

  async generateSepayQrCodeUrl(
    mktPaymentMethod: MktPaymentMethodWorkspaceEntity,
    customAmount?: number,
    orderCode?: string | null,
  ) {
    const result: { qrCodeUrl: string; expiredAt: string | null } = {
      qrCodeUrl: '',
      expiredAt: null,
    };

    this.logger.log('Generating SEPay QR code URL...');

    // Check if payment method is QR Code type using helper function
    if (!isSepayPaymentMethod(mktPaymentMethod?.type, mktPaymentMethod?.name)) {
      return result;
    }

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
      const qrCodeUrl = `https://qr.sepay.vn/img?acc=${sepayAcc}&bank=${sepayBank}&amount=${customAmount}&des=${sepayVa} ${orderCode}&template=qronly&download=false`;

      this.logger.log(
        `Generated SEPay QR code URL for order ${orderCode} with amount ${customAmount}`,
      );

      return { ...result, qrCodeUrl };
    } catch (error) {
      this.logger.error('Error generating SEPay QR code URL:', error);

      return result;
    }
  }

  private async updateOrderInformation(
    workspaceId: string,
    orderId: string,
    updateOrderInfo: Partial<MktOrderWorkspaceEntity>,
    oldOrderId: string | null | undefined,
  ) {
    if (oldOrderId) {
      this.orderMetadata = { ...this.orderMetadata, oldOrderId };
    }
    let note = '';

    if (
      this.changeVariantData.oldVariantName &&
      this.changeVariantData.newVariantName
    ) {
      note = `\n
Đã thay đổi sản phẩm cho ${this.changeVariantData.oldVariantName}\n
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sản phẩm mới: -> ${this.changeVariantData.newVariantName}.\n
Thời gian: ${DateTimeUtils.toISO(DateTimeUtils.now())}
`;
    }
    await this.mktOrderRepository.update(workspaceId, orderId, {
      mktCustomerId: updateOrderInfo.mktCustomerId || null,
      orderCode: updateOrderInfo.orderCode ?? '',
      subtotal: updateOrderInfo.subtotal,
      tax: updateOrderInfo.tax,
      discount: updateOrderInfo.discount,
      totalAmount: updateOrderInfo.totalAmount,
      name: updateOrderInfo.name ?? '',
      note,
      metadata: safeJsonStringify(this.orderMetadata) as unknown as JSON,
    });
  }

  private async generateBidvSepayQr(
    customAmount?: number,
    orderCode?: string | null,
  ) {
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
        duration: SEPAY_DEFAULT_DURATION,
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

/**
 * @deprecated Use OrderConfirmUtilsService instead
 * Alias for backward compatibility
 */
export const MktOrderCommonConfirmService = OrderConfirmUtilsService;
