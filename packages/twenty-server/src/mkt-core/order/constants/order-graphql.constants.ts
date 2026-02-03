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

  // New Payment Flow mutations
  CONFIRM_ORDER_WITH_LICENSE:
    'Confirm order and create licenses immediately (new flow: DRAFT → PROCESSING). Licenses are created with PENDING_PAYMENT status.',
  CONFIRM_PAYMENT:
    'Confirm payment for an order (SEPAY webhook, bank transfer, cash). Updates order status to COMPLETED and activates licenses.',
  UNLOCK_ORDER:
    'Unlock order after late payment. Restores LOCKED licenses to ACTIVE status.',

  // ==================== QUERIES ====================

  VALIDATE_ORDER_INPUT: 'Validate order input before creation',
  GET_ORDERS:
    'Get paginated list of orders with sorting and search (supports orderCode, customer name/email/phone)',
  GET_ORDER_BY_ID: 'Get order by ID with full details',
  GET_ORDER_BY_CODE: 'Get order by order code',
  GET_ORDERS_BY_CUSTOMER: 'Get all orders for a specific customer',
  GET_ORDERS_BY_STATUS: 'Get all orders with a specific status',
  GET_ORDER_PAYMENT_SUMMARY: 'Get payment summary for an order',
  GET_CUSTOMER_ORDER_STATS:
    'Get order statistics for a customer (count, total value, dates)',
} as const;
