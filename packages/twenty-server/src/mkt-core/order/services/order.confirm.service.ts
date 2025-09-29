import { Injectable, Logger } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktLicenseService } from 'src/mkt-core/license/mkt-license.service';
import { ORDER_ACTION } from 'src/mkt-core/order/constants';
import { ORDER_CODE_PREFIX } from 'src/mkt-core/order/constants/order-status.constants';
import { Metadata } from 'src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { OrderService } from 'src/mkt-core/order/services/order.service';
import { callFireBaseType } from 'src/mkt-core/payment/constants/payment.type';
import { MktPaymentService } from 'src/mkt-core/payment/services/mkt-payment.service';

export type CalculateOrderResult = {
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
};

@Injectable()
export class OrderConfirmService {
  private readonly logger = new Logger(OrderConfirmService.name);

  constructor(
    private readonly mktLicenseService: MktLicenseService,
    private readonly mktPaymentService: MktPaymentService,
    private readonly orderService: OrderService,
    private readonly mktRepo: MktRepositoryService,
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
  ): Promise<callFireBaseType | void> {
    if (action !== ORDER_ACTION.WAIT && action !== ORDER_ACTION.TRIAL)
      throw new Error('Action must be WAIT or TRIAL to confirm order');

    if (!Array.isArray(variantsMeta) || variantsMeta.length <= 0)
      throw new Error('Variants metadata is required');
    // repositories
    const orderRepository = await this.mktRepo.getOrderRepository();

    this.logger.log(
      `Creating order items for order ID: ${createdOrder.id} from variants metadata`,
    );
    await this.orderService.createOrderItemsFromVariants(
      variantsMeta,
      createdOrder,
      workspaceId,
    );

    const order = await orderRepository.findOne({
      where: { id: createdOrder.id },
      relations: ['orderItems'],
    });

    if (order && order.orderItems?.length > 0) {
      try {
        const createdLicenses =
          await this.mktLicenseService.createLicensesForOrderItems(
            order,
            workspaceId,
          );

        this.logger.log(
          `Successfully created ${createdLicenses.length} licenses for order: ${order.id}`,
        );
      } catch (licenseError) {
        throw new Error('Failed to create licenses for order');
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

    await this.orderService.updateOrderInformation(
      createdOrder.id,
      updateOrderInfo,
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
    };

    return await this.mktPaymentService.createPaymentFromOrder(
      paymentData,
      paymentMethodsMeta,
    );
  }

  async trialToPaidOrder(
    action: ORDER_ACTION,
    createdOrder: MktOrderWorkspaceEntity,
    workspaceId: string,
    trialOrderId: string | null,
    paymentMethodsMeta: Metadata['paymentMethods'] | null,
  ): Promise<void> {
    if (action !== ORDER_ACTION.TRIAL_TO_PAID)
      throw new Error(
        'Action must be TRIAL_TO_PAID to convert trial to paid order',
      );

    if (!trialOrderId)
      throw new Error('Trial order ID is required to convert to paid order');

    this.logger.log(
      `Processing TRIAL_TO_PAID order conversion for order ID: ${createdOrder.id}`,
    );

    // Get the trial order ID from metadata (should be passed in from frontend)

    if (!trialOrderId) {
      throw new Error(
        'Trial order ID is required for TRIAL_TO_PAID conversion',
      );
    }

    const orderRepository = await this.mktRepo.getOrderRepository();

    // 1. Find the trial order and its items
    const trialOrder = await orderRepository.findOne({
      where: { id: trialOrderId },
      relations: ['orderItems'],
    });

    if (!trialOrder) {
      throw new Error(`Trial order with ID ${trialOrderId} not found`);
    }

    if (!trialOrder.trialLicense) {
      throw new Error(
        `Order ${trialOrderId} is not a trial order (status: ${trialOrder.trialLicense})`,
      );
    }

    this.logger.log(
      `Found trial order: ${trialOrderId} with ${trialOrder.orderItems?.length || 0} items`,
    );

    await this.orderService.cloneOrderItems(
      trialOrder,
      createdOrder,
      workspaceId,
    );

    await this.mktLicenseService.updateReferenceLicenseOrder(
      trialOrderId,
      createdOrder.id,
    );

    const generatedOrderCode = await this.generateOrderCode();

    const paymentName =
      generatedOrderCode && trialOrder.name
        ? `${generatedOrderCode}-${trialOrder.name}`
        : generatedOrderCode || trialOrder.name || 'Payment';

    const paymentData = {
      paymentName,
      totalAmount: trialOrder.totalAmount || 0,
      currency: trialOrder?.currency || 'VND',
      generatedOrderCode,
      orderId: createdOrder.id,
    };

    await this.mktPaymentService.createPaymentFromOrder(
      paymentData,
      paymentMethodsMeta,
    );

    // 4. Update the new order with customer and calculated values from trial order
    await this.orderService.cloneOrder(
      createdOrder.id,
      generatedOrderCode,
      trialOrder,
    );
  }
}
