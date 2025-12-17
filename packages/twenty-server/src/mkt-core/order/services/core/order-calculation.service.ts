import { Injectable, Logger } from '@nestjs/common';

import { ORDER_CALCULATION_CONFIG } from 'src/mkt-core/order/constants';
import { MKT_ORDER_CALCULATION_LOG_CONTEXT } from 'src/mkt-core/order/messages';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import {
  OrderCalculatedValues,
  OrderItemWithCalculation,
  VariantForCalculation,
} from 'src/mkt-core/order/types';

/**
 * Service để tính toán các giá trị trong order
 * Tách biệt với database operations
 */
@Injectable()
export class OrderCalculationService {
  private readonly logger = new Logger(MKT_ORDER_CALCULATION_LOG_CONTEXT);

  // ============================================
  // ORDER ITEM CALCULATIONS
  // ============================================

  /**
   * Tính toán giá trị cho một order item
   */
  calculateOrderItem(
    variant: VariantForCalculation,
    quantity: number,
    taxPercentage: number = ORDER_CALCULATION_CONFIG.DEFAULT_TAX_PERCENTAGE,
  ): OrderItemWithCalculation {
    const unitPrice = variant.price;
    const totalPrice = this.round(unitPrice * quantity);
    const taxAmount = this.round(totalPrice * (taxPercentage / 100));
    const totalAmountWithTax = this.round(totalPrice + taxAmount);

    return {
      variantId: variant.id,
      name: variant.name,
      unitPrice,
      quantity,
      totalPrice,
      taxPercentage,
      taxAmount,
      totalAmountWithTax,
    };
  }

  /**
   * Tính toán giá trị cho nhiều order items
   */
  calculateOrderItems(
    variants: VariantForCalculation[],
    quantities: Map<string, number>,
    taxPercentage: number = ORDER_CALCULATION_CONFIG.DEFAULT_TAX_PERCENTAGE,
  ): OrderItemWithCalculation[] {
    return variants.map((variant) => {
      const quantity = quantities.get(variant.id) ?? 1;

      return this.calculateOrderItem(variant, quantity, taxPercentage);
    });
  }

  // ============================================
  // ORDER TOTALS CALCULATIONS
  // ============================================

  /**
   * Tính tổng các giá trị cho order từ danh sách items
   */
  calculateOrderTotals(
    items: OrderItemWithCalculation[],
    discountPercent = 0,
  ): OrderCalculatedValues {
    // Subtotal = tổng totalPrice của các items
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Tax = tổng taxAmount của các items
    const tax = items.reduce((sum, item) => sum + item.taxAmount, 0);

    // Discount = subtotal * discount percent
    const discount = this.round(subtotal * (discountPercent / 100));

    // Total = subtotal + tax - discount
    const totalAmount = this.round(subtotal + tax - discount);

    return {
      subtotal: this.round(subtotal),
      tax: this.round(tax),
      taxPercentage: items[0]?.taxPercentage ?? 0,
      discount,
      totalAmount,
    };
  }

  /**
   * Tính tổng từ các MktOrderItemWorkspaceEntity
   */
  calculateOrderTotalsFromEntities(
    orderItems: MktOrderItemWorkspaceEntity[],
    discountPercent = 0,
  ): OrderCalculatedValues {
    const items: OrderItemWithCalculation[] = orderItems.map((item) => ({
      variantId: item.mktVariantId ?? '',
      name: item.name,
      unitPrice: item.unitPrice ?? 0,
      quantity: item.quantity ?? 1,
      totalPrice: item.totalPrice ?? 0,
      taxPercentage: item.taxPercentage ?? 0,
      taxAmount: item.taxAmount ?? 0,
      totalAmountWithTax: item.totalAmountWithTax ?? 0,
    }));

    return this.calculateOrderTotals(items, discountPercent);
  }

  // ============================================
  // REFUND CALCULATIONS
  // ============================================

  /**
   * Tính số tiền hoàn lại dựa trên số ngày đã sử dụng
   */
  calculateRefundAmount(
    originalAmount: number,
    totalDays: number,
    usedDays: number,
  ): number {
    if (totalDays <= 0 || usedDays >= totalDays) {
      return 0;
    }

    const remainingDays = totalDays - usedDays;
    const dailyRate = originalAmount / totalDays;
    const refundAmount = dailyRate * remainingDays;

    return this.round(refundAmount);
  }

  /**
   * Tính số tiền còn lại sau hoàn tiền
   */
  calculateRemainingAmount(
    originalAmount: number,
    refundAmount: number,
  ): number {
    return this.round(Math.max(0, originalAmount - refundAmount));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Làm tròn số theo số chữ số thập phân
   */
  private round(
    value: number,
    decimals: number = ORDER_CALCULATION_CONFIG.DECIMAL_PLACES,
  ): number {
    const multiplier = Math.pow(10, decimals);

    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Format số tiền theo currency
   */
  formatCurrency(
    amount: number,
    currency: string = ORDER_CALCULATION_CONFIG.DEFAULT_CURRENCY,
  ): string {
    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
    });

    return formatter.format(amount);
  }
}
