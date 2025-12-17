import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// LOG CONTEXT
// ============================================

export const MKT_ORDER_LOG_CONTEXT = 'MktOrder';
export const MKT_ORDER_ITEM_LOG_CONTEXT = 'MktOrderItem';

// ============================================
// ORDER MESSAGES
// ============================================

export const MKT_ORDER_MESSAGES = createModuleMessages({
  entityName: 'Order',
  entityNamePlural: 'Orders',
  customSuccess: {
    CONFIRMED: 'Order confirmed successfully',
    COMPLETED: 'Order completed successfully',
    CANCELLED: 'Order cancelled successfully',
    REFUNDED: 'Order refunded successfully',
    PARTIAL_REFUNDED: 'Order partially refunded successfully',
    STATUS_UPDATED: 'Order status updated successfully',
    ITEMS_ADDED: 'Order items added successfully',
    ITEMS_REMOVED: 'Order items removed successfully',
    PAYMENT_RECEIVED: 'Payment received for order',
    LICENSE_CREATED: 'License created from order',
  },
  customError: {
    CONFIRM_FAILED: 'Failed to confirm order',
    CANCEL_FAILED: 'Failed to cancel order',
    REFUND_FAILED: 'Failed to refund order',
    STATUS_UPDATE_FAILED: 'Failed to update order status',
    INVALID_STATUS_TRANSITION: 'Invalid order status transition',
    ORDER_LOCKED: 'Order is locked and cannot be modified',
    CUSTOMER_REQUIRED: 'Customer is required for order',
    ITEMS_REQUIRED: 'At least one item is required for order',
    INVALID_QUANTITY: 'Invalid quantity for order item',
    PRODUCT_NOT_FOUND: 'Product not found for order item',
    VARIANT_NOT_FOUND: 'Variant not found for order item',
    PACKAGE_NOT_FOUND: 'Package not found for order item',
    OPTIMISTIC_LOCK_FAILED:
      'Order has been modified. Please refresh and try again',
  },
  customOperation: {
    FETCH_ALL: 'Fetch all orders',
    FETCH_BY_ID: 'Fetch order by ID',
    FETCH_BY_CODE: 'Fetch order by code',
    FETCH_BY_CUSTOMER: 'Fetch orders by customer',
    FETCH_BY_STATUS: 'Fetch orders by status',
    CONFIRM: 'Confirm order',
    COMPLETE: 'Complete order',
    CANCEL: 'Cancel order',
    REFUND: 'Refund order',
    ADD_ITEMS: 'Add items to order',
    REMOVE_ITEMS: 'Remove items from order',
    CALCULATE_TOTALS: 'Calculate order totals',
  },
});

// ============================================
// ORDER ITEM MESSAGES
// ============================================

export const MKT_ORDER_ITEM_MESSAGES = createModuleMessages({
  entityName: 'Order Item',
  entityNamePlural: 'Order Items',
  customSuccess: {
    RECALCULATED: 'Order item recalculated successfully',
    BULK_RECALCULATED: 'Order items recalculated successfully',
    QUANTITY_UPDATED: 'Order item quantity updated successfully',
  },
  customError: {
    ORDER_NOT_FOUND: 'Order not found for order item',
    RECALCULATE_FAILED: 'Failed to recalculate order item',
    VARIANT_REQUIRED: 'Variant is required for recalculation',
    EXTERNAL_PRODUCT_REQUIRED: 'External product is required',
  },
  customOperation: {
    FETCH_BY_ORDER: 'Fetch order items by order',
    FETCH_BY_PRODUCT: 'Fetch order items by product',
    FETCH_BY_VARIANT: 'Fetch order items by variant',
    RECALCULATE: 'Recalculate order item',
    BULK_RECALCULATE: 'Bulk recalculate order items',
  },
});

// ============================================
// ORDER LOG MESSAGES
// ============================================

