/**
 * Payment Configuration Types
 *
 * Type definitions for payment module configuration
 */

/**
 * SEPay QR code configuration
 */
export type SepayConfig = {
  /** SEPay account number */
  account: string;
  /** SEPay bank code */
  bank: string;
  /** SEPay virtual account prefix */
  virtualAccount: string;
  /** Whether SEPay auth is enabled for webhook */
  authEnabled: boolean;
  /** API key for webhook authentication */
  webhookApiKey: string;
  /** Default workspace ID for SEPay webhooks */
  workspaceId: string;
};

/**
 * BIDV SEPay Business configuration
 */
export type BidvConfig = {
  /** Whether BIDV business mode is enabled */
  enabled: boolean;
  /** BIDV SEPay API URL */
  apiUrl: string;
  /** BIDV SEPay auth token */
  authToken: string;
  /** BIDV SEPay cookie (optional) */
  cookie: string;
  /** Default QR code duration in seconds */
  defaultDuration: number;
};

/**
 * Payment URL configuration
 */
export type PaymentUrlConfig = {
  /** Server base URL */
  serverUrl: string;
  /** Payment page path template */
  paymentPagePath: string;
};

/**
 * Workspace configuration
 */
export type WorkspaceConfig = {
  /** Default MKT workspace ID */
  mktWorkspaceId: string;
};

/**
 * Complete payment module configuration
 */
export type PaymentConfig = {
  sepay: SepayConfig;
  bidv: BidvConfig;
  urls: PaymentUrlConfig;
  workspace: WorkspaceConfig;
};
