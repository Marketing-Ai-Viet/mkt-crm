import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import {
  ORDER_ITEM_DEFAULTS,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants';
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
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

// TODO: Replace with new product entity type when product module is restored
type MktVariantWorkspaceEntity = {
  id: string;
  name: string;
  price: number;
  mktProductId?: string | null;
};

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
  private readonly logger = new Logger(MKT_ORDER_ITEM_LOG_CONTEXT);
  private readonly optimisticLockingEnabled: boolean;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {
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
      const orderItem = await this.orderItemRepository.findByIdWithRelations(
        workspaceId,
        orderItemId,
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
   * Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
   */
  calculateValuesFromVariant(
    variant: MktVariantWorkspaceEntity,
    quantity: number = ORDER_ITEM_DEFAULTS.QUANTITY,
    taxPercentage: number = ORDER_ITEM_DEFAULTS.TAX_PERCENTAGE,
  ): OrderItemCalculatedValues {
    const safeQuantity = quantity > 0 ? quantity : ORDER_ITEM_DEFAULTS.QUANTITY;
    const unitPrice = variant.price ?? 0;
    const totalPrice = MoneyUtils.multiply(safeQuantity, unitPrice).toNumber();
    const taxAmount = MoneyUtils.percentage(
      totalPrice,
      taxPercentage,
    ).toNumber();
    const totalAmountWithTax = MoneyUtils.add(totalPrice, taxAmount).toNumber();

    return {
      name: `${variant.name} (x${safeQuantity})`,
      snapshotProductName: variant.name,
      mktProductId: variant.mktProductId ?? null,
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

      // Get variant for calculation
      const variant: MktVariantWorkspaceEntity | null = null;

      // NOTE: Product module has been removed
      // Variant lookup is deprecated - use external product integration instead
      if (input.variantId) {
        this.logger.warn(
          'Variant lookup is deprecated - product module has been removed',
        );
        // Store the variant ID for legacy compatibility but don't look it up
        (updateData as Record<string, string | null>).mktVariantId =
          input.variantId;
      }

      // Calculate values if we have a variant
      if (variant) {
        const quantity =
          input.quantity ?? orderItem.quantity ?? ORDER_ITEM_DEFAULTS.QUANTITY;
        const calculatedValues = this.calculateValuesFromVariant(
          variant,
          quantity,
          orderItem.taxPercentage ?? ORDER_ITEM_DEFAULTS.TAX_PERCENTAGE,
        );

        Object.assign(updateData, calculatedValues);
      } else {
        // Manual update without variant recalculation
        if (input.quantity !== undefined) {
          updateData.quantity =
            input.quantity > 0 ? input.quantity : ORDER_ITEM_DEFAULTS.QUANTITY;
        }

        if (input.unitPrice !== undefined) {
          updateData.unitPrice = input.unitPrice;
        }

        // Recalculate totals if quantity or price changed
        // Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
        if (
          updateData.quantity !== undefined ||
          updateData.unitPrice !== undefined
        ) {
          const quantity =
            updateData.quantity ??
            orderItem.quantity ??
            ORDER_ITEM_DEFAULTS.QUANTITY;
          const unitPrice = updateData.unitPrice ?? orderItem.unitPrice ?? 0;
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
        }
      }

      // Update the order item
      await this.orderItemRepository.update(
        workspaceId,
        orderItemId,
        updateData,
      );

      // Fetch updated order item
      const updatedOrderItem =
        await this.orderItemRepository.findByIdWithRelations(
          workspaceId,
          orderItemId,
        );

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
      const orderItem = await this.orderItemRepository.findByIdWithRelations(
        workspaceId,
        orderItemId,
      );

      if (!orderItem) {
        return {
          success: false,
          error: 'Order item not found',
        };
      }

      // NOTE: Product module has been removed - variant recalculation is deprecated
      this.logger.warn(
        'recalculateOrderItem is deprecated - product module has been removed',
      );

      // Return success without recalculation since variants are no longer available
      // The order item will keep its existing values

      const updatedOrderItem =
        await this.orderItemRepository.findByIdWithRelations(
          workspaceId,
          orderItemId,
        );

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
    return this.orderItemRepository.findByIdWithRelations(
      workspaceId,
      orderItemId,
    );
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
  ): Promise<BulkRecalculateResult> {
    try {
      const orderItems = await this.orderItemRepository.findByOrderId(
        workspaceId,
        orderId,
        { relations: { mktOrder: true } },
      );

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

  private async getVariant(
    variantId: string,
    workspaceId: string,
  ): Promise<MktVariantWorkspaceEntity | null> {
    // TODO: Implement variant lookup using mkt-product-integration module
    // The old MktVariantWorkspaceEntity has been removed with the product module
    this.logger.warn(
      `getVariant not implemented - product module removed. Variant ID: ${variantId}, Workspace: ${workspaceId}`,
    );

    return null;
  }

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
