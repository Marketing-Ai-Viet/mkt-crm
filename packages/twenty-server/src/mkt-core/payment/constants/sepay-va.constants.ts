/**
 * SEPay Virtual Account Constants
 *
 * Configuration and constants for SEPay VA integration.
 */

/**
 * SEPay VA API Endpoints
 */
export const SEPAY_VA_API_ENDPOINTS = {
  CREATE_VA: '/virtual-accounts',
  GET_VA_STATUS: '/virtual-accounts/:vaNumber',
  DEACTIVATE_VA: '/virtual-accounts/:vaNumber/deactivate',
  HEALTH_CHECK: '/health',
} as const;

/**
 * SEPay VA Environment Variable Keys
 */
export const SEPAY_VA_ENV_KEYS = {
  API_URL: 'SEPAY_VA_API_URL',
  API_KEY: 'SEPAY_VA_API_KEY',
  MERCHANT_ID: 'SEPAY_VA_MERCHANT_ID',
  BANK_CODE: 'SEPAY_VA_BANK_CODE',
  TIMEOUT_MS: 'SEPAY_VA_TIMEOUT_MS',
} as const;

/**
 * SEPay VA Configuration Defaults
 */
export const SEPAY_VA_DEFAULTS = {
  /** Default API URL (placeholder - should be configured via env) */
  API_URL: 'https://api.sepay.vn/v1',
  /** Default bank code for VA */
  BANK_CODE: 'BIDV',
  /** Default bank name */
  BANK_NAME: 'BIDV',
  /** Default account name for VA */
  ACCOUNT_NAME: 'MKT CRM',
  /** Default timeout in milliseconds */
  TIMEOUT_MS: 30000,
  /** Default VA expiry in hours */
  EXPIRY_HOURS: 24,
} as const;

/**
 * SEPay VA Response Codes
 */
export const SEPAY_VA_RESPONSE_CODES = {
  SUCCESS: '00',
  INVALID_REQUEST: '01',
  VA_EXISTS: '02',
  VA_NOT_FOUND: '03',
  VA_EXPIRED: '04',
  SYSTEM_ERROR: '99',
} as const;

export type SepayVAResponseCode =
  (typeof SEPAY_VA_RESPONSE_CODES)[keyof typeof SEPAY_VA_RESPONSE_CODES];

/**
 * SEPay VA Error Messages
 */
export const SEPAY_VA_ERROR_MESSAGES = {
  PROVIDER_UNAVAILABLE: 'SEPay VA provider is not available',
  INVALID_REQUEST: 'Invalid VA creation request',
  VA_EXISTS: 'Virtual account already exists for this order',
  VA_NOT_FOUND: 'Virtual account not found',
  VA_EXPIRED: 'Virtual account has expired',
  SYSTEM_ERROR: 'System error occurred while processing VA request',
  API_ERROR: 'Error communicating with SEPay VA API',
  MISSING_CONFIG: 'SEPay VA configuration is incomplete',
} as const;
