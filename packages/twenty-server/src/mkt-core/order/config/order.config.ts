import { registerAs } from '@nestjs/config';

import {
  ORDER_BIDV_DEFAULTS,
  ORDER_CODE_DEFAULTS,
  ORDER_FEATURE_DEFAULTS,
  ORDER_SEPAY_DEFAULTS,
  ORDER_URL_DEFAULTS,
} from 'src/mkt-core/order/config/order-config.defaults';
import {
  OrderBidvConfig,
  OrderCodeConfig,
  OrderConfig,
  OrderFeatureConfig,
  OrderSepayConfig,
  OrderTaxConfig,
  OrderUrlConfig,
} from 'src/mkt-core/order/config/order-config.types';
import { validateTaxEnv } from 'src/mkt-core/order/config/order-config.validation';

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
// CONFIG BUILDERS
// ============================================

const buildCodeConfig = (): OrderCodeConfig => ({
  prefix: getEnvString('ORDER_CODE_PREFIX', ORDER_CODE_DEFAULTS.PREFIX),
});

const buildFeatureConfig = (): OrderFeatureConfig => ({
  optimisticLockingEnabled: getEnvBoolean(
    'ORDER_OPTIMISTIC_LOCKING_ENABLED',
    ORDER_FEATURE_DEFAULTS.OPTIMISTIC_LOCKING_ENABLED,
  ),
});

const buildUrlConfig = (): OrderUrlConfig => ({
  serverUrl: getEnvString('SERVER_URL', ORDER_URL_DEFAULTS.SERVER_URL),
  paymentPagePath: ORDER_URL_DEFAULTS.PAYMENT_PAGE_PATH,
});

const buildSepayConfig = (): OrderSepayConfig => ({
  account: getEnvString('SEPAY_ACC', ORDER_SEPAY_DEFAULTS.ACCOUNT),
  bank: getEnvString('SEPAY_BANK', ORDER_SEPAY_DEFAULTS.BANK),
  virtualAccount: getEnvString(
    'SEPAY_VA',
    ORDER_SEPAY_DEFAULTS.VIRTUAL_ACCOUNT,
  ),
});

const buildBidvConfig = (): OrderBidvConfig => ({
  enabled: getEnvBoolean('IS_BIDV_BUSINESS', ORDER_BIDV_DEFAULTS.ENABLED),
  apiUrl: getEnvString('BIDV_SEPAY_API_URL', ORDER_BIDV_DEFAULTS.API_URL),
  authToken: getEnvString(
    'BIDV_SEPAY_AUTH_TOKEN',
    ORDER_BIDV_DEFAULTS.AUTH_TOKEN,
  ),
});

/**
 * Build tax configuration with validation
 *
 * Environment variables:
 * - MKT_ORDER_TAX_ENABLED: Enable/disable tax calculation (default: false)
 * - MKT_ORDER_TAX_PERCENTAGE: Default tax percentage (default: 10, must be 0-100)
 *
 * Uses Zod validation to ensure:
 * - MKT_ORDER_TAX_PERCENTAGE is between 0 and 100
 */
const buildTaxConfig = (): OrderTaxConfig => {
  const validated = validateTaxEnv();

  return {
    enabled: validated.enabled,
    defaultPercentage: validated.percentage,
  };
};

// ============================================
// MAIN CONFIG
// ============================================

/**
 * Order module configuration
 *
 * Registered with NestJS ConfigModule as 'order'
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(orderConfig.KEY)
 *   private readonly config: OrderConfig,
 * ) {}
 *
 * // Access config
 * const prefix = this.config.code.prefix;
 * const serverUrl = this.config.urls.serverUrl;
 * ```
 */
export const orderConfig = registerAs(
  'order',
  (): OrderConfig => ({
    code: buildCodeConfig(),
    features: buildFeatureConfig(),
    urls: buildUrlConfig(),
    sepay: buildSepayConfig(),
    bidv: buildBidvConfig(),
    tax: buildTaxConfig(),
  }),
);

/**
 * Config key for injection
 */
export const ORDER_CONFIG_KEY = orderConfig.KEY;
