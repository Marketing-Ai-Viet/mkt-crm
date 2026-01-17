import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ORDER_ITEM_DEFAULTS,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants';
import {
  ORDER_CONFIG_KEY,
  ORDER_FEATURE_DEFAULTS,
  OrderConfig,
} from 'src/mkt-core/order/config';
import { MKT_ORDER_ITEM_LOG_CONTEXT } from 'src/mkt-core/order/messages';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories';
import {
  BulkRecalculateResult,
  OrderItemCalculatedValues,
  OrderItemValidationResult,
  UpdateOrderItemInput,
  UpdateOrderItemResult,
} from 'src/mkt-core/order/types';
import {
  MktPackageSnapshot,
  MktProductSnapshot,
} from 'src/mkt-core/mkt-product-integration/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

/**
 * OrderItemService - Centralized service for order item operations
 *
 * Responsibilities:
 * - Validate order items for update
 * - Calculate order item values from external product snapshots
 * - Update order items with recalculation
 * - Handle optimistic locking
 *
 * Note: MktVariantWorkspaceEntity has been removed.
 * Order items now use external MKT Server products via snapshots.
 */
@Injectable()
export class OrderItemService {
  private readonly logger = new Logger(MKT_ORDER_ITEM_LOG_CONTEXT);
  private readonly optimisticLockingEnabled: boolean;

  constructor(
    private readonly orderItemRepository: MktOrderItemRepository,
    @Inject(ORDER_CONFIG_KEY)
    private readonly config: OrderConfig,
  ) {
    this.optimisticLockingEnabled =
      this.config?.features?.optimisticLockingEnabled ??
      ORDER_FEATURE_DEFAULTS.OPTIMISTIC_LOCKING_ENABLED;
  }

