import { registerAs } from '@nestjs/config';

import {
  TransferModeConfig,
  TRANSFER_TYPE,
  TransferType,
} from 'src/mkt-core/payment/domain/value-objects';

// ============================================
// CONSTANTS
// ============================================

const TRANSFER_MODE_ENV_KEYS = {
  MODE: 'TRANSFER_MODE',
  VA_ENABLED: 'VA_ENABLED',
  VA_PROVIDER: 'VA_PROVIDER',
  VA_AUTO_CREATE: 'VA_AUTO_CREATE',
  VA_EXPIRY_HOURS: 'VA_EXPIRY_HOURS',
  VA_FALLBACK_TO_REGULAR: 'VA_FALLBACK_TO_REGULAR',
  REGULAR_ENABLED: 'REGULAR_ENABLED',
  REGULAR_ENABLE_FUZZY: 'REGULAR_ENABLE_FUZZY',
  REGULAR_FUZZY_THRESHOLD: 'REGULAR_FUZZY_THRESHOLD',
} as const;

const TRANSFER_MODE_DEFAULTS = {
  MODE: TRANSFER_TYPE.REGULAR as TransferType,
  VA_ENABLED: false,
  VA_PROVIDER: 'sepay' as const,
  VA_AUTO_CREATE: true,
  VA_EXPIRY_HOURS: 24,
  VA_FALLBACK_TO_REGULAR: true,
  REGULAR_ENABLED: true,
  REGULAR_ENABLE_FUZZY: true,
  REGULAR_FUZZY_THRESHOLD: 0.7,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

const getEnvNumber = (key: string, defaultValue: number): number =>
  Number(process.env[key]) || defaultValue;

const getTransferMode = (): TransferType => {
  const value = process.env[TRANSFER_MODE_ENV_KEYS.MODE];

  if (value === TRANSFER_TYPE.VIRTUAL_ACCOUNT) {
    return TRANSFER_TYPE.VIRTUAL_ACCOUNT;
  }

  return TRANSFER_TYPE.REGULAR;
};

const getVAProvider = (): 'sepay' | 'bidv' => {
  const value = process.env[TRANSFER_MODE_ENV_KEYS.VA_PROVIDER];

  if (value === 'bidv') {
    return 'bidv';
  }

  return 'sepay';
};

// ============================================
// CONFIG BUILDER
// ============================================

const buildTransferModeConfig = (): TransferModeConfig => ({
  activeMode: getTransferMode(),
  fallbackToRegular: getEnvBoolean(
    TRANSFER_MODE_ENV_KEYS.VA_FALLBACK_TO_REGULAR,
    TRANSFER_MODE_DEFAULTS.VA_FALLBACK_TO_REGULAR,
  ),
  va: {
    enabled: getEnvBoolean(
      TRANSFER_MODE_ENV_KEYS.VA_ENABLED,
      TRANSFER_MODE_DEFAULTS.VA_ENABLED,
    ),
    provider: getVAProvider(),
    autoCreate: getEnvBoolean(
      TRANSFER_MODE_ENV_KEYS.VA_AUTO_CREATE,
      TRANSFER_MODE_DEFAULTS.VA_AUTO_CREATE,
    ),
    expiryHours: getEnvNumber(
      TRANSFER_MODE_ENV_KEYS.VA_EXPIRY_HOURS,
      TRANSFER_MODE_DEFAULTS.VA_EXPIRY_HOURS,
    ),
  },
  regular: {
    enabled: getEnvBoolean(
      TRANSFER_MODE_ENV_KEYS.REGULAR_ENABLED,
      TRANSFER_MODE_DEFAULTS.REGULAR_ENABLED,
    ),
    enableFuzzyMatch: getEnvBoolean(
      TRANSFER_MODE_ENV_KEYS.REGULAR_ENABLE_FUZZY,
      TRANSFER_MODE_DEFAULTS.REGULAR_ENABLE_FUZZY,
    ),
    fuzzyThreshold: getEnvNumber(
      TRANSFER_MODE_ENV_KEYS.REGULAR_FUZZY_THRESHOLD,
      TRANSFER_MODE_DEFAULTS.REGULAR_FUZZY_THRESHOLD,
    ),
  },
});

// ============================================
// MAIN CONFIG
// ============================================

/**
 * Transfer Mode Configuration
 *
 * Configures payment transfer modes: Virtual Account (VA) or Regular transfer.
 *
 * Environment Variables:
 * - TRANSFER_MODE: 'VA' | 'REGULAR' (default: 'REGULAR')
 * - VA_ENABLED: Enable VA support (default: false)
 * - VA_PROVIDER: 'sepay' | 'bidv' (default: 'sepay')
 * - VA_AUTO_CREATE: Auto-create VA for orders (default: true)
 * - VA_EXPIRY_HOURS: VA expiry in hours (default: 24)
 * - VA_FALLBACK_TO_REGULAR: Fallback to regular if VA fails (default: true)
 * - REGULAR_ENABLED: Enable regular transfer (default: true)
 * - REGULAR_ENABLE_FUZZY: Enable fuzzy matching (default: true)
 * - REGULAR_FUZZY_THRESHOLD: Fuzzy match threshold 0-1 (default: 0.7)
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(transferModeConfig.KEY)
 *   private readonly config: TransferModeConfig,
 * ) {}
 *
 * // Access config
 * const isVAEnabled = this.config.va.enabled;
 * ```
 */
export const transferModeConfig = registerAs(
  'transferMode',
  buildTransferModeConfig,
);

/**
 * Config key for injection
 */
export const TRANSFER_MODE_CONFIG_KEY = transferModeConfig.KEY;
