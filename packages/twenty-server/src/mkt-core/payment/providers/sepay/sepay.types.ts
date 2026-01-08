/**
 * SePay Provider Types
 *
 * Types specific to SePay payment provider.
 * Re-exports from existing types and adds provider-specific types.
 */

// Re-export existing types
export {
  SepayWebhookPayload,
  SepayTransferType,
  SepayWebhookResponseStatus,
  SepayWebhookResponse,
} from 'src/mkt-core/payment/types/sepay-webhook.types';

/**
 * SePay QR code generation parameters
 */
export type SepayQrParams = {
  /** Bank account number */
  account: string;
  /** Bank name/code (e.g., 'BIDV', 'VCB') */
  bank: string;
  /** Virtual account / sub-account (optional) */
  virtualAccount?: string;
  /** Payment amount in VND */
  amount: number;
  /** Order code for reference */
  orderCode: string;
  /** Payment description (optional) */
  description?: string;
  /** QR template style */
  template?: SepayQrTemplate;
};

/**
 * SePay QR template styles
 */
export type SepayQrTemplate = 'qronly' | 'compact' | 'compact2' | 'print';

/**
 * SePay configuration from environment
 */
export type SepayProviderConfig = {
  /** Bank account number */
  account: string;
  /** Bank name/code */
  bank: string;
  /** Virtual account prefix (optional) */
  virtualAccount: string;
  /** Whether webhook authentication is enabled */
  authEnabled: boolean;
  /** API key for webhook validation */
  webhookApiKey: string;
  /** Workspace ID for this provider */
  workspaceId: string;
};

/**
 * SePay provider capabilities metadata
 */
export const SEPAY_PROVIDER_METADATA = {
  type: 'SEPAY_QR',
  displayName: 'SePay QR (VietQR)',
  description: 'VietQR payment via SePay gateway with bank transfer',
  icon: 'IconQrcode',
  configuredFields: ['account', 'bank', 'virtualAccount', 'webhookApiKey'],
} as const;