  /**
   * Validate order item for update
   */
  async validateForUpdate(
    orderItemId: string,
    workspaceId: string,
    input: UpdateOrderItemInput,
  ): Promise<OrderItemValidationResult> {
    try {
      const orderItem =
        await this.orderItemRepository.findByIdWithRelations(orderItemId);

      if (!orderItem) {
        return {
          valid: false,
          error: 'Order item not found',
        };
      }

      if (!orderItem.mktOrder) {
        return {
          valid: false,
          error: 'Order item has no associated order',
        };
      }

      // Check if order status allows modification
      const orderStatus = orderItem.mktOrder.status;

      if (!this.canModifyOrderItems(orderItem.mktOrder)) {
        return {
          valid: false,
          error: `Order item cannot be updated - order status: ${orderStatus}`,
        };
      }

      // Validate optimistic locking if enabled
      if (this.optimisticLockingEnabled && input.updatedAt) {
        const orderUpdatedAt = orderItem.mktOrder.updatedAt;

        if (
          orderUpdatedAt &&
          !this.validateUpdatedAt(orderUpdatedAt as string, input.updatedAt)
        ) {
          return {
            valid: false,
            error: `Order has been modified. Please refresh and try again.`,
          };
        }
      }

      this.logger.debug(
        `Order item validation passed. Order status: ${orderStatus ?? 'null'}`,
      );

      return {
        valid: true,
        orderItem,
      };
    } catch (error) {
      this.logger.error(`Validation error: ${error.message}`);

      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate order item values from package snapshot
   * Uses MoneyUtils for precise financial calculations
   */
  calculateValuesFromSnapshot(
    productSnapshot: MktProductSnapshot,
    packageSnapshot: MktPackageSnapshot,
    quantity: number = ORDER_ITEM_DEFAULTS.QUANTITY,
    taxPercentage: number = ORDER_ITEM_DEFAULTS.TAX_PERCENTAGE,
  ): OrderItemCalculatedValues {
    const safeQuantity = quantity > 0 ? quantity : ORDER_ITEM_DEFAULTS.QUANTITY;
    const unitPrice = packageSnapshot.price ?? 0;
    const totalPrice = MoneyUtils.multiply(safeQuantity, unitPrice).toNumber();
    const taxAmount = MoneyUtils.percentage(
      totalPrice,
      taxPercentage,
    ).toNumber();
    const totalAmountWithTax = MoneyUtils.add(totalPrice, taxAmount).toNumber();

    return {
      name: `${packageSnapshot.displayName} (x${safeQuantity})`,
      snapshotProductName: productSnapshot.displayName,
      mktProductId: null, // No internal product relation
      unitName: ORDER_ITEM_DEFAULTS.UNIT_NAME,
      unitPrice,
      quantity: safeQuantity,
      taxPercentage,
      taxAmount,
      totalPrice,
      totalAmountWithTax,
    };
  }

  /**
   * Calculate order item values from existing order item snapshots
   * Used for recalculation when quantity changes
   */
  calculateValuesFromOrderItem(
    orderItem: MktOrderItemWorkspaceEntity,
    quantity?: number,
    taxPercentage?: number,
  ): Partial<OrderItemCalculatedValues> {
    const safeQuantity =
      quantity ?? orderItem.quantity ?? ORDER_ITEM_DEFAULTS.QUANTITY;
    const unitPrice = orderItem.unitPrice ?? 0;
    const safeTaxPercentage =
      taxPercentage ??
      orderItem.taxPercentage ??
      ORDER_ITEM_DEFAULTS.TAX_PERCENTAGE;

    const totalPrice = MoneyUtils.multiply(safeQuantity, unitPrice).toNumber();
    const taxAmount = MoneyUtils.percentage(
      totalPrice,
      safeTaxPercentage,
    ).toNumber();
    const totalAmountWithTax = MoneyUtils.add(totalPrice, taxAmount).toNumber();

    return {
      quantity: safeQuantity,
      taxPercentage: safeTaxPercentage,
      taxAmount,
      totalPrice,
      totalAmountWithTax,
    };
  }

  /**
   * Update order item with automatic recalculation
   */
  async updateOrderItem(
    orderItemId: string,
    workspaceId: string,
    input: UpdateOrderItemInput,
  ): Promise<UpdateOrderItemResult> {
    try {
      // Validate first
      const validation = await this.validateForUpdate(
        orderItemId,
        workspaceId,
        input,
      );

      if (!validation.valid || !validation.orderItem) {
        return {
          success: false,
          error: validation.error ?? 'Order item validation failed',
        };
      }

      const { orderItem } = validation;

      // Build update data
      const updateData: Partial<MktOrderItemWorkspaceEntity> = {};

      // Handle quantity update
      if (input.quantity !== undefined) {
        updateData.quantity =
          input.quantity > 0 ? input.quantity : ORDER_ITEM_DEFAULTS.QUANTITY;
      }

      // Handle unit price update
      if (input.unitPrice !== undefined) {
        updateData.unitPrice = input.unitPrice;
      }

      // Recalculate totals if quantity or price changed
      if (
        updateData.quantity !== undefined ||
        updateData.unitPrice !== undefined
      ) {
        const calculatedValues = this.calculateValuesFromOrderItem(
          orderItem,
          updateData.quantity,
        );

        // Override with new unit price if provided
        if (updateData.unitPrice !== undefined) {
          const quantity =
            updateData.quantity ??
            orderItem.quantity ??
            ORDER_ITEM_DEFAULTS.QUANTITY;
          const unitPrice = updateData.unitPrice;
          const taxPercentage =
            orderItem.taxPercentage ?? ORDER_ITEM_DEFAULTS.TAX_PERCENTAGE;

          const totalPrice = MoneyUtils.multiply(
            quantity,
            unitPrice,
          ).toNumber();
          const taxAmount = MoneyUtils.percentage(
            totalPrice,
            taxPercentage,
          ).toNumber();

          updateData.totalPrice = totalPrice;
          updateData.taxAmount = taxAmount;
          updateData.totalAmountWithTax = MoneyUtils.add(
            totalPrice,
            taxAmount,
          ).toNumber();
        } else {
          // Use calculated values from existing order item
          Object.assign(updateData, calculatedValues);
        }
      }

      // Update the order item
      await this.orderItemRepository.updateOrderItem(orderItemId, updateData);

      // Fetch updated order item
      const updatedOrderItem =
        await this.orderItemRepository.findByIdWithRelations(orderItemId);

      this.logger.log(`Order item ${orderItemId} updated successfully`);

      return {
        success: true,
        orderItem: updatedOrderItem ?? undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to update order item: ${error.message}`);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Recalculate order item from its stored snapshots/values
   */
  async recalculateOrderItem(
    orderItemId: string,
  ): Promise<UpdateOrderItemResult> {
    try {
      const orderItem =
        await this.orderItemRepository.findByIdWithRelations(orderItemId);

      if (!orderItem) {
        return {
          success: false,
          error: 'Order item not found',
        };
      }

      // Recalculate from existing values
      const calculatedValues = this.calculateValuesFromOrderItem(orderItem);

      // Update the order item
      await this.orderItemRepository.updateOrderItem(
        orderItemId,
        calculatedValues as Partial<MktOrderItemWorkspaceEntity>,
      );

      const updatedOrderItem =
        await this.orderItemRepository.findByIdWithRelations(orderItemId);

      this.logger.log(`Order item ${orderItemId} recalculated successfully`);

      return {
        success: true,
        orderItem: updatedOrderItem ?? undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to recalculate order item: ${error.message}`);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get order item with full relations
   */
  async getOrderItemWithRelations(
    orderItemId: string,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.orderItemRepository.findByIdWithRelations(orderItemId);
  }

  /**
   * Check if order allows item modification
   */
  canModifyOrderItems(order: MktOrderWorkspaceEntity | null): boolean {
    if (!order) return false;

    const status = order.status as ORDER_STATUS | null;

    // Only DRAFT orders can have items modified
    return !status || status === ORDER_STATUS.DRAFT;
  }

  /**
   * Bulk recalculate all items for an order
   */
  async recalculateAllOrderItems(
    orderId: string,
  ): Promise<BulkRecalculateResult> {
    try {
      const orderItems = await this.orderItemRepository.findByOrderId(orderId, {
        relations: { mktOrder: true },
      });

      let updatedCount = 0;
      const errors: string[] = [];

      for (const item of orderItems) {
        const result = await this.recalculateOrderItem(item.id);

        if (result.success) {
          updatedCount++;
        } else {
          errors.push(`Item ${item.id}: ${result.error}`);
        }
      }

      return {
        success: errors.length === 0,
        updatedCount,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        updatedCount: 0,
        errors: [error.message],
      };
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private validateUpdatedAt(
    orderUpdatedAt: string,
    inputUpdatedAt: string,
  ): boolean {
    const orderDate = DateTimeUtils.fromISO(orderUpdatedAt);
    const inputDate = DateTimeUtils.fromISO(inputUpdatedAt);

    return (
      DateTimeUtils.toMillis(orderDate) === DateTimeUtils.toMillis(inputDate)
    );
  }
}
