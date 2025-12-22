import { Injectable, Logger } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktContractService } from 'src/mkt-core/contract/services/mkt-contract.service';
import { ORDER_ACTION } from 'src/mkt-core/order/constants';
import {
  ORDER_CODE_PREFIX,
  ORDER_METADATA,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentService } from 'src/mkt-core/payment/services/mkt-payment.service';
import {
  DATE_TIME_FORMATS,
  DateTimeUtils,
} from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

import { OrderService } from './order.service';

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
    private mktPaymentService: MktPaymentService,
    private readonly orderService: OrderService,
    private mktRepo: MktRepositoryService,
    private readonly mktContractService: MktContractService,
  ) {}

  /**
   * calculate order values from order items
   * Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
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

      let subtotal = MoneyUtils.from(0);
      let totalTax = MoneyUtils.from(0);

      for (const item of orderItems) {
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const taxPercentage = item.taxPercentage || 0;

        const itemSubtotal = MoneyUtils.multiply(quantity, unitPrice);

        subtotal = MoneyUtils.add(subtotal, itemSubtotal);

        const itemTax = MoneyUtils.percentage(itemSubtotal, taxPercentage);

        totalTax = MoneyUtils.add(totalTax, itemTax);

        this.logger.debug(
          `Order item ${item.id}: quantity=${quantity}, unitPrice=${unitPrice}, subtotal=${itemSubtotal.toNumber()}, tax=${itemTax.toNumber()}`,
        );
      }

      if (currentOrder?.discountPercent) {
        const discountAmount = MoneyUtils.percentage(
          subtotal,
          currentOrder.discountPercent,
        ).toNumber();

        this.logger.log(
          `Applying discountPercent ${currentOrder.discountPercent}%: discountAmount=${discountAmount}`,
        );

        currentOrder.discount = discountAmount;
      }

      const discount = MoneyUtils.from(currentOrder?.discount || 0);

      const totalAmount = MoneyUtils.subtract(
        MoneyUtils.add(subtotal, totalTax),
        discount,
      );

      this.logger.log(
        `Calculated order values: subtotal=${subtotal.toNumber()}, tax=${totalTax.toNumber()}, discount=${discount.toNumber()}, totalAmount=${totalAmount.toNumber()}`,
      );

      return {
        subtotal: MoneyUtils.round(subtotal, 2).toNumber(),
        tax: MoneyUtils.round(totalTax, 2).toNumber(),
        discount: MoneyUtils.round(discount, 2).toNumber(),
        totalAmount: MoneyUtils.round(totalAmount, 2).toNumber(),
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
      const orderRepository = await this.getOrderRepo(workspaceId);

      const now = DateTimeUtils.now();
      const year = now.year;
      const month = String(now.month).padStart(2, '0');
      const day = String(now.day).padStart(2, '0');
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
        const dateStr = DateTimeUtils.format(
          DateTimeUtils.now(),
          DATE_TIME_FORMATS.DISPLAY_DATE,
        );

        return `Đơn hàng ${dateStr}`;
      }

      // Generate name based on products
      const productNames = currentOrder.orderItems.map((item) => {
        if (item.snapshotProductName) {
          return item.snapshotProductName;
        }
        // Use snapshot data if available
        if (item.snapshotMktProduct) {
          const packageName = item.snapshotMktPackage?.displayName;

          return packageName
            ? `${item.snapshotMktProduct.displayName} - ${packageName}`
            : item.snapshotMktProduct.displayName;
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

  async trialToPaidOrder(
    action: ORDER_ACTION,
    createdOrder: MktOrderWorkspaceEntity,
    workspaceId: string,
    trialOrderId: string | null,
    paymentMethodsMeta: ORDER_METADATA['paymentMethods'] | null,
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

    // TODO: Implement license order reference update using new license module
    // The old MktLicenseService has been removed with the license module
    this.logger.warn(
      'License order reference update is not implemented - license module removed',
    );

    const generatedOrderCode = await this.generateOrderCode(workspaceId);

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
      workspaceId,
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

  private async getOrderRepo(workspaceId: string) {
    if (!workspaceId) return this.mktRepo.getOrderRepository();

    return this.mktRepo.getOrderRepositoryByWorkspaceId(workspaceId);
  }

  private async createContractIfRequired(
    order: MktOrderWorkspaceEntity | null,
    workspaceId: string,
    mktCustomerId: string | null,
    generatedOrderCode: string,
  ) {
    if (order && order.requireContract) {
      try {
        this.logger.log(`Creating contract for order: ${order.id}`);

        const contract = await this.mktContractService.createContractForOrder(
          order,
          workspaceId,
          mktCustomerId,
          generatedOrderCode,
        );

        this.logger.log(
          `Successfully created and linked contract ${contract.contractNumber} to order ${order.id}`,
        );

        return contract.id;
      } catch (contractError) {
        this.logger.error(
          `Failed to create contract for order ${order.id}:`,
          contractError,
        );
        // Continue with order processing even if contract creation fails
      }
    }
  }
}
