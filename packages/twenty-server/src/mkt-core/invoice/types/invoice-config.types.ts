/**
 * Invoice Configuration Types
 *
 * Type definitions for invoice module configuration
 * Định nghĩa kiểu cho cấu hình module hóa đơn
 */

/**
 * S-Invoice API configuration
 * Cấu hình API S-Invoice (Viettel e-invoice)
 */
export type SInvoiceApiConfig = {
  /** S-Invoice API base URL */
  baseUrl: string;

  /** Supplier tax code */
  taxCode: string;

  /** Invoice template code */
  templateCode: string;

  /** Invoice series code */
  invoiceSeries: string;

  /** API username for authentication */
  username: string;

  /** API password for authentication */
  password: string;

  /** Cookie token for authentication (optional) */
  cookieToken: string;

  /** Authorization header value */
  authorization: string;

  /** API request timeout in milliseconds */
  timeoutMs: number;

  /** Default currency code */
  currencyCode: string;

  /** Default exchange rate */
  exchangeRate: number;

  /** Default invoice type */
  invoiceType: string;

  /** Default adjustment type */
  adjustmentType: string;

  /** Default payment method name */
  paymentMethod: string;

  /** Default buyer name when not provided */
  defaultBuyerName: string;

  /** Default unit name for items */
  defaultUnitName: string;
};

/**
 * Invoice naming configuration
 * Cấu hình đặt tên hóa đơn
 */
export type InvoiceNameConfig = {
  /** Prefix for generated invoice names */
  prefix: string;

  /** Maximum length for order item name in invoice name */
  maxLength: number;
};

/**
 * Invoice file storage configuration
 * Cấu hình lưu trữ file hóa đơn
 */
export type InvoiceFileConfig = {
  /** Default file type (PDF, ZIP) */
  fileType: string;

  /** Upload directory path */
  uploadPath: string;

  /** Secret key for signed download URLs */
  downloadSecret: string;

  /** Expiration time for download URLs in seconds */
  downloadExpires: number;

  /** Server URL for generating download links */
  serverUrl: string;
};

/**
 * Complete invoice module configuration
 * Cấu hình đầy đủ module hóa đơn
 */
export type InvoiceConfig = {
  /** S-Invoice API configuration */
  sInvoice: SInvoiceApiConfig;

  /** Invoice naming configuration */
  naming: InvoiceNameConfig;

  /** Invoice file storage configuration */
  file: InvoiceFileConfig;
};
