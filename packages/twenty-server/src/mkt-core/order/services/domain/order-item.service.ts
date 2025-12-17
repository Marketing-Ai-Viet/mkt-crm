import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';

/**
 * Input for updating order item
 */
export type UpdateOrderItemInput = {
  orderItemId: string;
  variantId?: string;
  quantity?: number;
  unitPrice?: number;
  note?: string;
  updatedAt?: string; // For optimistic locking
};

/**
 * Calculated values for order item
 */
export type OrderItemCalculatedValues = {
  name: string;
  snapshotProductName: string;
  mktProductId: string | null;
  unitName: string;
  unitPrice: number;
  quantity: number;
  taxPercentage: number;
  taxAmount: number;
  totalPrice: number;
  totalAmountWithTax: number;
};

/**
 * Validation result
 */
export type OrderItemValidationResult = {
  valid: boolean;
  error?: string;
  orderItem?: MktOrderItemWorkspaceEntity;
};

/**
 * Update result
 */
export type UpdateOrderItemResult = {
  success: boolean;
  orderItem?: MktOrderItemWorkspaceEntity;
  error?: string;
};

const DEFAULT_TAX_PERCENTAGE = 0;
const DEFAULT_UNIT_NAME = 'pcs';
const DEFAULT_QUANTITY = 1;

/**
 * OrderItemService - Centralized service for order item operations
 *
 * Responsibilities:
 * - Validate order items for update
 * - Calculate order item values from variant
 * - Update order items with recalculation
 * - Handle optimistic locking
 *
 * Replaces logic from:
 * - MktOrderItemUpdateOnePreQueryHook
 */
@Injectable()
export class OrderItemService {
  private readonly logger = new Logger(OrderItemService.name);
  private readonly optimisticLockingEnabled: boolean;

