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
 * Order overdue configuration
 *
 * Configuration for delayed job system that marks orders as OVERDUE
 */
export type OrderOverdueConfig = {
  /** Delay in milliseconds before order becomes overdue */
  delayMs: number;
  /** Delay in hours (for display) */
  delayHours: number;
  /** Max retry attempts when job fails */
  retryAttempts: number;
  /** Base backoff delay in ms for exponential retry */
  backoffMs: number;
  /** Worker concurrency */
  workerConcurrency: number;
  /** Job name */
  jobName: string;
  /** Job ID prefix */
  jobIdPrefix: string;
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
  overdue: OrderOverdueConfig;
};
