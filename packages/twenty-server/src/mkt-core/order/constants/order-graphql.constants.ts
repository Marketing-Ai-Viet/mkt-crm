/**
 * GraphQL descriptions for Order module resolvers
 */

export const ORDER_GRAPHQL_DESCRIPTIONS = {
  // ==================== MUTATIONS ====================

  // Order mutations
  CREATE_ORDER_WITH_ITEMS:
    'Create a new order with items, licenses, and payment',
  CONFIRM_ORDER:
    'Confirm payment for an order (triggers license creation). Use updateOrderStatus for other status changes.',
  UPDATE_ORDER_STATUS:
    'Update order status (COMPLETE, CANCEL, BLOCK, etc.) with state machine validation',
  REFUND_ORDER: 'Refund an order (full or partial)',

  // Order item mutations
  UPDATE_ORDER_ITEM: 'Update an order item with optimistic locking support',
  RECALCULATE_ORDER_ITEMS: 'Recalculate all order items for an order',

  // ==================== QUERIES ====================

  VALIDATE_ORDER_INPUT: 'Validate order input before creation',
  GET_ORDER_PAYMENT_SUMMARY: 'Get payment summary for an order',
} as const;
