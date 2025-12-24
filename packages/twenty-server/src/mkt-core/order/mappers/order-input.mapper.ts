import {
  ConfirmOrderInputDto,
  CreateOrderWithItemsInputDto,
  RefundOrderInputDto,
  UpdateOrderItemInputDto,
  UpdateOrderStatusInputDto,
} from 'src/mkt-core/order/dto/create-order.input';
import {
  ConfirmOrderInput,
  CreateOrderWithItemsInput,
  RefundOrderInput,
  UpdateOrderItemInput,
  UpdateOrderStatusInput,
} from 'src/mkt-core/order/types';
import { MktSupportedLanguage } from 'src/mkt-core/order/types/mkt-product-proxy.types';
import { ORDER_STATUS } from 'src/mkt-core/order/constants';
import { PaymentCurrency } from 'src/mkt-core/payment/types';
import { OrderStatusService } from 'src/mkt-core/order/services/core';

/**
 * OrderInputMapper - Transforms GraphQL DTOs to domain types
 *
 * Single source of truth for input transformations.
 * Eliminates duplication between resolver methods.
 *
 * Usage:
 * ```typescript
 * const domainInput = OrderInputMapper.toCreateOrderInput(dto);
 * ```
 */
export const OrderInputMapper = {
  /**
   * Map CreateOrderWithItemsInputDto to CreateOrderWithItemsInput
   */
  toCreateOrderInput(
    dto: CreateOrderWithItemsInputDto,
  ): CreateOrderWithItemsInput {
    return {
      customerId: dto.customerId,
      name: dto.name,
      currency: dto.currency as PaymentCurrency | undefined,
      note: dto.note,
      requireContract: dto.requireContract,
      discountPercent: dto.discountPercent,
      externalProducts: dto.externalProducts.map((p) => ({
        productId: p.productId,
        packageId: p.packageId,
        maxDevices: p.maxDevices,
        splitLicenses: p.splitLicenses,
      })),
      orderLanguage: dto.orderLanguage as MktSupportedLanguage | undefined,
      paymentMethods: dto.paymentMethods?.map((p) => ({
        paymentMethodId: p.paymentMethodId,
        name: p.name,
        duration: p.duration,
        amount: p.amount,
      })),
      action: dto.action,
      licenseId: dto.licenseId,
      trialOrderId: dto.trialOrderId,
      // Promotion fields
      couponCode: dto.couponCode,
      applyAutoPromotions: dto.applyAutoPromotions ?? true,
    };
  },

  /**
   * Map ConfirmOrderInputDto to ConfirmOrderInput
   */
  toConfirmOrderInput(dto: ConfirmOrderInputDto): ConfirmOrderInput {
    return {
      orderId: dto.orderId,
      action: dto.action,
      accountingConfirmed: dto.accountingConfirmed,
      note: dto.note,
    };
  },

  /**
   * Map UpdateOrderStatusInputDto to UpdateOrderStatusInput
   * Uses OrderStatusService to map action to status
   */
  toUpdateOrderStatusInput(
    dto: UpdateOrderStatusInputDto,
    orderStatusService: OrderStatusService,
  ): UpdateOrderStatusInput {
    const status = orderStatusService.getStatusFromAction(dto.action);

    return {
      orderId: dto.orderId,
      status,
      note: dto.note,
    };
  },

  /**
   * Map UpdateOrderStatusInputDto to UpdateOrderStatusInput with explicit status
   * Alternative method when status is already known
   */
  toUpdateOrderStatusInputWithStatus(
    dto: UpdateOrderStatusInputDto,
    status: ORDER_STATUS,
  ): UpdateOrderStatusInput {
    return {
      orderId: dto.orderId,
      status,
      note: dto.note,
    };
  },

  /**
   * Map RefundOrderInputDto to RefundOrderInput
   */
  toRefundOrderInput(dto: RefundOrderInputDto): RefundOrderInput {
    return {
      orderId: dto.orderId,
      licenseIds: dto.licenseIds,
      refundAmount: dto.refundAmount,
      reason: dto.reason,
      isPartial: dto.isPartial,
    };
  },

  /**
   * Map UpdateOrderItemInputDto to UpdateOrderItemInput
   */
  toUpdateOrderItemInput(dto: UpdateOrderItemInputDto): UpdateOrderItemInput {
    return {
      orderItemId: dto.orderItemId,
      variantId: dto.variantId,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      note: dto.note,
      updatedAt: dto.updatedAt,
    };
  },
} as const;

/**
 * Type for the OrderInputMapper
 */
export type OrderInputMapperType = typeof OrderInputMapper;
