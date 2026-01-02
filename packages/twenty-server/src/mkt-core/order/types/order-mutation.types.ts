import {
  ORDER_STATUS,
  CreateOrderAction,
  ConfirmOrderAction,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MktSupportedLanguage } from 'src/mkt-core/order/types/mkt-product-proxy.types';
import { PaymentCurrency } from 'src/mkt-core/payment/types';

// ============================================
// INPUT TYPES
// ============================================

/**
 * External MKT product trong order (từ MKT Server)
 */
export type ExternalMktProductInput = {
  /** ID của product từ MKT Server (UUIDv7) */
  productId: string;
  /** ID của package từ MKT Server */
  packageId?: string;
  /** Số thiết bị tối đa cho license (default: 1) */
  maxDevices?: number;
  /** Tách thành nhiều license (vd: maxDevices=3 với splitLicenses=true sẽ tạo 3 license với 1 device mỗi cái) */
  splitLicenses?: boolean;
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
 * Sử dụng external products từ MKT Server via OAuth2 API
 */
export type CreateOrderWithItemsInput = {
  // Customer
  customerId: string;

  // Order metadata (name is auto-generated)
  currency?: PaymentCurrency;
  note?: string;
  requireContract?: boolean;

  // Items - External MKT Server products (required)
  externalProducts: ExternalMktProductInput[];

  // Order language for display names from MKT Server (default: 'vi')
  orderLanguage?: MktSupportedLanguage;

  // Payment
  paymentMethods?: OrderPaymentMethodInput[];

  // Action - chỉ cho phép các actions tạo đơn hàng
  action: CreateOrderAction;

  // For license renewal
  licenseId?: string;

  // For trial to paid conversion
  trialOrderId?: string;

  // Promotion fields
  /** Coupon code to apply for discount */
  couponCode?: string;
  /** Whether to automatically apply eligible promotions (default: true) */
  applyAutoPromotions?: boolean;

  // MKT Server email override
  /**
   * Email for MKT Server license registration.
   * If not specified, auto-fetches from customer linkedAccounts
   * (isPrimary=true, status=ACTIVE, provider=MKT_SERVER)
   */
  mktServerEmail?: string;
};

/**
 * Input để confirm order
 */
export type ConfirmOrderInput = {
  orderId: string;
  action: ConfirmOrderAction;
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
  /** User-friendly message for the client */
  message?: string;
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
