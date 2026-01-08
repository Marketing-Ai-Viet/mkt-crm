/**
 * Cache Tag Builder Utilities
 *
 * Functions to build cache tags for invalidation.
 * Tags enable smart cache invalidation strategies.
 */

import {
  CUSTOMER_CACHE_TAGS,
  DEPARTMENT_CACHE_TAGS,
  INVOICE_CACHE_TAGS,
  LICENSE_CACHE_TAGS,
  ORDER_CACHE_TAGS,
  PAYMENT_CACHE_TAGS,
  PRODUCT_CACHE_TAGS,
  RESELLER_CACHE_TAGS,
} from 'src/mkt-core/infrastructure/redis/constants/cache-tags.constant';

// ============================================
// SINGLE TAG BUILDERS
// ============================================

/**
 * Build tag for specific license
 */
export const buildLicenseTag = (licenseId: string): string =>
  `${LICENSE_CACHE_TAGS.ID_PREFIX}:${licenseId}`;

/**
 * Build tag for user's licenses
 */
export const buildLicenseUserTag = (userId: string): string =>
  `${LICENSE_CACHE_TAGS.USER_PREFIX}:${userId}`;

/**
 * Build tag for product's licenses
 */
export const buildLicenseProductTag = (productId: string): string =>
  `${LICENSE_CACHE_TAGS.PRODUCT_PREFIX}:${productId}`;

/**
 * Build tag for specific order
 */
export const buildOrderTag = (orderId: string): string =>
  `${ORDER_CACHE_TAGS.ID_PREFIX}:${orderId}`;

/**
 * Build tag for customer's orders
 */
export const buildOrderCustomerTag = (customerId: string): string =>
  `${ORDER_CACHE_TAGS.CUSTOMER_PREFIX}:${customerId}`;

/**
 * Build tag for specific invoice
 */
export const buildInvoiceTag = (invoiceId: string): string =>
  `${INVOICE_CACHE_TAGS.ID_PREFIX}:${invoiceId}`;

/**
 * Build tag for order's invoices
 */
export const buildInvoiceOrderTag = (orderId: string): string =>
  `${INVOICE_CACHE_TAGS.ORDER_PREFIX}:${orderId}`;

/**
 * Build tag for specific payment
 */
export const buildPaymentTag = (paymentId: string): string =>
  `${PAYMENT_CACHE_TAGS.ID_PREFIX}:${paymentId}`;

/**
 * Build tag for order's payments
 */
export const buildPaymentOrderTag = (orderId: string): string =>
  `${PAYMENT_CACHE_TAGS.ORDER_PREFIX}:${orderId}`;

/**
 * Build tag for specific customer
 */
export const buildCustomerTag = (customerId: string): string =>
  `${CUSTOMER_CACHE_TAGS.ID_PREFIX}:${customerId}`;

/**
 * Build tag for specific product
 */
export const buildProductTag = (productId: string): string =>
  `${PRODUCT_CACHE_TAGS.ID_PREFIX}:${productId}`;

/**
 * Build tag for specific department
 */
export const buildDepartmentTag = (departmentId: string): string =>
  `${DEPARTMENT_CACHE_TAGS.ID_PREFIX}:${departmentId}`;

/**
 * Build tag for specific reseller
 */
export const buildResellerTag = (resellerId: string): string =>
  `${RESELLER_CACHE_TAGS.ID_PREFIX}:${resellerId}`;

// ============================================
// COMPOSITE TAG BUILDERS
// ============================================

/**
 * License status type
 */
export type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'TRIAL';

/**
 * Build all tags for a license
 *
 * @example
 * buildLicenseCacheTags('lic-123', 'user-456', 'prod-789', 'ACTIVE')
 * // Returns: ['license', 'license:id:lic-123', 'license:user:user-456', 'license:product:prod-789', 'license:active']
 */
export const buildLicenseCacheTags = (
  licenseId: string,
  userId: string,
  productId: string,
  status: LicenseStatus,
): string[] => {
  const statusTagMap: Record<LicenseStatus, string> = {
    ACTIVE: LICENSE_CACHE_TAGS.ACTIVE,
    EXPIRED: LICENSE_CACHE_TAGS.EXPIRED,
    TRIAL: LICENSE_CACHE_TAGS.TRIAL,
  };

  return [
    LICENSE_CACHE_TAGS.ALL,
    buildLicenseTag(licenseId),
    buildLicenseUserTag(userId),
    buildLicenseProductTag(productId),
    statusTagMap[status],
  ];
};

/**
 * Order status type
 */
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED';

/**
 * Build all tags for an order
 *
 * @example
 * buildOrderCacheTags('ord-123', 'cust-456', 'PENDING')
 * // Returns: ['order', 'order:id:ord-123', 'order:customer:cust-456', 'order:pending']
 */
export const buildOrderCacheTags = (
  orderId: string,
  customerId: string,
  status: OrderStatus,
): string[] => {
  const statusTagMap: Record<OrderStatus, string> = {
    PENDING: ORDER_CACHE_TAGS.PENDING,
    CONFIRMED: ORDER_CACHE_TAGS.CONFIRMED,
    COMPLETED: ORDER_CACHE_TAGS.COMPLETED,
  };

  return [
    ORDER_CACHE_TAGS.ALL,
    buildOrderTag(orderId),
    buildOrderCustomerTag(customerId),
    statusTagMap[status],
  ];
};

/**
 * Build all tags for a product
 *
 * @example
 * buildProductCacheTags('prod-123', true)
 * // Returns: ['product', 'product:id:prod-123', 'product:active']
 */
export const buildProductCacheTags = (
  productId: string,
  isActive: boolean,
): string[] => [
  PRODUCT_CACHE_TAGS.ALL,
  buildProductTag(productId),
  isActive ? PRODUCT_CACHE_TAGS.ACTIVE : PRODUCT_CACHE_TAGS.INACTIVE,
];
