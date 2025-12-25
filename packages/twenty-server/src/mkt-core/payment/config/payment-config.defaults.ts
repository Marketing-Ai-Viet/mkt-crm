/**
 * Payment Configuration Defaults
 *
 * Default values for payment module configuration
 */

/**
 * SEPay configuration defaults
 */
export const SEPAY_DEFAULTS = {
  ACCOUNT: '',
  BANK: '',
  VIRTUAL_ACCOUNT: '',
  AUTH_ENABLED: false,
  WEBHOOK_API_KEY: '',
  WORKSPACE_ID: '',
} as const;

/**
 * BIDV configuration defaults
 */
export const BIDV_DEFAULTS = {
  ENABLED: false,
  API_URL: '',
  AUTH_TOKEN: '',
  COOKIE: '',
  DEFAULT_DURATION: 300, // 5 minutes in seconds
} as const;

/**
 * Firebase configuration defaults
 */
export const FIREBASE_DEFAULTS = {
  API_KEY: '',
  DATABASE_URL: '',
  AUTH_URL: '',
} as const;

/**
 * Payment URL defaults
 */
export const PAYMENT_URL_DEFAULTS = {
  SERVER_URL: 'http://localhost:3000',
  PAYMENT_PAGE_PATH: '/payment',
} as const;

/**
 * Workspace defaults
 */
export const WORKSPACE_DEFAULTS = {
  MKT_WORKSPACE_ID: '',
} as const;