export const MKT_ORDER_LOG_MESSAGES = {
  // Find operations
  FIND_BY_ID_START: (orderId: string) => `Finding order by ID: ${orderId}`,
  FIND_BY_ID_SUCCESS: (orderId: string) => `Order found: ${orderId}`,
  FIND_BY_ID_NOT_FOUND: (orderId: string) => `Order not found: ${orderId}`,
  FIND_BY_CODE_START: (code: string) => `Finding order by code: ${code}`,
  FIND_BY_CODE_SUCCESS: (code: string) => `Order found by code: ${code}`,
  FIND_BY_CODE_NOT_FOUND: (code: string) => `Order not found by code: ${code}`,
  FIND_BY_CUSTOMER_START: (customerId: string) =>
    `Finding orders for customer: ${customerId}`,
  FIND_BY_CUSTOMER_SUCCESS: (customerId: string, count: number) =>
    `Found ${count} orders for customer: ${customerId}`,
  FIND_BY_STATUS_START: (status: string) =>
    `Finding orders with status: ${status}`,
  FIND_BY_STATUS_SUCCESS: (status: string, count: number) =>
    `Found ${count} orders with status: ${status}`,

  // Create operations
  CREATE_START: () => `Creating new order`,
  CREATE_SUCCESS: (orderId: string) => `Order created: ${orderId}`,
  CREATE_FAILED: (error: string) => `Failed to create order: ${error}`,

  // Update operations
  UPDATE_START: (orderId: string) => `Updating order: ${orderId}`,
  UPDATE_SUCCESS: (orderId: string) => `Order updated: ${orderId}`,
  UPDATE_FAILED: (orderId: string, error: string) =>
    `Failed to update order ${orderId}: ${error}`,
  STATUS_UPDATE_START: (orderId: string, status: string) =>
    `Updating order ${orderId} status to: ${status}`,
  STATUS_UPDATE_SUCCESS: (orderId: string, status: string) =>
    `Order ${orderId} status updated to: ${status}`,

  // Delete operations
  DELETE_START: (orderId: string) => `Deleting order: ${orderId}`,
  DELETE_SUCCESS: (orderId: string) => `Order deleted: ${orderId}`,
  DELETE_FAILED: (orderId: string, error: string) =>
    `Failed to delete order ${orderId}: ${error}`,
} as const;

// ============================================
// ORDER ITEM LOG MESSAGES
// ============================================

export const MKT_ORDER_ITEM_LOG_MESSAGES = {
  // Find operations
  FIND_BY_ID_START: (itemId: string) => `Finding order item by ID: ${itemId}`,
  FIND_BY_ID_SUCCESS: (itemId: string) => `Order item found: ${itemId}`,
  FIND_BY_ID_NOT_FOUND: (itemId: string) => `Order item not found: ${itemId}`,
  FIND_BY_ORDER_START: (orderId: string) =>
    `Finding order items for order: ${orderId}`,
  FIND_BY_ORDER_SUCCESS: (orderId: string, count: number) =>
    `Found ${count} order items for order: ${orderId}`,
  FIND_BY_PRODUCT_START: (productId: string) =>
    `Finding order items for product: ${productId}`,
  FIND_BY_VARIANT_START: (variantId: string) =>
    `Finding order items for variant: ${variantId}`,

  // Create operations
  CREATE_START: () => `Creating new order item`,
  CREATE_SUCCESS: (itemId: string) => `Order item created: ${itemId}`,
  CREATE_FAILED: (error: string) => `Failed to create order item: ${error}`,
  CREATE_BULK_START: (count: number) => `Creating ${count} order items`,
  CREATE_BULK_SUCCESS: (count: number) => `Created ${count} order items`,
  CREATE_BULK_FAILED: (error: string) =>
    `Failed to create order items: ${error}`,

  // Update operations
  UPDATE_START: (itemId: string) => `Updating order item: ${itemId}`,
  UPDATE_SUCCESS: (itemId: string) => `Order item updated: ${itemId}`,
  UPDATE_FAILED: (itemId: string, error: string) =>
    `Failed to update order item ${itemId}: ${error}`,
  RECALCULATE_START: (itemId: string) => `Recalculating order item: ${itemId}`,
  RECALCULATE_SUCCESS: (itemId: string) => `Order item recalculated: ${itemId}`,
  RECALCULATE_FAILED: (itemId: string, error: string) =>
    `Failed to recalculate order item ${itemId}: ${error}`,

  // Delete operations
  DELETE_START: (itemId: string) => `Deleting order item: ${itemId}`,
  DELETE_SUCCESS: (itemId: string) => `Order item deleted: ${itemId}`,
  DELETE_FAILED: (itemId: string, error: string) =>
    `Failed to delete order item ${itemId}: ${error}`,
  DELETE_BY_ORDER_START: (orderId: string) =>
    `Deleting order items for order: ${orderId}`,
  DELETE_BY_ORDER_SUCCESS: (orderId: string) =>
    `Order items deleted for order: ${orderId}`,
  DELETE_BULK_START: (count: number) => `Deleting ${count} order items`,
  DELETE_BULK_SUCCESS: (count: number) => `Deleted ${count} order items`,
} as const;

// ============================================
// BULK SUCCESS MESSAGE BUILDER
// ============================================

export const MKT_ORDER_BULK_MESSAGE_BUILDER = {
  itemsCreated: (count: number) => `${count} order items created successfully`,
  itemsUpdated: (count: number) => `${count} order items updated successfully`,
  itemsDeleted: (count: number) => `${count} order items deleted successfully`,
  itemsRecalculated: (count: number) =>
    `${count} order items recalculated successfully`,
} as const;

