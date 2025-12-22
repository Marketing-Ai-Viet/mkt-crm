import { Injectable, Logger } from '@nestjs/common';

import { ORDER_CALCULATION_CONFIG } from 'src/mkt-core/order/constants';
import { MKT_ORDER_CALCULATION_LOG_CONTEXT } from 'src/mkt-core/order/messages';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import {
  OrderCalculatedValues,
  OrderItemWithCalculation,
  VariantForCalculation,
} from 'src/mkt-core/order/types';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

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
   * Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
   */
  calculateOrderItem(
    variant: VariantForCalculation,
    quantity: number,
    taxPercentage: number = ORDER_CALCULATION_CONFIG.DEFAULT_TAX_PERCENTAGE,
  ): OrderItemWithCalculation {
    const unitPrice = variant.price;
    const totalPrice = MoneyUtils.multiply(unitPrice, quantity).toNumber();
    const taxAmount = MoneyUtils.percentage(
      totalPrice,
      taxPercentage,
    ).toNumber();
    const totalAmountWithTax = MoneyUtils.add(totalPrice, taxAmount).toNumber();

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
   * Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
   */
  calculateOrderTotals(
    items: OrderItemWithCalculation[],
    discountPercent = 0,
  ): OrderCalculatedValues {
    // Subtotal = tổng totalPrice của các items
    const subtotal = MoneyUtils.sumBy(items, 'totalPrice').toNumber();

    // Tax = tổng taxAmount của các items
    const tax = MoneyUtils.sumBy(items, 'taxAmount').toNumber();

    // Discount = subtotal * discount percent
    const discount = MoneyUtils.percentage(
      subtotal,
      discountPercent,
    ).toNumber();

    // Total = subtotal + tax - discount
    const totalAmount = MoneyUtils.subtract(
      MoneyUtils.add(subtotal, tax),
      discount,
    ).toNumber();

    return {
      subtotal,
      tax,
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
      variantId: item.externalMktProductId ?? '',
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
   * Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
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
    const dailyRate = MoneyUtils.divideSafe(originalAmount, totalDays);
    const refundAmount = MoneyUtils.multiply(dailyRate, remainingDays);

    return MoneyUtils.round(
      refundAmount,
      ORDER_CALCULATION_CONFIG.DECIMAL_PLACES,
    ).toNumber();
  }

  /**
   * Tính số tiền còn lại sau hoàn tiền
   * Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
   */
  calculateRemainingAmount(
    originalAmount: number,
    refundAmount: number,
  ): number {
    const remaining = MoneyUtils.subtract(originalAmount, refundAmount);

    return MoneyUtils.max(remaining, 0).toNumber();
  }

  // ============================================
  // HELPER METHODS
  // ============================================

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
