import { registerAs } from '@nestjs/config';

import {
  ORDER_BIDV_DEFAULTS,
  ORDER_CODE_DEFAULTS,
  ORDER_FEATURE_DEFAULTS,
  ORDER_OVERDUE_DEFAULTS,
  ORDER_SEPAY_DEFAULTS,
  ORDER_URL_DEFAULTS,
} from 'src/mkt-core/order/config/order-config.defaults';
import {
  OrderBidvConfig,
  OrderCodeConfig,
  OrderConfig,
  OrderFeatureConfig,
  OrderOverdueConfig,
  OrderSepayConfig,
  OrderUrlConfig,
} from 'src/mkt-core/order/config/order-config.types';

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

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  return isNaN(parsed) ? defaultValue : parsed;
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

const buildOverdueConfig = (): OrderOverdueConfig => {
  // Đảm bảo delay không nhỏ hơn MIN_DELAY_MS (1 hour)
  const delayMs = Math.max(
    getEnvNumber('MKT_ORDER_OVERDUE_DELAY_MS', ORDER_OVERDUE_DEFAULTS.DELAY_MS),
    ORDER_OVERDUE_DEFAULTS.MIN_DELAY_MS,
  );

  const msPerHour = 60 * 60 * 1000;

  return {
    delayMs,
    delayHours: delayMs / msPerHour,
    retryAttempts: getEnvNumber(
      'MKT_ORDER_OVERDUE_RETRY_ATTEMPTS',
      ORDER_OVERDUE_DEFAULTS.RETRY_ATTEMPTS,
    ),
    backoffMs: getEnvNumber(
      'MKT_ORDER_OVERDUE_BACKOFF_MS',
      ORDER_OVERDUE_DEFAULTS.BACKOFF_MS,
    ),
    workerConcurrency: getEnvNumber(
      'MKT_ORDER_OVERDUE_WORKER_CONCURRENCY',
      ORDER_OVERDUE_DEFAULTS.WORKER_CONCURRENCY,
    ),
    jobName: ORDER_OVERDUE_DEFAULTS.JOB_NAME,
    jobIdPrefix: ORDER_OVERDUE_DEFAULTS.JOB_ID_PREFIX,
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
    overdue: buildOverdueConfig(),
  }),
);

/**
 * Config key for injection
 */
export const ORDER_CONFIG_KEY = orderConfig.KEY;