// ============================================
// SERVICE LOG CONTEXTS
// ============================================

export const MKT_ORDER_STATUS_LOG_CONTEXT = 'MktOrderStatus';
export const MKT_ORDER_CALCULATION_LOG_CONTEXT = 'MktOrderCalculation';
export const MKT_ORDER_EVENT_LOG_CONTEXT = 'MktOrderEvent';
export const MKT_ORDER_VALIDATION_LOG_CONTEXT = 'MktOrderValidation';

// ============================================
// ORDER STATUS SERVICE LOG MESSAGES
// ============================================

export const MKT_ORDER_STATUS_LOG_MESSAGES = {
  // Action determination
  DETERMINE_ACTION_START: (
    currentStatus: string | null,
    targetStatus: string,
  ) => `Determining action: ${currentStatus ?? 'null'} -> ${targetStatus}`,
  DETERMINE_ACTION_SUCCESS: (action: string, newStatus: string) =>
    `Determined action: ${action}, new status: ${newStatus}`,
  DETERMINE_ACTION_FAILED: (error: string) =>
    `Failed to determine action: ${error}`,

  // Transition validation
  TRANSITION_VALID: (from: string | null, to: string) =>
    `Valid transition: ${from ?? 'null'} -> ${to}`,
  TRANSITION_INVALID: (from: string | null, to: string) =>
    `Invalid transition: ${from ?? 'null'} -> ${to}`,
  NO_TRANSITION_RULES: (status: string) =>
    `No transition rules defined for status: ${status}`,

  // Status mapping
  STATUS_FROM_ACTION: (action: string, status: string) =>
    `Mapped action ${action} to status ${status}`,
  UNKNOWN_ACTION: (action: string) =>
    `Unknown action: ${action}, defaulting to current status`,
} as const;

// ============================================
// ORDER CALCULATION SERVICE LOG MESSAGES
// ============================================

export const MKT_ORDER_CALCULATION_LOG_MESSAGES = {
  // Item calculations
  CALCULATE_ITEM_START: (variantId: string) =>
    `Calculating order item for variant: ${variantId}`,
  CALCULATE_ITEM_SUCCESS: (variantId: string, total: number) =>
    `Calculated order item: variant=${variantId}, total=${total}`,
  CALCULATE_ITEMS_START: (count: number) => `Calculating ${count} order items`,
  CALCULATE_ITEMS_SUCCESS: (count: number) => `Calculated ${count} order items`,

  // Order totals
  CALCULATE_TOTALS_START: (itemCount: number) =>
    `Calculating order totals for ${itemCount} items`,
  CALCULATE_TOTALS_SUCCESS: (total: number) =>
    `Calculated order total: ${total}`,

  // Refund calculations
  CALCULATE_REFUND_START: (originalAmount: number, usedDays: number) =>
    `Calculating refund: original=${originalAmount}, usedDays=${usedDays}`,
  CALCULATE_REFUND_SUCCESS: (refundAmount: number) =>
    `Calculated refund amount: ${refundAmount}`,
} as const;

// ============================================
// ORDER EVENT SERVICE LOG MESSAGES
// ============================================

export const MKT_ORDER_EVENT_LOG_MESSAGES = {
  // Order events
  EMIT_ORDER_EVENT_START: (orderId: string, eventType: string) =>
    `Emitting ${eventType} event for order: ${orderId}`,
  EMIT_ORDER_EVENT_SUCCESS: (orderId: string, eventType: string) =>
    `Emitted ${eventType} event for order: ${orderId}`,
  EMIT_ORDER_EVENT_FAILED: (
    orderId: string,
    eventType: string,
    error: string,
  ) => `Failed to emit ${eventType} event for order ${orderId}: ${error}`,
  EMIT_ORDER_EVENT_SKIPPED: (reason: string) =>
    `Skipped emitting order event: ${reason}`,

  // Payment events
  EMIT_PAYMENT_EVENT_START: (orderId: string, paymentType: string) =>
    `Emitting ${paymentType} payment event for order: ${orderId}`,
  EMIT_PAYMENT_EVENT_SUCCESS: (orderId: string, paymentType: string) =>
    `Emitted ${paymentType} payment event for order: ${orderId}`,
  EMIT_PAYMENT_EVENT_FAILED: (
    orderId: string,
    paymentType: string,
    error: string,
  ) =>
    `Failed to emit ${paymentType} payment event for order ${orderId}: ${error}`,

  // Batch events
  EMIT_BATCH_EVENTS_START: (orderId: string, action: string) =>
    `Emitting batch events for order ${orderId}, action: ${action}`,
  EMIT_BATCH_EVENTS_SUCCESS: (orderId: string) =>
    `Batch events emitted for order: ${orderId}`,
} as const;

