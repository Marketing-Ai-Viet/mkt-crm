import { z } from 'zod';

/**
 * Invoice Environment Variables Validation Schema
 *
 * Uses Zod to validate environment variables for invoice module
 * Sử dụng Zod để xác thực các biến môi trường cho module hóa đơn
 */
export const invoiceEnvValidation = z.object({
  // S-Invoice API configuration
  /** S-Invoice API base URL */
  S_INVOICE_BASE_URL: z.string().url().optional(),

  /** Supplier tax code for S-Invoice */
  S_INVOICE_TAX_CODE: z.string().optional(),

  /** Invoice template code */
  S_INVOICE_TEMPLATE_CODE: z.string().optional(),

  /** Invoice series code */
  S_INVOICE_SERIES: z.string().optional(),

  /** S-Invoice API username */
  S_INVOICE_USERNAME: z.string().optional(),

  /** S-Invoice API password */
  S_INVOICE_PASSWORD: z.string().optional(),

  /** S-Invoice cookie token for authentication */
  S_INVOICE_COOKIE: z.string().optional(),

  /** S-Invoice authorization header value */
  S_INVOICE_AUTHORIZATION: z.string().optional(),

  // File storage configuration
  /** Path for storing invoice files */
  FILE_UPLOAD_PATH: z.string().optional(),

  /** Secret key for generating signed download URLs */
  FILE_DOWNLOAD_SECRET: z.string().optional(),

  /** Expiration time for download URLs in seconds */
  FILE_DOWNLOAD_EXPIRES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .optional(),

  // Server configuration
  /** Server URL for generating download links */
  SERVER_URL: z.string().url().optional(),
});

export type InvoiceEnvValidation = z.infer<typeof invoiceEnvValidation>;
