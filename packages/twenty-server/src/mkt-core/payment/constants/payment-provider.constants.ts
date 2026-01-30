import { TagColor } from 'src/engine/metadata-modules/field-metadata/dtos/options.input';

/**
 * Payment Provider Types
 * Mở rộng khi thêm provider mới
 */
export const PAYMENT_PROVIDER_TYPE = {
  SEPAY: 'SEPAY',
  VNPAY: 'VNPAY',
  MOMO: 'MOMO',
  ZALOPAY: 'ZALOPAY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH: 'CASH',
  CREDIT_CARD: 'CREDIT_CARD',
  OTHER: 'OTHER',
} as const;

export type PaymentProviderType =
  (typeof PAYMENT_PROVIDER_TYPE)[keyof typeof PAYMENT_PROVIDER_TYPE];

export const PAYMENT_PROVIDER_OPTIONS = [
  {
    value: PAYMENT_PROVIDER_TYPE.SEPAY,
    label: 'SEPay',
    position: 0,
    color: 'blue' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.VNPAY,
    label: 'VNPay',
    position: 1,
    color: 'green' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.MOMO,
    label: 'MoMo',
    position: 2,
    color: 'pink' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.ZALOPAY,
    label: 'ZaloPay',
    position: 3,
    color: 'sky' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.BANK_TRANSFER,
    label: 'Bank Transfer',
    position: 4,
    color: 'gray' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.CASH,
    label: 'Cash',
    position: 5,
    color: 'yellow' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.CREDIT_CARD,
    label: 'Credit Card',
    position: 6,
    color: 'purple' as TagColor,
  },
  {
    value: PAYMENT_PROVIDER_TYPE.OTHER,
    label: 'Other',
    position: 7,
    color: 'gray' as TagColor,
  },
];

/**
 * Provider capabilities configuration
 */
export type ProviderCapabilities = {
  supportsQrCode: boolean;
  supportsWebhook: boolean;
  supportsRefund: boolean;
  supportsPartialRefund: boolean;
  requiresManualConfirmation: boolean;
};

export const PROVIDER_CAPABILITIES: Record<
  PaymentProviderType,
  ProviderCapabilities
> = {
  [PAYMENT_PROVIDER_TYPE.SEPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.VNPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.MOMO]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: false,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.ZALOPAY]: {
    supportsQrCode: true,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.BANK_TRANSFER]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
  [PAYMENT_PROVIDER_TYPE.CASH]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
  [PAYMENT_PROVIDER_TYPE.CREDIT_CARD]: {
    supportsQrCode: false,
    supportsWebhook: true,
    supportsRefund: true,
    supportsPartialRefund: true,
    requiresManualConfirmation: false,
  },
  [PAYMENT_PROVIDER_TYPE.OTHER]: {
    supportsQrCode: false,
    supportsWebhook: false,
    supportsRefund: false,
    supportsPartialRefund: false,
    requiresManualConfirmation: true,
  },
};
