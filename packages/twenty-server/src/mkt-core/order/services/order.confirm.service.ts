import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

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
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
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
  async generateOrderCode(workspaceId: string): Promise<string | null> {
    try {
      const orderRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderWorkspaceEntity>(
          workspaceId,
          'mktOrder',
          { shouldBypassPermissionChecks: true },
        );

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      // Find the highest order number for today
      const todayOrders = await orderRepository
        .createQueryBuilder('order')
        .where('order.orderCode LIKE :pattern', {
          pattern: `ORD${datePrefix}%`,
        })
        .orderBy('order.orderCode', 'DESC')
        .limit(1)
        .getOne();

      let nextNumber = 1;

      if (todayOrders?.orderCode) {
        // Extract number from existing order code (e.g., ORD20241201001 -> 1)
        const match = todayOrders.orderCode.match(/ORD\d{8}(\d{3})$/);

        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Generate new order code: ORD + YYYYMMDD + 3-digit number
      const orderCode = `ORD${datePrefix}${String(nextNumber).padStart(3, '0')}`;

      // Double-check uniqueness
      const existingOrder = await orderRepository.findOne({
        where: { orderCode },
      });

      if (existingOrder) {
        // If somehow duplicate, try with timestamp
        const timestamp = Date.now().toString().slice(-6);

        return `ORD${datePrefix}${timestamp}`;
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
}
