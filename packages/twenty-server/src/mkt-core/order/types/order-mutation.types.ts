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
 * Combo input trong order
 */
export type ComboOrderInputType = {
  /** ID của combo */
  comboId: string;
  /** Số lượng combo */
  quantity: number;
  /** Override maxDevices cho tất cả digital items trong combo */
  maxDevices?: number;
  /** Tách thành nhiều license cho digital items trong combo */
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
 * Hoặc combos từ mkt-combo module
 */
export type CreateOrderWithItemsInput = {
  // Customer
  customerId: string;

  // Order metadata (name is auto-generated)
  currency?: PaymentCurrency;
  note?: string;
  requireContract?: boolean;

  // Items - External MKT Server products (optional if combos provided)
  externalProducts?: ExternalMktProductInput[];

  // Combos - Combo items (optional if externalProducts provided)
  combos?: ComboOrderInputType[];

  // Order language for display names from MKT Server (default: 'vi')
  orderLanguage?: MktSupportedLanguage;

  // Payment
  paymentMethods?: OrderPaymentMethodInput[];

  // Action - chỉ cho phép các actions tạo đơn hàng
  action: CreateOrderAction;

  // For license renewal
  licenseId?: string;

  /**
   * Thời hạn trial license (ngày).
   *
   * - Với TRIAL_TO_PAID: Mặc định 1 ngày (ORDER_TRIAL_CONFIG.TRIAL_TO_PAID_DEFAULT_DAYS)
   * - Với các action khác: Mặc định 30 ngày (ORDER_TRIAL_CONFIG.DEFAULT_TRIAL_DURATION_DAYS)
   */
  trialDurationDays?: number;

  // Discount fields
  /** Discount percentage to apply (0-100). Direct discount without promotion system. */
  discountPercent?: number;

  // Draft mode
  /**
   * Create as draft order.
   * Draft orders only calculate totals without creating QR code or licenses.
   * Use publishDraftOrder mutation to convert to real order.
   * Default: false
   */
  isDraft?: boolean;

  // MKT Server email override
  /**
   * Email for MKT Server license registration.
   * If not specified, auto-fetches from customer linkedAccounts
   * (isPrimary=true, status=ACTIVE, provider=MKT_SERVER)
   */
  mktServerEmail?: string;
};

// Note: Trial license creation moved to MktLicenseResolver.mktCreateTrialLicense

/**
 * Input để confirm order
 *
 * Actions supported:
 * - ACCOUNTING_CONFIRMED: Legacy flow (create license after payment)
 * - CONFIRM_ORDER: New payment flow (create license immediately with PENDING_PAYMENT)
 */
export type ConfirmOrderInput = {
  orderId: string;
  action: ConfirmOrderAction;
  accountingConfirmed?: boolean;
  note?: string;
  /** Manual override for payment deadline (hours) - new payment flow */
  manualDeadlineHours?: number;
  /** Expected version for optimistic locking. If provided, update will fail if version mismatch. */
  expectedVersion?: number;
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
  /** Expected version for optimistic locking. If provided, update will fail if version mismatch. */
  expectedVersion?: number;
};

/**
 * Input để update order status
 */
export type UpdateOrderStatusInput = {
  orderId: string;
  status: ORDER_STATUS;
  note?: string;
  /** Expected version for optimistic locking. If provided, update will fail if version mismatch. */
  expectedVersion?: number;
};

/**
 * Input để publish draft order
 *
 * Converts a DRAFT order to PENDING_PAYMENT:
 * - Creates payment/QR code
 * - Updates order status
 * - Schedules overdue check
 */
export type PublishDraftOrderInput = {
  orderId: string;
  paymentMethods?: OrderPaymentMethodInput[];
  note?: string;
  /** Expected version for optimistic locking. If provided, update will fail if version mismatch. */
  expectedVersion?: number;
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
  orderCode?: string;
  newStatus?: ORDER_STATUS;
  error?: string;
  // New payment flow fields
  paymentDeadline?: Date;
  paymentDeadlineSource?: string;
  paymentDeadlineHours?: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
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

/**
 * Response khi publish draft order
 */
export type PublishDraftOrderResponse = {
  success: boolean;
  orderId?: string;
  orderCode?: string;
  paymentQrCode?: string;
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
