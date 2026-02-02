/**
 * Transfer Type Value Object
 *
 * Defines the types of payment transfers supported.
 */

export const TRANSFER_TYPE = {
  VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
  REGULAR: 'REGULAR',
} as const;

export type TransferType = (typeof TRANSFER_TYPE)[keyof typeof TRANSFER_TYPE];

/**
 * Transfer mode configuration
 */
export type TransferModeConfig = {
  /** Active transfer type */
  activeMode: TransferType;
  /** Fallback to regular if VA fails */
  fallbackToRegular: boolean;
  /** VA configuration */
  va: {
    enabled: boolean;
    provider: 'sepay' | 'bidv';
    autoCreate: boolean;
    expiryHours: number;
  };
  /** Regular transfer configuration */
  regular: {
    enabled: boolean;
    enableFuzzyMatch: boolean;
    fuzzyThreshold: number;
  };
};

/**
 * Default transfer mode configuration
 */
export const DEFAULT_TRANSFER_MODE_CONFIG: TransferModeConfig = {
  activeMode: TRANSFER_TYPE.REGULAR,
  fallbackToRegular: true,
  va: {
    enabled: false,
    provider: 'sepay',
    autoCreate: true,
    expiryHours: 24,
  },
  regular: {
    enabled: true,
    enableFuzzyMatch: true,
    fuzzyThreshold: 0.7,
  },
};
