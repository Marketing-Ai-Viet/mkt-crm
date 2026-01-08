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

// Milliseconds constants
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

/**
 * Order overdue defaults
 *
 * Configuration for delayed job system that marks orders as OVERDUE
 * when payment is not received within the specified time.
 */
export const ORDER_OVERDUE_DEFAULTS = {
  /** Delay before order becomes overdue - default 24 hours */
  DELAY_MS: 24 * MS_PER_HOUR,
  /** Minimum delay - 1 hour (safety limit) */
  MIN_DELAY_MS: MS_PER_HOUR,
  /** Max retry attempts when job fails */
  RETRY_ATTEMPTS: 3,
  /** Base backoff delay for exponential retry - 1 minute */
  BACKOFF_MS: MS_PER_MINUTE,
  /** Worker concurrency - số jobs xử lý đồng thời */
  WORKER_CONCURRENCY: 5,
  /** Job name */
  JOB_NAME: 'ProcessOrderOverdue',
  /** Job ID prefix */
  JOB_ID_PREFIX: 'order-overdue',
} as const;

/**
 * Order tax defaults
 *
 * Configuration for tax calculation in order module
 * - ENABLED: Whether tax calculation is enabled (default: false)
 * - DEFAULT_PERCENTAGE: Default tax percentage when enabled (default: 10%)
 *
 * Set MKT_ORDER_TAX_ENABLED=true in env to enable tax calculation
 */
export const ORDER_TAX_DEFAULTS = {
  /** Tax calculation disabled by default */
  ENABLED: false,
  /** Default tax percentage (10% VAT in Vietnam) */
  DEFAULT_PERCENTAGE: 10,
} as const;

/**
 * Tax configuration validation constants
 */
export const TAX_VALIDATION = {
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
} as const;
