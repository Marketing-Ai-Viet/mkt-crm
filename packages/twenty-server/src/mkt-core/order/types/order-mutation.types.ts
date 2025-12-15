import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktSupportedLanguage } from 'src/mkt-core/order/types/mkt-product-proxy.types';

// ============================================
// INPUT TYPES
// ============================================

/**
 * Variant item trong order (internal CRM product)
 */
export type OrderVariantInput = {
  variantId: string;
  quantity?: number;
};

/**
 * External MKT product trong order (từ MKT Server)
 */
export type ExternalMktProductInput = {
  /** ID của product từ MKT Server (UUIDv7) */
  productId: string;
  /** ID của package từ MKT Server */
  packageId?: string;
  /** Số lượng */
  quantity?: number;
};

/**
 * Payment method trong order
 */
export type OrderPaymentMethodInput = {
  paymentMethodId: string;
  name?: string;
  duration?: number;
  amount?: number;
};

/**
 * Customer info trong order
 */
export type OrderCustomerInput = {
  customerId: string;
  name?: string;
};

/**
 * Input để tạo Order với đầy đủ items, licenses, payment
 * Thay thế việc sử dụng createMktOrder + post-hook
 *
 * Supports 2 types of products:
 * - Internal variants: CRM products từ mktVariant table
 * - External products: Products từ MKT Server via OAuth2 API
 */
export type CreateOrderWithItemsInput = {
  // Customer
  customerId: string;

  // Order metadata
  name?: string;
  currency?: string;
  note?: string;
  requireContract?: boolean;
  discountPercent?: number;

  // Items - Internal CRM products (optional if using externalProducts)
  variants?: OrderVariantInput[];

  // Items - External MKT Server products (optional if using variants)
  externalProducts?: ExternalMktProductInput[];

  // Order language for display names from MKT Server (default: 'vi')
  orderLanguage?: MktSupportedLanguage;

  // Payment
  paymentMethods?: OrderPaymentMethodInput[];

  // Action
  action: ORDER_ACTION;

  // For license renewal
  licenseId?: string;

  // For trial to paid conversion
  trialOrderId?: string;
};

/**
 * Input để confirm order
 */
export type ConfirmOrderInput = {
  orderId: string;
  action: ORDER_ACTION;
  accountingConfirmed?: boolean;
  note?: string;
};

/**
 * Input để refund order
 */
export type RefundOrderInput = {
  orderId: string;
  licenseIds?: string[];
  refundAmount?: number;
  reason?: string;
  isPartial?: boolean;
};

/**
 * Input để update order status
 */
export type UpdateOrderStatusInput = {
  orderId: string;
  status: ORDER_STATUS;
  note?: string;
};

// ============================================
// OUTPUT TYPES
// ============================================

/**
 * Response khi tạo order
 */
export type CreateOrderResponse = {
  success: boolean;
  orderId?: string;
  orderCode?: string;
  paymentQrCode?: string;
  error?: string;
};

/**
 * Response khi confirm order
 */
export type ConfirmOrderResponse = {
  success: boolean;
  orderId?: string;
  newStatus?: ORDER_STATUS;
  error?: string;
};

/**
 * Response khi refund order
 */
export type RefundOrderResponse = {
  success: boolean;
  orderId?: string;
  refundedAmount?: number;
  newStatus?: ORDER_STATUS;
  error?: string;
};

/**
 * Response khi update order status
 */
export type UpdateOrderStatusResponse = {
  success: boolean;
  orderId?: string;
  previousStatus?: ORDER_STATUS;
  newStatus?: ORDER_STATUS;
  error?: string;
};

// ============================================
// INTERNAL TYPES
// ============================================

/**
 * Calculated order values
 */
export type OrderCalculatedValues = {
  subtotal: number;
  tax: number;
  taxPercentage: number;
  discount: number;
  totalAmount: number;
};

/**
 * Order item với calculated values
 */
export type OrderItemWithCalculation = {
  variantId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmountWithTax: number;
};

/**
 * Input để update order item
 */
export type UpdateOrderItemInput = {
  orderItemId: string;
  variantId?: string;
  quantity?: number;
  unitPrice?: number;
  note?: string;
  updatedAt?: string; // For optimistic locking
};

/**
 * Response khi update order item
 */
export type UpdateOrderItemResponse = {
  success: boolean;
  orderItemId?: string;
  orderId?: string;
  error?: string;
};