  constructor(private readonly twentyORMGlobalManager: TwentyORMGlobalManager) {
    this.optimisticLockingEnabled =
      process.env.ORDER_OPTIMISTIC_LOCKING_ENABLED !== 'false';
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
      const orderItem = await this.getOrderItemWithRelations(
        orderItemId,
        workspaceId,
      );

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

      if (this.optimisticLockingEnabled && orderStatus) {
        return {
          valid: false,
          error: 'Order item cannot be updated because order is locked',
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
   * Calculate order item values from variant
   */
  calculateValuesFromVariant(
    variant: MktVariantWorkspaceEntity,
    quantity: number = DEFAULT_QUANTITY,
    taxPercentage: number = DEFAULT_TAX_PERCENTAGE,
  ): OrderItemCalculatedValues {
    const safeQuantity = quantity > 0 ? quantity : DEFAULT_QUANTITY;
    const unitPrice = variant.price ?? 0;
    const totalPrice = this.roundToTwoDecimals(safeQuantity * unitPrice);
    const taxAmount = this.roundToTwoDecimals(
      (totalPrice * taxPercentage) / 100,
    );
    const totalAmountWithTax = this.roundToTwoDecimals(totalPrice + taxAmount);

    return {
      name: `${variant.name} (x${safeQuantity})`,
      snapshotProductName: variant.name,
      mktProductId: variant.mktProductId ?? null,
      unitName: DEFAULT_UNIT_NAME,
      unitPrice,
      quantity: safeQuantity,
      taxPercentage,
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
      const orderItemRepository =
        await this.getOrderItemRepository(workspaceId);

      // Build update data
      const updateData: Partial<MktOrderItemWorkspaceEntity> = {};

      // Get variant for calculation
      let variant: MktVariantWorkspaceEntity | null = null;

      if (input.variantId) {
        variant = await this.getVariant(input.variantId, workspaceId);

        if (!variant) {
          return {
            success: false,
            error: `Variant not found: ${input.variantId}`,
          };
        }

        updateData.mktVariantId = input.variantId;
      } else if (orderItem.mktVariant) {
        variant = orderItem.mktVariant as MktVariantWorkspaceEntity;
      }

      // Calculate values if we have a variant
      if (variant) {
        const quantity =
          input.quantity ?? orderItem.quantity ?? DEFAULT_QUANTITY;
        const calculatedValues = this.calculateValuesFromVariant(
          variant,
          quantity,
          orderItem.taxPercentage ?? DEFAULT_TAX_PERCENTAGE,
        );

        Object.assign(updateData, calculatedValues);
      } else {
        // Manual update without variant recalculation
        if (input.quantity !== undefined) {
          updateData.quantity =
            input.quantity > 0 ? input.quantity : DEFAULT_QUANTITY;
        }

        if (input.unitPrice !== undefined) {
          updateData.unitPrice = input.unitPrice;
        }

        // Recalculate totals if quantity or price changed
        if (
          updateData.quantity !== undefined ||
          updateData.unitPrice !== undefined
        ) {
          const quantity =
            updateData.quantity ?? orderItem.quantity ?? DEFAULT_QUANTITY;
          const unitPrice = updateData.unitPrice ?? orderItem.unitPrice ?? 0;
          const taxPercentage =
            orderItem.taxPercentage ?? DEFAULT_TAX_PERCENTAGE;

          const totalPrice = this.roundToTwoDecimals(quantity * unitPrice);
          const taxAmount = this.roundToTwoDecimals(
            (totalPrice * taxPercentage) / 100,
          );

          updateData.totalPrice = totalPrice;
          updateData.taxAmount = taxAmount;
          updateData.totalAmountWithTax = this.roundToTwoDecimals(
            totalPrice + taxAmount,
          );
        }
      }

      // Update the order item
      await orderItemRepository.update(orderItemId, updateData);

      // Fetch updated order item
      const updatedOrderItem = await orderItemRepository.findOne({
        where: { id: orderItemId },
        relations: ['mktOrder', 'mktVariant', 'mktProduct'],
      });

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
   * Recalculate order item from its variant
   */
  async recalculateOrderItem(
    orderItemId: string,
    workspaceId: string,
  ): Promise<UpdateOrderItemResult> {
    try {
      const orderItem = await this.getOrderItemWithRelations(
        orderItemId,
        workspaceId,
      );

      if (!orderItem) {
        return {
          success: false,
          error: 'Order item not found',
        };
      }

      const variant = orderItem.mktVariant as
        | MktVariantWorkspaceEntity
        | undefined;

      if (!variant) {
        return {
          success: false,
          error: 'Order item has no associated variant for recalculation',
        };
      }

      const calculatedValues = this.calculateValuesFromVariant(
        variant,
        orderItem.quantity ?? DEFAULT_QUANTITY,
        orderItem.taxPercentage ?? DEFAULT_TAX_PERCENTAGE,
      );

      const orderItemRepository =
        await this.getOrderItemRepository(workspaceId);

      await orderItemRepository.update(orderItemId, calculatedValues);

      const updatedOrderItem = await orderItemRepository.findOne({
        where: { id: orderItemId },
        relations: ['mktOrder', 'mktVariant', 'mktProduct'],
      });

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
    workspaceId: string,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    const orderItemRepository = await this.getOrderItemRepository(workspaceId);

    return orderItemRepository.findOne({
      where: { id: orderItemId },
      relations: ['mktOrder', 'mktVariant', 'mktProduct'],
    });
  }

  /**
   * Check if order allows item modification
   */
  canModifyOrderItems(order: MktOrderWorkspaceEntity | null): boolean {
    if (!order) return false;

    const status = order.status as ORDER_STATUS | null;

    // Only DRAFT orders can have items modified
    if (!status || status === ORDER_STATUS.DRAFT) {
      return true;
    }

    return false;
  }

  /**
   * Bulk recalculate all items for an order
   */
  async recalculateAllOrderItems(
    orderId: string,
    workspaceId: string,
  ): Promise<{
    success: boolean;
    updatedCount: number;
    errors: string[];
  }> {
    try {
      const orderItemRepository =
        await this.getOrderItemRepository(workspaceId);
      const orderItems = await orderItemRepository.find({
        where: { mktOrderId: orderId },
        relations: ['mktVariant'],
      });

      let updatedCount = 0;
      const errors: string[] = [];

      for (const item of orderItems) {
        const result = await this.recalculateOrderItem(item.id, workspaceId);

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

  private async getOrderItemRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktOrderItemWorkspaceEntity>(
      workspaceId,
      'mktOrderItem',
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getVariant(
    variantId: string,
    workspaceId: string,
  ): Promise<MktVariantWorkspaceEntity | null> {
    const variantRepository =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktVariantWorkspaceEntity>(
        workspaceId,
        'mktVariant',
        { shouldBypassPermissionChecks: true },
      );

    return variantRepository.findOne({
      where: { id: variantId },
      relations: ['mktProduct'],
    });
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private validateUpdatedAt(
    orderUpdatedAt: string,
    inputUpdatedAt: string,
  ): boolean {
    const orderDate = new Date(orderUpdatedAt);
    const inputDate = new Date(inputUpdatedAt);

    return orderDate.getTime() === inputDate.getTime();
  }
}
