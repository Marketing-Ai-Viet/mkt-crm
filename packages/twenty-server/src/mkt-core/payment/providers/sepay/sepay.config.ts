/**
 * SePay Provider Configuration
 *
 * NestJS ConfigModule configuration for SePay provider.
 * Uses environment variables with sensible defaults.
 */

import { registerAs } from '@nestjs/config';

import { SepayProviderConfig } from 'src/mkt-core/payment/providers/sepay/sepay.types';

// ============================================
// DEFAULTS
// ============================================

const SEPAY_DEFAULTS = {
  ACCOUNT: '',
  BANK: '',
  VIRTUAL_ACCOUNT: '',
  AUTH_ENABLED: true,
  WEBHOOK_API_KEY: '',
  WORKSPACE_ID: '',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

const getEnvString = (key: string, defaultValue: string): string =>
  process.env[key] ?? defaultValue;

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

// ============================================
// CONFIG BUILDER
// ============================================

const buildSepayConfig = (): SepayProviderConfig => ({
  account: getEnvString('SEPAY_ACC', SEPAY_DEFAULTS.ACCOUNT),
  bank: getEnvString('SEPAY_BANK', SEPAY_DEFAULTS.BANK),
  virtualAccount: getEnvString('SEPAY_VA', SEPAY_DEFAULTS.VIRTUAL_ACCOUNT),
  authEnabled: getEnvBoolean('SEPAY_AUTH_ENABLED', SEPAY_DEFAULTS.AUTH_ENABLED),
  webhookApiKey: getEnvString(
    'SEPAY_WEBHOOK_API_KEY',
    SEPAY_DEFAULTS.WEBHOOK_API_KEY,
  ),
  workspaceId: getEnvString('SEPAY_WORKSPACE_ID', SEPAY_DEFAULTS.WORKSPACE_ID),
});

// ============================================
// REGISTERED CONFIG
// ============================================

/**
 * SePay provider configuration
 *
 * Registered with NestJS ConfigModule as 'sepay'
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(sepayConfig.KEY)
 *   private readonly config: ConfigType<typeof sepayConfig>,
 * ) {}
 *
 * // Access config
 * const account = this.config.account;
 * ```
 */
export const sepayConfig = registerAs('sepay', buildSepayConfig);

/**
 * Config key for injection
 */
export const SEPAY_CONFIG_KEY = sepayConfig.KEY;
