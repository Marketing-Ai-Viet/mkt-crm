/**
 * Order Block Pre-Query Hooks
 *
 * Blocks auto-generated GraphQL operations on Order module entities.
 * Forces users to use custom resolvers with RBAC protection.
 *
 * Blocked entities:
 * - mktOrder: Use OrderQueryResolver, OrderMutationResolver
 * - mktOrderItem: Use OrderItemMutationResolver
 * - mktOrderHistory: Read-only, block all mutations
 */

import {
  BlockHookConfig,
  createBlockHooks,
  MUTATION_OPERATIONS,
} from 'src/mkt-core/common/hooks';
import { MKT_ORDER_HISTORY_ENTITY_NAME } from 'src/mkt-core/order/objects/mkt-order-history.workspace-entity';
import { MKT_ORDER_ITEM_ENTITY_NAME } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MKT_ORDER_ENTITY_NAME } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

// ============================================================================
// ORDER HOOKS - Block all operations
// ============================================================================

/**
 * Block hook configuration for mktOrder entity
 * Blocks ALL 13 operations - use custom resolvers instead
 */
export const ORDER_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_ORDER_ENTITY_NAME,
  logContext: 'Order:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom Order resolvers instead (getOrders, createOrder, confirmOrder, etc.)',
};

const orderBlockHooks = createBlockHooks(ORDER_BLOCK_CONFIG);

export const ORDER_BLOCK_HOOKS = orderBlockHooks.providers;
export const ORDER_BLOCKED_OPERATIONS = orderBlockHooks.blockedOperations;

// ============================================================================
// ORDER ITEM HOOKS - Block all operations
// ============================================================================

/**
 * Block hook configuration for mktOrderItem entity
 * Blocks ALL 13 operations - use custom resolvers instead
 */
export const ORDER_ITEM_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_ORDER_ITEM_ENTITY_NAME,
  logContext: 'OrderItem:BlockHook',
  blockedMessage:
    'This operation is disabled. Use custom OrderItem resolvers instead (addOrderItem, updateOrderItem, etc.)',
};

const orderItemBlockHooks = createBlockHooks(ORDER_ITEM_BLOCK_CONFIG);

export const ORDER_ITEM_BLOCK_HOOKS = orderItemBlockHooks.providers;
export const ORDER_ITEM_BLOCKED_OPERATIONS =
  orderItemBlockHooks.blockedOperations;

// ============================================================================
// ORDER HISTORY HOOKS - Block only mutations (allow queries)
// ============================================================================

/**
 * Block hook configuration for mktOrderHistory entity
 * Order history is read-only - block only mutations, allow queries
 */
export const ORDER_HISTORY_BLOCK_CONFIG: BlockHookConfig = {
  entityName: MKT_ORDER_HISTORY_ENTITY_NAME,
  logContext: 'OrderHistory:BlockHook',
  blockedMessage:
    'Order history is read-only. History records are created automatically by the system.',
  blockedOperations: MUTATION_OPERATIONS,
};

const orderHistoryBlockHooks = createBlockHooks(ORDER_HISTORY_BLOCK_CONFIG);

export const ORDER_HISTORY_BLOCK_HOOKS = orderHistoryBlockHooks.providers;
export const ORDER_HISTORY_BLOCKED_OPERATIONS =
  orderHistoryBlockHooks.blockedOperations;

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

/**
 * All Order module block hook providers
 * Import this into MktOrderModule
 */
export const ORDER_MODULE_BLOCK_HOOKS = [
  ...ORDER_BLOCK_HOOKS,
  ...ORDER_ITEM_BLOCK_HOOKS,
  ...ORDER_HISTORY_BLOCK_HOOKS,
];
