import { registerAs } from '@nestjs/config';

import {
  BIDV_DEFAULTS,
  PAYMENT_URL_DEFAULTS,
  SEPAY_DEFAULTS,
  WORKSPACE_DEFAULTS,
} from 'src/mkt-core/payment/config/payment-config.defaults';
import {
  BidvConfig,
  PaymentConfig,
  PaymentUrlConfig,
  SepayConfig,
  WorkspaceConfig,
} from 'src/mkt-core/payment/types/payment-config.types';

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
// CONFIG BUILDERS
// ============================================

const buildSepayConfig = (): SepayConfig => ({
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

const buildBidvConfig = (): BidvConfig => ({
  enabled: getEnvBoolean('IS_BIDV_BUSINESS', BIDV_DEFAULTS.ENABLED),
  apiUrl: getEnvString('BIDV_SEPAY_API_URL', BIDV_DEFAULTS.API_URL),
  authToken: getEnvString('BIDV_SEPAY_AUTH_TOKEN', BIDV_DEFAULTS.AUTH_TOKEN),
  cookie: getEnvString('BIDV_SEPAY_COOKIE', BIDV_DEFAULTS.COOKIE),
  defaultDuration: getEnvNumber(
    'BIDV_SEPAY_DEFAULT_DURATION',
    BIDV_DEFAULTS.DEFAULT_DURATION,
  ),
});

const buildUrlConfig = (): PaymentUrlConfig => ({
  serverUrl: getEnvString('SERVER_URL', PAYMENT_URL_DEFAULTS.SERVER_URL),
  paymentPagePath: PAYMENT_URL_DEFAULTS.PAYMENT_PAGE_PATH,
});

const buildWorkspaceConfig = (): WorkspaceConfig => ({
  mktWorkspaceId: getEnvString(
    'MKT_WORKSPACE_ID',
    WORKSPACE_DEFAULTS.MKT_WORKSPACE_ID,
  ),
});

// ============================================
// MAIN CONFIG
// ============================================

/**
 * Payment module configuration
 *
 * Registered with NestJS ConfigModule as 'payment'
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(paymentConfig.KEY)
 *   private readonly config: PaymentConfig,
 * ) {}
 *
 * // Access config
 * const sepayAccount = this.config.sepay.account;
 * ```
 */
export const paymentConfig = registerAs(
  'payment',
  (): PaymentConfig => ({
    sepay: buildSepayConfig(),
    bidv: buildBidvConfig(),
    urls: buildUrlConfig(),
    workspace: buildWorkspaceConfig(),
  }),
);

/**
 * Config key for injection
 */
export const PAYMENT_CONFIG_KEY = paymentConfig.KEY;
