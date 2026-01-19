/**
 * Order Configuration Types
 *
 * Type definitions for order module configuration
 */

/**
 * Order code configuration
 */
export type OrderCodeConfig = {
  /** Prefix for order codes (e.g., 'MKT', 'DEV') */
  prefix: string;
};

/**
 * Order feature flags configuration
 */
export type OrderFeatureConfig = {
  /** Whether optimistic locking is enabled for order items */
  optimisticLockingEnabled: boolean;
};

/**
 * Order URL configuration
 */
export type OrderUrlConfig = {
  /** Server base URL */
  serverUrl: string;
  /** Payment page path template */
  paymentPagePath: string;
};

/**
 * SEPay QR code configuration for orders
 */
export type OrderSepayConfig = {
  /** SEPay account number */
  account: string;
  /** SEPay bank code */
  bank: string;
  /** SEPay virtual account prefix */
  virtualAccount: string;
};

/**
 * BIDV SEPay Business configuration for orders
 */
export type OrderBidvConfig = {
  /** Whether BIDV business mode is enabled */
  enabled: boolean;
  /** BIDV SEPay API URL */
  apiUrl: string;
  /** BIDV SEPay auth token */
  authToken: string;
};

/**
 * Order tax configuration
 *
 * Configuration for tax calculation in order module
 */
export type OrderTaxConfig = {
  /** Whether tax calculation is enabled */
  enabled: boolean;
  /** Default tax percentage (%) */
  defaultPercentage: number;
};

/**
 * Complete order module configuration
 */
export type OrderConfig = {
  code: OrderCodeConfig;
  features: OrderFeatureConfig;
  urls: OrderUrlConfig;
  sepay: OrderSepayConfig;
  bidv: OrderBidvConfig;
  tax: OrderTaxConfig;
};
