/**
 * BIDV Provider Configuration
 *
 * NestJS ConfigModule configuration for BIDV SePay provider.
 * Uses environment variables with sensible defaults.
 */

import { registerAs } from '@nestjs/config';

import {
  BidvProviderConfig,
  BIDV_DEFAULT_DURATION,
} from 'src/mkt-core/payment/providers/bidv/bidv.types';

// ============================================
// DEFAULTS
// ============================================

const BIDV_DEFAULTS = {
  ENABLED: false,
  API_URL: '',
  AUTH_TOKEN: '',
  COOKIE: '',
  DEFAULT_DURATION: BIDV_DEFAULT_DURATION,
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

const getEnvNumber = (key: string, defaultValue: number): number =>
  Number(process.env[key]) || defaultValue;

// ============================================
// CONFIG BUILDER
// ============================================

const buildBidvConfig = (): BidvProviderConfig => ({
  enabled: getEnvBoolean('IS_BIDV_BUSINESS', BIDV_DEFAULTS.ENABLED),
  apiUrl: getEnvString('BIDV_SEPAY_API_URL', BIDV_DEFAULTS.API_URL),
  authToken: getEnvString('BIDV_SEPAY_AUTH_TOKEN', BIDV_DEFAULTS.AUTH_TOKEN),
  cookie: getEnvString('BIDV_SEPAY_COOKIE', BIDV_DEFAULTS.COOKIE),
  defaultDuration: getEnvNumber(
    'BIDV_SEPAY_DEFAULT_DURATION',
    BIDV_DEFAULTS.DEFAULT_DURATION,
  ),
  workspaceId: getEnvString('MKT_WORKSPACE_ID', BIDV_DEFAULTS.WORKSPACE_ID),
});

// ============================================
// REGISTERED CONFIG
// ============================================

/**
 * BIDV provider configuration
 *
 * Registered with NestJS ConfigModule as 'bidv'
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(bidvConfig.KEY)
 *   private readonly config: ConfigType<typeof bidvConfig>,
 * ) {}
 *
 * // Access config
 * const apiUrl = this.config.apiUrl;
 * ```
 */
export const bidvConfig = registerAs('bidv', buildBidvConfig);

/**
 * Config key for injection
 */
export const BIDV_CONFIG_KEY = bidvConfig.KEY;
