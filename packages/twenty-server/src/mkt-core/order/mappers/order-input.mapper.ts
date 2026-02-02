import {
  CreateOrderWithItemsInputDto,
  UpdateOrderStatusInputDto,
  RefundOrderInputDto,
} from 'src/mkt-core/order/dto/create-order.input';
import {
  CreateOrderWithItemsInput,
  UpdateOrderStatusInput,
  RefundOrderInput,
} from 'src/mkt-core/order/types';
import { MktSupportedLanguage } from 'src/mkt-core/order/types/mkt-product-proxy.types';
import { ORDER_STATUS, CreateOrderAction } from 'src/mkt-core/order/constants';
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
      currency: dto.currency as PaymentCurrency | undefined,
      note: dto.note,
      requireContract: dto.requireContract,
      externalProducts: dto.externalProducts?.map((p) => ({
        productId: p.productId,
        packageId: p.packageId,
        maxDevices: p.maxDevices,
        splitLicenses: p.splitLicenses,
      })),
      combos: dto.combos?.map((c) => ({
        comboId: c.comboId,
        quantity: c.quantity,
        maxDevices: c.maxDevices,
        splitLicenses: c.splitLicenses,
      })),
      orderLanguage: dto.orderLanguage as MktSupportedLanguage | undefined,
      paymentMethods: dto.paymentMethods?.map((p) => ({
        paymentMethodId: p.paymentMethodId,
        name: p.name,
        duration: p.duration,
        amount: p.amount,
      })),
      // DTO uses CREATE_ORDER_ACTION enum, cast to domain type CreateOrderAction
      action: dto.action as unknown as CreateOrderAction,
      licenseId: dto.licenseId,
      // Trial duration for TRIAL_TO_PAID action (default: 1 day)
      trialDurationDays: dto.trialDurationDays,
      // Draft mode
      isDraft: dto.isDraft ?? false,
      // MKT Server email override
      mktServerEmail: dto.mktServerEmail,
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
      expectedVersion: dto.expectedVersion,
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
      expectedVersion: dto.expectedVersion,
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
      expectedVersion: dto.expectedVersion,
    };
  },
} as const;

/**
 * Type for the OrderInputMapper
 */
export type OrderInputMapperType = typeof OrderInputMapper;
