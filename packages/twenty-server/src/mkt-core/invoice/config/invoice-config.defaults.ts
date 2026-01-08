/**
 * Invoice Configuration Defaults
 *
 * Default values for invoice module configuration
 * Các giá trị mặc định cho cấu hình module hóa đơn
 */

/**
 * S-Invoice API configuration defaults
 * Cấu hình mặc định cho API S-Invoice (Viettel e-invoice)
 */
export const SINVOICE_API_DEFAULTS = {
  /** Base URL for S-Invoice API */
  BASE_URL: 'https://api-vinvoice.viettel.vn',

  /** Default tax code */
  TAX_CODE: '',

  /** Default template code */
  TEMPLATE_CODE: '1/770',

  /** Default invoice series */
  INVOICE_SERIES: 'K23TXM',

  /** Default username for API authentication */
  USERNAME: '',

  /** Default password for API authentication */
  PASSWORD: '',

  /** API timeout in milliseconds */
  TIMEOUT_MS: 30000,

  /** Default currency code */
  CURRENCY_CODE: 'VND',

  /** Default exchange rate */
  EXCHANGE_RATE: 1,

  /** Default invoice type (1 = standard) */
  INVOICE_TYPE: '1',

  /** Default adjustment type */
  ADJUSTMENT_TYPE: '1',

  /** Default payment method */
  PAYMENT_METHOD: 'Tiền mặt',

  /** Default buyer name when not provided */
  DEFAULT_BUYER_NAME: 'Khách hàng',

  /** Default unit name for items */
  DEFAULT_UNIT_NAME: 'unit',
} as const;

/**
 * Invoice naming configuration defaults
 * Cấu hình đặt tên hóa đơn mặc định
 */
export const INVOICE_NAME_DEFAULTS = {
  /** Prefix for generated invoice names */
  PREFIX: 'INV',

  /** Maximum length for order item name in invoice name */
  MAX_LENGTH: 50,
} as const;

/**
 * Invoice file storage configuration defaults
 * Cấu hình lưu trữ file hóa đơn mặc định
 */
export const INVOICE_FILE_DEFAULTS = {
  /** Default file type */
  FILE_TYPE: 'PDF',

  /** Upload directory path relative to project root */
  UPLOAD_PATH: 'uploads/invoice-files',

  /** Secret key for signed download URLs */
  DOWNLOAD_SECRET: 'default-secret-key',

  /** Default expiration time for download URLs in seconds */
  DOWNLOAD_EXPIRES: 30,
} as const;