// ============================================
// ORDER VALIDATION SERVICE LOG MESSAGES
// ============================================

export const MKT_ORDER_VALIDATION_LOG_MESSAGES = {
  // Create validation
  VALIDATE_CREATE_START: (customerId: string) =>
    `Validating create order input for customer: ${customerId}`,
  VALIDATE_CREATE_SUCCESS: () => `Create order input validation passed`,
  VALIDATE_CREATE_FAILED: (errorCount: number) =>
    `Create order input validation failed with ${errorCount} errors`,

  // Confirm validation
  VALIDATE_CONFIRM_START: (orderId: string) =>
    `Validating confirm order input for order: ${orderId}`,
  VALIDATE_CONFIRM_SUCCESS: () => `Confirm order input validation passed`,
  VALIDATE_CONFIRM_FAILED: (errorCount: number) =>
    `Confirm order input validation failed with ${errorCount} errors`,

  // Trial to paid validation
  VALIDATE_TRIAL_TO_PAID_START: (trialOrderId: string) =>
    `Validating trial to paid conversion for order: ${trialOrderId}`,
  VALIDATE_TRIAL_TO_PAID_SUCCESS: () => `Trial to paid validation passed`,
  VALIDATE_TRIAL_TO_PAID_FAILED: (errorCount: number) =>
    `Trial to paid validation failed with ${errorCount} errors`,

  // Entity validation
  CUSTOMER_EXISTS: (customerId: string) => `Customer exists: ${customerId}`,
  CUSTOMER_NOT_EXISTS: (customerId: string) =>
    `Customer not found: ${customerId}`,
  VARIANT_EXISTS: (variantId: string) => `Variant exists: ${variantId}`,
  VARIANT_NOT_EXISTS: (variantId: string) => `Variant not found: ${variantId}`,
  PAYMENT_METHOD_EXISTS: (methodId: string) =>
    `Payment method exists: ${methodId}`,
  PAYMENT_METHOD_NOT_EXISTS: (methodId: string) =>
    `Payment method not found: ${methodId}`,

  // External product validation
  VALIDATE_EXTERNAL_PRODUCTS_START: (count: number) =>
    `Validating ${count} external products`,
  VALIDATE_EXTERNAL_PRODUCTS_SUCCESS: () =>
    `External products validation passed`,
  VALIDATE_EXTERNAL_PRODUCTS_FAILED: (errorCount: number) =>
    `External products validation failed with ${errorCount} errors`,
} as const;

// ============================================
// ORDER ITEM SERVICE LOG MESSAGES
// ============================================

export const MKT_ORDER_ITEM_SERVICE_LOG_MESSAGES = {
  // Validation
  VALIDATE_FOR_UPDATE_START: (itemId: string) =>
    `Validating order item for update: ${itemId}`,
  VALIDATE_FOR_UPDATE_SUCCESS: (itemId: string) =>
    `Order item validation passed: ${itemId}`,
  VALIDATE_FOR_UPDATE_FAILED: (itemId: string, error: string) =>
    `Order item validation failed for ${itemId}: ${error}`,

  // Calculation
  CALCULATE_VALUES_START: (variantId: string) =>
    `Calculating values from variant: ${variantId}`,
  CALCULATE_VALUES_SUCCESS: (variantId: string) =>
    `Values calculated from variant: ${variantId}`,

  // Update
  UPDATE_ORDER_ITEM_START: (itemId: string) => `Updating order item: ${itemId}`,
  UPDATE_ORDER_ITEM_SUCCESS: (itemId: string) =>
    `Order item updated successfully: ${itemId}`,
  UPDATE_ORDER_ITEM_FAILED: (itemId: string, error: string) =>
    `Failed to update order item ${itemId}: ${error}`,

  // Recalculate
  RECALCULATE_ORDER_ITEM_START: (itemId: string) =>
    `Recalculating order item: ${itemId}`,
  RECALCULATE_ORDER_ITEM_SUCCESS: (itemId: string) =>
    `Order item recalculated: ${itemId}`,
  RECALCULATE_ORDER_ITEM_FAILED: (itemId: string, error: string) =>
    `Failed to recalculate order item ${itemId}: ${error}`,

  // Bulk recalculate
  RECALCULATE_ALL_START: (orderId: string) =>
    `Recalculating all order items for order: ${orderId}`,
  RECALCULATE_ALL_SUCCESS: (orderId: string, count: number) =>
    `Recalculated ${count} order items for order: ${orderId}`,
  RECALCULATE_ALL_PARTIAL: (orderId: string, success: number, failed: number) =>
    `Recalculated ${success} items, ${failed} failed for order: ${orderId}`,
} as const;
