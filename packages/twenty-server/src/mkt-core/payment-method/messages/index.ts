import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// LOG CONTEXTS
// ============================================

export const MKT_PAYMENT_METHOD_LOG_CONTEXT = 'MktPaymentMethod';

// ============================================
// PAYMENT METHOD MESSAGES
// ============================================

export const MKT_PAYMENT_METHOD_MESSAGES = createModuleMessages({
  entityName: 'Payment Method',
  entityNamePlural: 'Payment Methods',
  customSuccess: {
    ACTIVATED: 'Payment method activated successfully',
    DEACTIVATED: 'Payment method deactivated successfully',
    POSITION_UPDATED: 'Payment method position updated successfully',
  },
  customError: {
    ALREADY_EXISTS: 'Payment method with this name already exists',
    INVALID_TYPE: 'Invalid payment method type',
    CANNOT_DELETE_IN_USE: 'Cannot delete payment method that is in use',
    NOT_ACTIVE: 'Payment method is not active',
  },
  customOperation: {
    FETCH_ACTIVE: 'Fetch active payment methods',
    FETCH_BY_TYPE: 'Fetch payment methods by type',
    TOGGLE_STATUS: 'Toggle payment method status',
  },
});

// ============================================
// PAYMENT METHOD LOG MESSAGES
// ============================================

export const MKT_PAYMENT_METHOD_LOG_MESSAGES = {
  // Find operations
  FIND_BY_ID_START: (paymentMethodId: string) =>
    `Finding payment method by ID: ${paymentMethodId}`,
  FIND_BY_ID_SUCCESS: (paymentMethodId: string) =>
    `Payment method found: ${paymentMethodId}`,
  FIND_BY_ID_NOT_FOUND: (paymentMethodId: string) =>
    `Payment method not found: ${paymentMethodId}`,
  FIND_BY_NAME_START: (name: string) =>
    `Finding payment method by name: ${name}`,
  FIND_BY_NAME_SUCCESS: (name: string) =>
    `Payment method found by name: ${name}`,
  FIND_BY_NAME_NOT_FOUND: (name: string) =>
    `Payment method not found by name: ${name}`,
  FIND_BY_TYPE_START: (type: string) =>
    `Finding payment methods by type: ${type}`,
  FIND_BY_TYPE_SUCCESS: (type: string, count: number) =>
    `Found ${count} payment methods of type: ${type}`,
  FIND_ACTIVE_START: () => `Finding active payment methods`,
  FIND_ACTIVE_SUCCESS: (count: number) =>
    `Found ${count} active payment methods`,

  // Create operations
  CREATE_START: () => `Creating new payment method`,
  CREATE_SUCCESS: (paymentMethodId: string) =>
    `Payment method created: ${paymentMethodId}`,
  CREATE_FAILED: (error: string) => `Failed to create payment method: ${error}`,

  // Update operations
  UPDATE_START: (paymentMethodId: string) =>
    `Updating payment method: ${paymentMethodId}`,
  UPDATE_SUCCESS: (paymentMethodId: string) =>
    `Payment method updated: ${paymentMethodId}`,
  UPDATE_FAILED: (paymentMethodId: string, error: string) =>
    `Failed to update payment method ${paymentMethodId}: ${error}`,
  STATUS_UPDATE_START: (paymentMethodId: string, isActive: boolean) =>
    `Updating payment method ${paymentMethodId} active status to: ${isActive}`,
  STATUS_UPDATE_SUCCESS: (paymentMethodId: string, isActive: boolean) =>
    `Payment method ${paymentMethodId} active status updated to: ${isActive}`,

  // Delete operations
  DELETE_START: (paymentMethodId: string) =>
    `Deleting payment method: ${paymentMethodId}`,
  DELETE_SUCCESS: (paymentMethodId: string) =>
    `Payment method deleted: ${paymentMethodId}`,
} as const;
