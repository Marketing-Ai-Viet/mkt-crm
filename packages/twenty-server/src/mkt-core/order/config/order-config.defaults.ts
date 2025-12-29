/**
 * Order Configuration Defaults
 *
 * Default values for order module configuration
 */

/**
 * Order code format constants
 *
 * Normal format: {PREFIX}{YYYYMMDD}{NNN}
 * - PREFIX: configurable (e.g., 'MKT', 'DEV')
 * - YYYYMMDD: 8 digits date
 * - NNN: 3 digits sequence number (001-999)
 *
 * Fallback format: {PREFIX}{YYYYMMDD}{TTTTNN}
 * - Same prefix and date
 * - TTTT: 4 digits from timestamp (last 4 digits of milliseconds)
 * - NN: 2 digits random number (00-99)
 * - Combined 6 digits prevents same-millisecond collision
 *
 * Examples:
 * - Normal: MKT20241229001, MKT20241229002, ...
 * - Fallback: MKT20241229384527 (timestamp=3845, random=27)
 */
export const ORDER_CODE_FORMAT = {
  /** Date format length (YYYYMMDD) */
  DATE_LENGTH: 8,
  /** Sequence number length for normal format */
  SEQUENCE_LENGTH: 3,
  /** Total fallback suffix length (timestamp + random) */
  FALLBACK_LENGTH: 6,
  /** Timestamp portion in fallback (last N digits of ms) */
  FALLBACK_TIMESTAMP_LENGTH: 4,
  /** Random portion in fallback (for collision prevention) */
  FALLBACK_RANDOM_LENGTH: 2,
  /** Maximum random value (10^FALLBACK_RANDOM_LENGTH - 1) */
  FALLBACK_RANDOM_MAX: 99,
  /** Maximum orders per day per workspace (10^3 - 1) */
  MAX_DAILY_ORDERS: 999,
} as const;

/**
 * Order code defaults
 */
export const ORDER_CODE_DEFAULTS = {
  PREFIX: 'DEV',
} as const;

/**
 * Order feature defaults
 */
export const ORDER_FEATURE_DEFAULTS = {
  OPTIMISTIC_LOCKING_ENABLED: true,
} as const;

/**
 * Order URL defaults
 */
export const ORDER_URL_DEFAULTS = {
  SERVER_URL: 'http://localhost:3000',
  PAYMENT_PAGE_PATH: '/payment',
} as const;

/**
 * SEPay defaults for orders
 */
export const ORDER_SEPAY_DEFAULTS = {
  ACCOUNT: '',
  BANK: '',
  VIRTUAL_ACCOUNT: '',
} as const;

/**
 * BIDV defaults for orders
 */
export const ORDER_BIDV_DEFAULTS = {
  ENABLED: false,
  API_URL: '',
  AUTH_TOKEN: '',
} as const;
