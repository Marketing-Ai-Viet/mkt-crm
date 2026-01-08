import { registerAs } from '@nestjs/config';

import {
  INVOICE_FILE_DEFAULTS,
  INVOICE_NAME_DEFAULTS,
  SINVOICE_API_DEFAULTS,
} from 'src/mkt-core/invoice/config/invoice-config.defaults';
import {
  InvoiceConfig,
  InvoiceFileConfig,
  InvoiceNameConfig,
  SInvoiceApiConfig,
} from 'src/mkt-core/invoice/types';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getEnvString = (key: string, defaultValue: string): string =>
  process.env[key] ?? defaultValue;

const getEnvNumber = (key: string, defaultValue: number): number =>
  Number(process.env[key]) || defaultValue;

// ============================================
// CONFIG BUILDERS
// ============================================

/**
 * Build S-Invoice API configuration
 * Xây dựng cấu hình API S-Invoice
 */
const buildSInvoiceApiConfig = (): SInvoiceApiConfig => {
  const username = getEnvString(
    'S_INVOICE_USERNAME',
    SINVOICE_API_DEFAULTS.USERNAME,
  );
  const password = getEnvString(
    'S_INVOICE_PASSWORD',
    SINVOICE_API_DEFAULTS.PASSWORD,
  );

  // Generate Basic Auth header from username/password
  const basicAuth =
    username && password
      ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      : '';

  return {
    baseUrl: getEnvString('S_INVOICE_BASE_URL', SINVOICE_API_DEFAULTS.BASE_URL),
    taxCode: getEnvString('S_INVOICE_TAX_CODE', SINVOICE_API_DEFAULTS.TAX_CODE),
    templateCode: getEnvString(
      'S_INVOICE_TEMPLATE_CODE',
      SINVOICE_API_DEFAULTS.TEMPLATE_CODE,
    ),
    invoiceSeries: getEnvString(
      'S_INVOICE_SERIES',
      SINVOICE_API_DEFAULTS.INVOICE_SERIES,
    ),
    username,
    password,
    cookieToken: getEnvString('S_INVOICE_COOKIE', ''),
    authorization: getEnvString('S_INVOICE_AUTHORIZATION', basicAuth),
    timeoutMs: getEnvNumber(
      'S_INVOICE_TIMEOUT_MS',
      SINVOICE_API_DEFAULTS.TIMEOUT_MS,
    ),
    currencyCode: SINVOICE_API_DEFAULTS.CURRENCY_CODE,
    exchangeRate: SINVOICE_API_DEFAULTS.EXCHANGE_RATE,
    invoiceType: SINVOICE_API_DEFAULTS.INVOICE_TYPE,
    adjustmentType: SINVOICE_API_DEFAULTS.ADJUSTMENT_TYPE,
    paymentMethod: SINVOICE_API_DEFAULTS.PAYMENT_METHOD,
    defaultBuyerName: SINVOICE_API_DEFAULTS.DEFAULT_BUYER_NAME,
    defaultUnitName: SINVOICE_API_DEFAULTS.DEFAULT_UNIT_NAME,
  };
};

/**
 * Build invoice naming configuration
 * Xây dựng cấu hình đặt tên hóa đơn
 */
const buildInvoiceNameConfig = (): InvoiceNameConfig => ({
  prefix: INVOICE_NAME_DEFAULTS.PREFIX,
  maxLength: INVOICE_NAME_DEFAULTS.MAX_LENGTH,
});

/**
 * Build invoice file storage configuration
 * Xây dựng cấu hình lưu trữ file hóa đơn
 */
const buildInvoiceFileConfig = (): InvoiceFileConfig => ({
  fileType: INVOICE_FILE_DEFAULTS.FILE_TYPE,
  uploadPath: getEnvString(
    'FILE_UPLOAD_PATH',
    INVOICE_FILE_DEFAULTS.UPLOAD_PATH,
  ),
  downloadSecret: getEnvString(
    'FILE_DOWNLOAD_SECRET',
    INVOICE_FILE_DEFAULTS.DOWNLOAD_SECRET,
  ),
  downloadExpires: getEnvNumber(
    'FILE_DOWNLOAD_EXPIRES',
    INVOICE_FILE_DEFAULTS.DOWNLOAD_EXPIRES,
  ),
  serverUrl: getEnvString('SERVER_URL', 'http://localhost:3000'),
});

// ============================================
// MAIN CONFIG
// ============================================

/**
 * Invoice module configuration
 *
 * Registered with NestJS ConfigModule as 'invoice'
 * Đăng ký với NestJS ConfigModule với key 'invoice'
 *
 * @example
 * ```typescript
 * constructor(
 *   @Inject(invoiceConfig.KEY)
 *   private readonly config: InvoiceConfig,
 * ) {}
 *
 * // Access config
 * const taxCode = this.config.sInvoice.taxCode;
 * const invoicePrefix = this.config.naming.prefix;
 * ```
 */
export const invoiceConfig = registerAs(
  'invoice',
  (): InvoiceConfig => ({
    sInvoice: buildSInvoiceApiConfig(),
    naming: buildInvoiceNameConfig(),
    file: buildInvoiceFileConfig(),
  }),
);

/**
 * Config key for injection
 */
export const INVOICE_CONFIG_KEY = invoiceConfig.KEY;
