import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/order/types/order-event.types';
import { PAYMENT_HISTORY_TYPE } from 'src/mkt-core/payment/types/payment.type';
import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants';

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

export type OrderCalculationResult = {
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
};

/**
 * Payment summary calculated from confirmed payments
 */
export type PaymentSummary = {
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PAYMENT_STATUS;
  paidPercent: number;
};

/**
 * Payment data for calculation (only confirmed payments)
 */
export type ConfirmedPaymentData = {
  amount: number;
  refundedAmount?: number;
};

/**
 * Partial payment policy options
 */
export type PartialPaymentPolicy = 'NONE' | 'THRESHOLD' | 'PRO_RATA';
