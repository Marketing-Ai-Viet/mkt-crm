import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';

import { firstValueFrom } from 'rxjs';
import { v4 } from 'uuid';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { LICENSE_API_RESPONSE } from 'src/mkt-core/common/common.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { ORDER_ACTION } from 'src/mkt-core/order/constants';
import {
  MKT_ORDER_LICENSE_STATUS,
  ORDER_CODE_PREFIX,
  ORDER_METADATA,
} from 'src/mkt-core/order/constants/order-status.constants';
import { Metadata } from 'src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentMethodWorkspaceEntity } from 'src/mkt-core/payment-method/mkt-payment-method.workspace-entity';
import { callFireBaseType } from 'src/mkt-core/payment/constants/payment.type';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';

export type CalculateOrderResult = {
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
};

@Injectable()
export class MktOrderCommonConfirmService {
  private readonly logger = new Logger(MktOrderCommonConfirmService.name);
  public orderMetadata: ORDER_METADATA | null = null;

  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * calculate order values from order items
   */
  async calculateOrderValues(
    currentOrder: MktOrderWorkspaceEntity | null,
  ): Promise<CalculateOrderResult> {
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

      let subtotal = 0;
      let totalTax = 0;

      for (const item of orderItems) {
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const taxPercentage = item.taxPercentage || 0;

        const itemSubtotal = quantity * unitPrice;

        subtotal += itemSubtotal;

        const itemTax = (itemSubtotal * taxPercentage) / 100;

        totalTax += itemTax;

        this.logger.debug(
          `Order item ${item.id}: quantity=${quantity}, unitPrice=${unitPrice}, subtotal=${itemSubtotal}, tax=${itemTax}`,
        );
      }

      const discount = currentOrder?.discount || 0;

      const totalAmount = subtotal + totalTax - discount;

      this.logger.log(
        `Calculated order values: subtotal=${subtotal}, tax=${totalTax}, discount=${discount}, totalAmount=${totalAmount}`,
      );

      return {
        subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
        tax: Math.round(totalTax * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
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
  async generateOrderCode(): Promise<string | null> {
    try {
      const orderRepository = await this.mktRepo.getOrderRepository();

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
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
        const match = todayOrders.orderCode.match(
          `/${ORDER_CODE_PREFIX}\\d{8}(\\d{3})$/`,
        );

        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Generate new order code: ORDER_CODE_PREFIX + YYYYMMDD + 3-digit number
      const orderCode = `${ORDER_CODE_PREFIX}${datePrefix}${String(nextNumber).padStart(3, '0')}`;

      // Double-check uniqueness
      const existingOrder = await orderRepository.findOne({
        where: { orderCode },
      });

      if (existingOrder) {
        // If somehow duplicate, try with timestamp
        const timestamp = Date.now().toString().slice(-6);

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
        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN');

        return `Đơn hàng ${dateStr}`;
      }

      // Generate name based on products
      const productNames = currentOrder.orderItems.map((item) => {
        if (item.snapshotProductName) {
          return item.snapshotProductName;
        }
        if (item.mktProduct?.name) {
          const variantName = item.mktVariant?.name;

          return variantName
            ? `${item.mktProduct.name} - ${variantName}`
            : item.mktProduct.name;
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

  async confirmOrder(
    action: ORDER_ACTION,
    createdOrder: MktOrderWorkspaceEntity,
    workspaceId: string,
    variantsMeta: Metadata['variants'] | null,
    customerMeta: Metadata['customer'] | null,
    paymentMethodsMeta: Metadata['paymentMethods'] | null,
    licenseId?: string,
    license?: MktLicenseWorkspaceEntity | null,
  ): Promise<callFireBaseType | void> {
    if (
      action !== ORDER_ACTION.WAIT &&
      action !== ORDER_ACTION.TRIAL &&
      action !== ORDER_ACTION.LICENSE_RENEWING
    )
      throw new Error('Action must be WAIT or TRIAL to confirm order renewal');

    if (!Array.isArray(variantsMeta) || variantsMeta.length <= 0)
      throw new Error('Variants metadata is required (common)');
    // repositories
    const orderRepository = await this.mktRepo.getOrderRepository();

    this.logger.log(
      `Creating order items for order ID: ${createdOrder.id} from variants metadata`,
    );
    await this.createOrderItemsFromVariants(
      variantsMeta,
      createdOrder,
      workspaceId,
    );

    const order = await orderRepository.findOne({
      where: { id: createdOrder.id },
      relations: ['orderItems'],
    });

    this.logger.log(`Fetched order with items: ${JSON.stringify(order)}`);

    if (order && order.orderItems?.length > 0) {
      try {
        if (action !== ORDER_ACTION.LICENSE_RENEWING)
          await this.createLicensesForOrderItems(order, workspaceId);

        if (action === ORDER_ACTION.LICENSE_RENEWING) {
          if (!licenseId)
            throw new Error('License ID is required for license renewal');
          await this.linkLicensesForOrderItems(
            licenseId,
            order,
            workspaceId,
            license?.mktOrder,
          );
        }

        this.logger.log(`Successfully licenses for order: ${order.id}`);
      } catch (licenseError) {
        throw new Error('Failed to licenses for order');
      }
    }

    // 2) Update Order information
    const generatedOrderCode = await this.generateOrderCode();
    const generatedOrderName = await this.generateOrderName(order);
    const calculatedValues: CalculateOrderResult =
      await this.calculateOrderValues(order);

    const updateOrderInfo = {
      id: createdOrder.id,
      mktCustomerId: customerMeta?.mktCustomerId || null,
      orderCode: generatedOrderCode ?? '',
      subtotal: calculatedValues.subtotal,
      tax: calculatedValues.tax,
      discount: calculatedValues.discount,
      totalAmount: calculatedValues.totalAmount,
      name: generatedOrderName ?? '',
    };

    await this.updateOrderInformation(
      createdOrder.id,
      updateOrderInfo,
      orderRepository,
      license?.mktOrder,
    );

    if (action === ORDER_ACTION.TRIAL) return;
    const paymentName =
      generatedOrderCode && generatedOrderName
        ? `${generatedOrderCode}-${generatedOrderName}`
        : generatedOrderCode || generatedOrderName || 'Payment';

    const paymentData = {
      paymentName,
      totalAmount: calculatedValues.totalAmount || 0,
      currency: createdOrder?.currency || 'VND',
      generatedOrderCode,
      orderId: createdOrder.id,
      workspaceId,
    };

    this.logger.log(`Creating payment for order ID: ${createdOrder.id}`);

    return await this.createPaymentFromOrder(paymentData, paymentMethodsMeta);
  }

  async refundOrder(
    action: ORDER_ACTION,
    licenseId: string,
    refundOrder: MktOrderWorkspaceEntity | null,
    note?: string,
  ) {
    if (!refundOrder?.id) return;
    if (action !== ORDER_ACTION.REFUND)
      throw new Error('Action must be REFUND to refund order');

    const orderRepository = await this.mktRepo.getOrderRepository();

    // Create refund note
    const refundNote = `[REFUND - ${new Date().toISOString()}] Cần hoàn tiền cho khách hàng. Vui lòng xác nhận sau khi đã hoàn tiền. Status: PENDING_REFUND. License ID: ${licenseId}`;

    // Combine with existing note if any
    const existingNote = refundOrder.note || '';
    let updatedNote = existingNote
      ? `${existingNote}\n\n${refundNote}`
      : refundNote;
    if (note) {
      updatedNote = `${updatedNote}\n\n${note}`;
    }

    // Update order with all costs set to 0 and refund note
    await orderRepository.update(refundOrder.id, {
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
    orderId: string,
    refundDetails?: string,
  ): Promise<void> {
    const orderRepository = await this.mktRepo.getOrderRepository();

    const order = await orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Create confirmation note
    const confirmationNote = `[REFUND CONFIRMED - ${new Date().toISOString()}] Đã hoàn tiền thành công cho khách hàng.`;
    const additionalDetails = refundDetails
      ? ` Chi tiết: ${refundDetails}`
      : '';
    const fullConfirmationNote = `${confirmationNote}${additionalDetails}`;

    // Combine with existing note
    const existingNote = order.note || '';
    const updatedNote = existingNote
      ? `${existingNote}\n\n${fullConfirmationNote}`
      : fullConfirmationNote;

    await orderRepository.update(orderId, {
      note: updatedNote,
    });

    this.logger.log(
      `Refund confirmed for order ${orderId}. Details: ${refundDetails || 'No additional details'}`,
    );
  }

  private async createOrderItemsFromVariants(
    variantsMeta: Metadata['variants'] | null,
    createdOrder: MktOrderWorkspaceEntity,
    _workspaceId: string,
  ) {
    if (!variantsMeta || variantsMeta.length === 0) return [];
    const ids = variantsMeta.map((v) => v.mktVariantId).filter(Boolean);
    const variants = await this.getVariantValueById(ids);
    const variantById = new Map(variants.map((v) => [v.id, v]));
    const orderItemRepository = await this.mktRepo.getOrderItemRepository();
    const itemsFromVariants = await Promise.all(
      variantsMeta.map(async (v, _index) => {
        const variant = variantById.get(v.mktVariantId);

        if (!variant) return [];

        const unitPrice = variant?.price ?? 0;
        const quantity = v.quantity ?? 1;
        const totalPrice = unitPrice * quantity;

        return orderItemRepository.create({
          mktOrderId: createdOrder.id,
          mktVariantId: variant.id,
          name: variant.name ?? 'Item',
          snapshotProductName: variant.name ?? 'Item',
          unitName: 'unit',
          unitPrice,
          quantity,
          totalPrice,
          taxPercentage: 0,
          taxAmount: 0,
          totalAmountWithTax: totalPrice,
        } as Partial<MktOrderItemWorkspaceEntity>);
      }),
    );

    const toCreate = itemsFromVariants.filter(
      Boolean,
    ) as MktOrderItemWorkspaceEntity[];

    if (toCreate.length > 0) {
      await orderItemRepository.save(toCreate);
    } else {
      throw new Error('No order items to create');
    }
  }

  async getVariantValueById(
    ids: string[],
  ): Promise<MktVariantWorkspaceEntity[]> {
    const variantRepo = await this.mktRepo.getVariantRepository();
    const variants = await variantRepo.find({
      where: ids.map((id) => ({ id })) as unknown as { id: string },
    });

    return variants;
  }

  private async createLicensesForOrderItems(
    order: MktOrderWorkspaceEntity,
    _workspaceId: string,
  ): Promise<MktLicenseWorkspaceEntity[]> {
    this.logger.log(`Creating licenses for order items ${order.id}`);

    const licenseRepository = await this.mktRepo.getLicenseRepository();

    const licensePromises = order.orderItems.flatMap(
      async (orderItem, _index) => {
        try {
          // generate license name based on order item
          const productName =
            orderItem.snapshotProductName ||
            orderItem.mktProduct?.name ||
            'Sản phẩm';
          const variantName = orderItem.mktVariant?.name;
          const licenseName = variantName
            ? `License cho ${productName} - ${variantName}`
            : `License cho ${productName}`;

          const quantity = orderItem.quantity || 1;
          const licensePromises = [];

          // Create licenses based on quantity
          for (let i = 1; i <= quantity; i++) {
            // call API to get license for this specific order item
            const licenseApiResponse = await this.fetchLicenseFromApi(
              order.id,
              licenseName,
              orderItem.id,
            );
            const newLicense = licenseRepository.create({
              name: licenseName,
              licenseKey: licenseApiResponse.licenseKey,
              status: MKT_LICENSE_STATUS.ACTIVE,
              activatedAt: new Date().toISOString(),
              expiresAt: licenseApiResponse.expiresAt,
              licenseUuid: licenseApiResponse.licenseUuid as string,
              mktOrderId: order.id,
              mktVariantId: orderItem.mktVariantId,
              notes: `License được tạo cho order item: ${orderItem.name} (${i}/${quantity}) ${MKT_ORDER_LICENSE_STATUS.SUCCESS}`,
            });
            // save license
            const savedLicense = await licenseRepository.save(newLicense);

            licensePromises.push(savedLicense);
          }

          return licensePromises;
        } catch (error) {
          this.logger.error(
            `Failed to create license for order item ${orderItem.id}:`,
            error,
          );
          throw error;
        }
      },
    );

    const nestedLicenses = await Promise.all(licensePromises);
    const createdLicenses =
      nestedLicenses.flat() as MktLicenseWorkspaceEntity[];

    this.logger.log(
      `Successfully created ${createdLicenses.length} licenses for order: ${order.id}`,
    );

    return createdLicenses;
  }

  private async fetchLicenseFromApi(
    orderId: string,
    orderName: string,
    orderItemId?: string,
    licenseUuid?: string | null | undefined,
  ): Promise<LICENSE_API_RESPONSE> {
    try {
      this.logger.log(`Fetching license from API for order: ${orderId}`);

      // replace with actual API URL
      const apiUrl =
        process.env.LICENSE_API_URL ||
        'https://api.license-provider.com/licenses';

      const requestBody = {
        orderId,
        orderName,
        ...(orderItemId && { orderItemId }), // include orderItemId if provided
        ...(licenseUuid && { licenseUuid }), // include licenseUuid if provided
        // add other necessary information
      };

      this.logger.log(`Request body:`, requestBody);

      const response = await firstValueFrom(
        this.httpService.post<LICENSE_API_RESPONSE>(apiUrl, requestBody),
      );

      this.logger.log(`Successfully fetched license for order: ${orderId}`);

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch license from API for order: ${orderId}`,
        error,
      );
      // generate unique mock license key based on orderId and orderItemId
      const uniqueSuffix = orderItemId
        ? `_ITEM_${orderItemId.slice(-8)}`
        : `_ORDER_${orderId.slice(-8)}`;

      const mockResponse: LICENSE_API_RESPONSE = {
        licenseKey: `MOCK_LICENSE${uniqueSuffix}_${Date.now()}`,
        status: MKT_LICENSE_STATUS.ACTIVE,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 1 year from now
        licenseUuid: licenseUuid ? licenseUuid : v4(),
      };

      this.logger.log(`Mock response:`, mockResponse);

      return mockResponse;
      //throw error;
    }
  }

  private async linkLicensesForOrderItems(
    licenseId: string,
    order: MktOrderWorkspaceEntity,
    workspaceId: string,
    oldOrder?: MktOrderWorkspaceEntity | null,
  ): Promise<MktLicenseWorkspaceEntity | null> {
    this.logger.log(`Linking license ${licenseId} for order ${order.id}`);
    this.mktRepo.workspaceId = workspaceId;
    const licenseRepository = await this.mktRepo.getLicenseRepository();

    if (oldOrder) {
      this.updateOldOrderInformation(oldOrder, licenseId);
    }

    // Lấy thông tin license hiện tại
    const licenseRecord = await licenseRepository.findOne({
      where: { id: licenseId },
      select: ['licenseUuid'],
    });

    if (!licenseRecord) {
      this.logger.error(`License ${licenseId} not found`);

      return null;
    }

    // Lấy thông tin từ order item đầu tiên
    const firstOrderItem = order.orderItems[0];

    if (!firstOrderItem) {
      this.logger.error(`No order items found for order ${order.id}`);

      return null;
    }

    // Tạo tên license
    const productName =
      firstOrderItem.snapshotProductName ||
      firstOrderItem.mktProduct?.name ||
      'Sản phẩm';
    const variantName = firstOrderItem.mktVariant?.name;
    const licenseName = variantName
      ? `License cho ${productName} - ${variantName}`
      : `License cho ${productName}`;

    try {
      const licenseApiResponse = await this.fetchLicenseFromApi(
        order.id,
        licenseName,
        firstOrderItem.id,
        licenseRecord.licenseUuid,
      );

      await licenseRepository.update(licenseId, {
        name: licenseName,
        licenseKey: licenseApiResponse.licenseKey,
        status: MKT_LICENSE_STATUS.ACTIVE,
        activatedAt: new Date().toISOString(),
        expiresAt: licenseApiResponse.expiresAt,
        licenseUuid: licenseApiResponse.licenseUuid as string,
        mktOrderId: order.id,
        mktVariantId: firstOrderItem.mktVariantId,
        notes: `License được update cho order: ${order.id} ${MKT_ORDER_LICENSE_STATUS.SUCCESS}`,
      });

      const updatedLicense = await licenseRepository.findOne({
        where: { id: licenseId },
      });

      this.logger.log(`Successfully updated license: ${licenseId}`);

      return updatedLicense;
    } catch (error) {
      this.logger.error(`Failed to update license ${licenseId}:`, error);
      throw error;
    }
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
    paymentMethodsMeta: Metadata['paymentMethods'] | null,
  ): Promise<callFireBaseType | void> {
    const paymentRepository = await this.mktRepo.getPaymentRepository();
    const paymentMethodRepository =
      await this.mktRepo.getPaymentMethodRepository();

    const result: callFireBaseType = {
      orderCode: paymentData.generatedOrderCode,
      QRCodeUrl: null,
    };

    if (Array.isArray(paymentMethodsMeta) && paymentMethodsMeta.length > 0) {
      const pmIds = paymentMethodsMeta
        .map((p) => p.mktPaymentMethodId)
        .filter(Boolean);

      if (pmIds.length > 0) {
        const _methods = await paymentMethodRepository.find({
          where: pmIds.map((id) => ({ id })) as unknown as { id: string },
        });
        const pmById = new Map(_methods.map((m) => [m.id, m]));

        const paymentsFromMeta = await Promise.all(
          paymentMethodsMeta.map(async (p) => {
            const pm: MktPaymentMethodWorkspaceEntity | undefined = pmById.get(
              p.mktPaymentMethodId,
            );

            if (!pm) return null;
            // generate position
            const qrCodeUrl = await this.generateSepayQrCodeUrl(
              pm,
              paymentData.totalAmount || 0,
              paymentData.generatedOrderCode,
            );

            if (!result.QRCodeUrl) result.QRCodeUrl = qrCodeUrl;

            return paymentRepository.create({
              mktOrderId: paymentData.orderId,
              mktPaymentMethodId: p.mktPaymentMethodId,
              name: `${pm?.name} - ${paymentData.paymentName}`,
              amount: paymentData.totalAmount || 0,
              currency: paymentData.currency || 'VND',
              qrCodeUrl: qrCodeUrl || undefined,
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

  private async generateSepayQrCodeUrl(
    mktPaymentMethod: MktPaymentMethodWorkspaceEntity,
    customAmount?: number,
    orderCode?: string | null,
  ): Promise<string> {
    this.logger.log('Generating SEPay QR code URL...');
    if (mktPaymentMethod?.name !== 'SEPay QR') return '';
    try {
      // Get environment variables
      const sepayAcc = process.env.SEPAY_ACC || '';
      const sepayBank = process.env.SEPAY_BANK || '';
      const sepayVa = process.env.SEPAY_VA || 'TKPD23';

      if (!sepayAcc || !sepayBank) {
        this.logger.warn(
          'SEPAY_ACC or SEPAY_BANK environment variables not set',
        );

        return '';
      }

      // Get order information

      if (!orderCode) {
        this.logger.warn('No order code found for payment');

        return '';
      }

      if (!customAmount || customAmount <= 0) {
        this.logger.warn('Invalid amount for QR code generation');

        return '';
      }

      // Generate QR code URL
      const qrCodeUrl = `https://qr.sepay.vn/img?acc=${sepayAcc}&bank=${sepayBank}&amount=${customAmount}&des=${sepayVa} ${orderCode}&template=qronly&download=false`;

      this.logger.log(
        `Generated SEPay QR code URL for order ${orderCode} with amount ${customAmount}`,
      );

      return qrCodeUrl;
    } catch (error) {
      this.logger.error('Error generating SEPay QR code URL:', error);

      return '';
    }
  }

  private async updateOrderInformation(
    orderId: string,
    updateOrderInfo: Partial<MktOrderWorkspaceEntity>,
    orderRepository: WorkspaceRepository<MktOrderWorkspaceEntity>,
    oldOrder: MktOrderWorkspaceEntity | null | undefined,
  ) {
    let metadata: ORDER_METADATA = {};

    if (oldOrder?.metadata) {
      try {
        const parsed =
          typeof oldOrder.metadata === 'string'
            ? JSON.parse(oldOrder.metadata)
            : oldOrder.metadata;

        metadata = { ...parsed };
      } catch (error) {
        this.logger.warn('Failed to parse existing metadata:', error);
        metadata = {};
      }
    }

    this.orderMetadata = { ...metadata, oldOrderId: orderId };
    //
    await orderRepository.update(orderId, {
      mktCustomerId: updateOrderInfo.mktCustomerId || null,
      orderCode: updateOrderInfo.orderCode ?? '',
      subtotal: updateOrderInfo.subtotal,
      tax: updateOrderInfo.tax,
      discount: updateOrderInfo.discount,
      totalAmount: updateOrderInfo.totalAmount,
      name: updateOrderInfo.name ?? '',
      metadata: JSON.stringify(this.orderMetadata) as unknown as JSON,
    });
  }

  async updateOldOrderInformation(
    oldOrder: MktOrderWorkspaceEntity,
    licenseId: string,
  ) {
    const orderRepo = await this.mktRepo.getOrderRepository();
    let metadata = oldOrder?.metadata ? { ...oldOrder.metadata } : {};

    metadata = { ...metadata, oldLicenseId: licenseId };
    orderRepo.update(oldOrder.id, { metadata });
  }
}
