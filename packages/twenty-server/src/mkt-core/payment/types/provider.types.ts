/**
 * Payment Provider Types
 *
 * Defines supported payment provider types and their metadata.
 * Add new providers here when extending the system.
 */

/**
 * Supported payment provider types
 */
export const PAYMENT_PROVIDER_TYPE = {
  SEPAY_QR: 'SEPAY_QR',
  BIDV_SEPAY: 'BIDV_SEPAY',
  MOMO: 'MOMO',
  VNPAY: 'VNPAY',
  ZALOPAY: 'ZALOPAY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
} as const;

export type PaymentProviderType =
  (typeof PAYMENT_PROVIDER_TYPE)[keyof typeof PAYMENT_PROVIDER_TYPE];

/**
 * Provider capabilities - what each provider can do
 */
export type ProviderCapabilities = {
  supportsQrCode: boolean;
  supportsRefund: boolean;
  supportsRecurring: boolean;
  supportsPartialPayment: boolean;
  supportsWebhook: boolean;
  supportsPullStatus: boolean;
};

/**
 * Provider metadata for registration and display
 */
export type ProviderMetadata = {
  type: PaymentProviderType;
  displayName: string;
  description: string;
  icon: string;
  capabilities: ProviderCapabilities;
  configuredFields: string[];
};

/**
 * Provider registration info
 */
export type ProviderRegistration = {
  type: PaymentProviderType;
  metadata: ProviderMetadata;
  enabled: boolean;
};

/**
 * Default capabilities for providers that don't specify
 */
export const DEFAULT_PROVIDER_CAPABILITIES: ProviderCapabilities = {
  supportsQrCode: false,
  supportsRefund: false,
  supportsRecurring: false,
  supportsPartialPayment: false,
  supportsWebhook: false,
  supportsPullStatus: false,
};

/**
 * Map provider type to display name
 */
export const PROVIDER_DISPLAY_NAMES: Record<PaymentProviderType, string> = {
  [PAYMENT_PROVIDER_TYPE.SEPAY_QR]: 'SePay QR (VietQR)',
  [PAYMENT_PROVIDER_TYPE.BIDV_SEPAY]: 'BIDV SePay',
  [PAYMENT_PROVIDER_TYPE.MOMO]: 'MoMo Wallet',
  [PAYMENT_PROVIDER_TYPE.VNPAY]: 'VNPay',
  [PAYMENT_PROVIDER_TYPE.ZALOPAY]: 'ZaloPay',
  [PAYMENT_PROVIDER_TYPE.BANK_TRANSFER]: 'Bank Transfer',
  [PAYMENT_PROVIDER_TYPE.CASH]: 'Cash',
};
