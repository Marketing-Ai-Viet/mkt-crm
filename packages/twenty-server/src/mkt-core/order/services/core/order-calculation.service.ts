import { Injectable, Logger } from '@nestjs/common';

import { ORDER_CALCULATION_CONFIG } from 'src/mkt-core/order/constants';
import { MKT_ORDER_CALCULATION_LOG_CONTEXT } from 'src/mkt-core/order/messages';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { ORDER_ITEM_SOURCE } from 'src/mkt-core/order/types/order-combo.types';
import {
  OrderCalculatedValues,
  OrderItemWithCalculation,
  VariantForCalculation,
} from 'src/mkt-core/order/types';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';

// ============================================
// TYPES
// ============================================

/**
 * Options cho việc tính toán order totals
 */
export type CalculateOrderTotalsOptions = {
  /**
   * Phần trăm discount (0-100)
   * Lưu ý: Discount sẽ KHÔNG được áp dụng nếu order có combo items
   */
  discountPercent?: number;
  /**
   * Có phải là combo order hay không
   * Nếu true, discount sẽ bị bỏ qua vì combo đã có giá riêng
   */
  isCombo?: boolean;
};

// ============================================
// CONSTANTS
// ============================================

const CALCULATION_LOG_MESSAGES = {
  COMBO_DISCOUNT_SKIPPED:
    'Discount skipped: Combo orders cannot have additional discounts applied',
} as const;

/**
 * Service để tính toán các giá trị trong order
 * Tách biệt với database operations
 *
 * Lưu ý quan trọng:
 * - Tax calculation đã bị loại bỏ (luôn = 0)
 * - Combo orders không được áp dụng discount (giá combo đã bao gồm discount)
 */
@Injectable()
export class OrderCalculationService {
  private readonly logger = new Logger(MKT_ORDER_CALCULATION_LOG_CONTEXT);

  constructor() {}

  // ============================================
  // ORDER ITEM CALCULATIONS
  // ============================================

  /**
   * Tính toán giá trị cho một order item
   * Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
   *
   * Lưu ý: Tax đã bị loại bỏ, luôn trả về taxPercentage = 0, taxAmount = 0
   */
  calculateOrderItem(
    variant: VariantForCalculation,
    quantity: number,
  ): OrderItemWithCalculation {
    const unitPrice = variant.price;
    const totalPrice = MoneyUtils.multiply(unitPrice, quantity).toNumber();

    // Tax đã bị loại bỏ - luôn = 0
    const taxPercentage = 0;
    const taxAmount = 0;
    const totalAmountWithTax = totalPrice; // Không có tax nên = totalPrice

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
  ): OrderItemWithCalculation[] {
    return variants.map((variant) => {
      const quantity = quantities.get(variant.id) ?? 1;

      return this.calculateOrderItem(variant, quantity);
    });
  }

  // ============================================
  // ORDER TOTALS CALCULATIONS
  // ============================================

  /**
   * Tính tổng các giá trị cho order từ danh sách items
   * Sử dụng MoneyUtils để đảm bảo chính xác trong tính toán tài chính
   *
   * Lưu ý quan trọng:
   * - Tax đã bị loại bỏ (luôn = 0)
   * - Combo orders KHÔNG được áp dụng discount (giá combo đã bao gồm discount)
   *
   * @param items - Danh sách items đã tính toán
   * @param options - Options bao gồm discountPercent và isCombo
   */
  calculateOrderTotals(
    items: OrderItemWithCalculation[],
    options: CalculateOrderTotalsOptions = {},
  ): OrderCalculatedValues {
    const { discountPercent = 0, isCombo = false } = options;

    // Subtotal = tổng totalPrice của các items
    const subtotal = MoneyUtils.sumBy(items, 'totalPrice').toNumber();

    // Tax đã bị loại bỏ - luôn = 0
    const tax = 0;

    // Discount: Combo orders KHÔNG được áp dụng discount
    // Vì giá combo đã bao gồm discount riêng
    let discount = 0;

    if (isCombo) {
      this.logger.debug(CALCULATION_LOG_MESSAGES.COMBO_DISCOUNT_SKIPPED);
    } else if (discountPercent > 0) {
      discount = MoneyUtils.percentage(subtotal, discountPercent).toNumber();
    }

    // Total = subtotal - discount (không có tax)
    const totalAmount = MoneyUtils.subtract(subtotal, discount).toNumber();

    return {
      subtotal,
      tax,
      taxPercentage: 0, // Tax đã bị loại bỏ
      discount,
      totalAmount,
    };
  }

  /**
   * Tính tổng từ các MktOrderItemWorkspaceEntity
   *
   * Tự động detect combo order dựa vào itemSource của items
   */
  calculateOrderTotalsFromEntities(
    orderItems: MktOrderItemWorkspaceEntity[],
    options: CalculateOrderTotalsOptions = {},
  ): OrderCalculatedValues {
    // Auto-detect combo order nếu không được chỉ định
    const isCombo =
      options.isCombo ??
      orderItems.some(
        (item) => item.itemSource === ORDER_ITEM_SOURCE.COMBO_ITEM,
      );

    const items: OrderItemWithCalculation[] = orderItems.map((item) => ({
      variantId: item.externalMktProductId ?? '',
      name: item.name,
      unitPrice: item.unitPrice ?? 0,
      quantity: item.quantity ?? 1,
      totalPrice: item.totalPrice ?? 0,
      taxPercentage: 0, // Tax đã bị loại bỏ
      taxAmount: 0, // Tax đã bị loại bỏ
      totalAmountWithTax: item.totalPrice ?? 0, // Không có tax nên = totalPrice
    }));

    return this.calculateOrderTotals(items, {
      ...options,
      isCombo,
    });
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
