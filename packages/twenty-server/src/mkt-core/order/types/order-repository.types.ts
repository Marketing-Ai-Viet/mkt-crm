import { FindOptionsRelations } from 'typeorm';

import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { ORDER_HISTORY_ACTION } from 'src/mkt-core/order/constants';

// ============================================
// ORDER TYPES (Repository Level)
// ============================================

/**
 * Data type for creating an order (repository level)
 */
export type CreateOrderData = Partial<MktOrderWorkspaceEntity>;

/**
 * Data type for updating an order (repository level)
 */
export type UpdateOrderData = Partial<MktOrderWorkspaceEntity>;

/**
 * Data for updating payment amounts on order
 */
export type UpdatePaymentAmountsData = {
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
};

/**
 * Options for order find operations
 */
export type FindOrderOptions = {
  relations?: FindOptionsRelations<MktOrderWorkspaceEntity>;
};

/**
 * Default relations to load with orders
 */
export const DEFAULT_ORDER_RELATIONS: FindOptionsRelations<MktOrderWorkspaceEntity> =
  {
    orderItems: true,
    mktCustomer: true,
    mktPayments: true,
    mktContract: true,
  };

/**
 * Relations for order detail queries (includes all data for OrderOutput)
 * Used by order query resolvers to populate full OrderOutput DTO
 */
export const ORDER_DETAIL_RELATIONS: FindOptionsRelations<MktOrderWorkspaceEntity> =
  {
    orderItems: true,
    mktCustomer: true,
    mktPayments: {
      mktPaymentMethod: true, // Nested relation for payment method name
    },
    createdBy: true, // Sales staff info
  };

/**
 * Relations for payment summary queries
 */
export const PAYMENT_SUMMARY_RELATIONS: FindOptionsRelations<MktOrderWorkspaceEntity> =
  {
    mktPayments: true,
  };

// ============================================
// ORDER ITEM TYPES (Repository Level)
// ============================================

/**
 * Data type for creating an order item (repository level)
 */
export type CreateOrderItemData = Partial<MktOrderItemWorkspaceEntity>;

/**
 * Data type for updating an order item (repository level)
 */
export type UpdateOrderItemData = Partial<MktOrderItemWorkspaceEntity>;

/**
 * Options for order item find operations
 */
export type FindOrderItemOptions = {
  relations?: FindOptionsRelations<MktOrderItemWorkspaceEntity>;
};

/**
 * Default relations to load with order items
 */
export const DEFAULT_ORDER_ITEM_RELATIONS: FindOptionsRelations<MktOrderItemWorkspaceEntity> =
  {
    mktOrder: true,
  };

export type CreateOrderHistoryData = {
  orderId: string;
  action: ORDER_HISTORY_ACTION;
  name: string;
  note?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
  workspaceMemberId?: string;
};
