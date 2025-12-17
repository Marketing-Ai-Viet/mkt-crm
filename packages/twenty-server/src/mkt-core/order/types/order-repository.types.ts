import { FindOptionsRelations, QueryRunner } from 'typeorm';

import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

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
 * Options for order find operations
 */
export type FindOrderOptions = {
  relations?: FindOptionsRelations<MktOrderWorkspaceEntity>;
  queryRunner?: QueryRunner;
};

/**
 * Default relations to load with orders
 */
export const DEFAULT_ORDER_RELATIONS: FindOptionsRelations<MktOrderWorkspaceEntity> =
  {
    orderItems: true,
    mktCustomer: true,
    mktPayments: true,
    mktLicense: true,
    mktContract: true,
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
  queryRunner?: QueryRunner;
};

/**
 * Default relations to load with order items
 */
export const DEFAULT_ORDER_ITEM_RELATIONS: FindOptionsRelations<MktOrderItemWorkspaceEntity> =
  {
    mktOrder: true,
    mktVariant: true,
    mktProduct: true,
  };
