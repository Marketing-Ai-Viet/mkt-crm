import {
  MKT_ORDER_EVENT_TYPES,
  PAYMENT_HISTORY_TYPE,
} from 'src/mkt-core/common/common.type';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';

// ============================================
// ORDER ITEM SERVICE TYPES
// ============================================

/**
 * Calculated values for order item from variant
 */
export type OrderItemCalculatedValues = {
  name: string;
  snapshotProductName: string;
  mktProductId: string | null;
  unitName: string;
  unitPrice: number;
  quantity: number;
  taxPercentage: number;
  taxAmount: number;
  totalPrice: number;
  totalAmountWithTax: number;
};

/**
 * Validation result for order item operations
 */
export type OrderItemValidationResult = {
  valid: boolean;
  error?: string;
  orderItem?: MktOrderItemWorkspaceEntity;
};

/**
 * Result of order item update operation
 */
export type UpdateOrderItemResult = {
  success: boolean;
  orderItem?: MktOrderItemWorkspaceEntity;
  error?: string;
};

/**
 * Result of bulk order item recalculation
 */
export type BulkRecalculateResult = {
  success: boolean;
  updatedCount: number;
  errors: string[];
};

// ============================================
// ORDER STATUS SERVICE TYPES
// ============================================

/**
 * Result of status transition validation
 */
export type StatusTransitionResult = {
  valid: boolean;
  action: ORDER_ACTION | null;
  newStatus: ORDER_STATUS | null;
  error?: string;
};

/**
 * Input for determining action from status changes
 */
export type StatusInput = {
  status?: ORDER_STATUS | null;
  trialLicense?: boolean | null;
  licenseStatus?: string | null;
  sInvoiceStatus?: string | null;
  accountingConfirmed?: boolean | null;
  metadata?: unknown | null;
};

// ============================================
// ORDER CALCULATION SERVICE TYPES
// ============================================

/**
 * Variant data required for calculation
 */
export type VariantForCalculation = {
  id: string;
  name: string;
  price: number;
};

// ============================================
// ORDER EVENT SERVICE TYPES
// ============================================

/**
 * Order event payload structure
 */
export type OrderEventPayload = {
  eventType: MKT_ORDER_EVENT_TYPES;
  orderId: string;
  workspaceId: string;
  orderData: {
    id: string;
    note?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

/**
 * Payment event payload structure
 */
export type PaymentEventPayload = {
  eventType: PAYMENT_HISTORY_TYPE;
  orderId: string;
  workspaceId: string;
  orderData: {
    id: string;
    note?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

/**
 * Options for emitting order update events
 */
export type OrderUpdateEventOptions = {
  accountingConfirmed?: boolean;
  emitPaymentEvent?: boolean;
  additionalData?: Record<string, unknown>;
};

// ============================================
// ORDER VALIDATION SERVICE TYPES
// ============================================

/**
 * Validation error detail
 */
export type ValidationError = {
  field: string;
  message: string;
  code: string;
};

/**
 * Validation result
 */
export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

// ============================================
// ORDER VALIDATION ERROR CODES
// ============================================

export const ORDER_VALIDATION_ERROR_CODES = {
  CUSTOMER_REQUIRED: 'CUSTOMER_REQUIRED',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  ITEMS_REQUIRED: 'ITEMS_REQUIRED',
  VARIANTS_REQUIRED: 'VARIANTS_REQUIRED',
  VARIANT_NOT_FOUND: 'VARIANT_NOT_FOUND',
  VARIANT_INACTIVE: 'VARIANT_INACTIVE',
  EXTERNAL_PRODUCT_NOT_FOUND: 'EXTERNAL_PRODUCT_NOT_FOUND',
  EXTERNAL_PRODUCT_INACTIVE: 'EXTERNAL_PRODUCT_INACTIVE',
  EXTERNAL_PACKAGE_NOT_FOUND: 'EXTERNAL_PACKAGE_NOT_FOUND',
  EXTERNAL_PACKAGE_INACTIVE: 'EXTERNAL_PACKAGE_INACTIVE',
  EXTERNAL_PACKAGE_MISMATCH: 'EXTERNAL_PACKAGE_MISMATCH',
  PAYMENT_METHOD_REQUIRED: 'PAYMENT_METHOD_REQUIRED',
  PAYMENT_METHOD_NOT_FOUND: 'PAYMENT_METHOD_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  INVALID_ACTION: 'INVALID_ACTION',
  TRIAL_ORDER_REQUIRED: 'TRIAL_ORDER_REQUIRED',
  TRIAL_ORDER_NOT_FOUND: 'TRIAL_ORDER_NOT_FOUND',
} as const;

export type OrderValidationErrorCode =
  (typeof ORDER_VALIDATION_ERROR_CODES)[keyof typeof ORDER_VALIDATION_ERROR_CODES];
