/**
 * Invoice Module Types
 * Centralized type definitions for Invoice module
 */

// Re-export enums and options from constants for convenience
export {
  SINVOICE_FILE_STATUS,
  SINVOICE_FILE_STATUS_OPTIONS,
  SINVOICE_FILE_TYPE,
  SINVOICE_FILE_TYPE_OPTIONS,
} from 'src/mkt-core/invoice/constants';

// ============================================
// REPOSITORY TYPES
// ============================================

// Options for finding invoices
export type FindInvoiceOptions = {
  take?: number;
  skip?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
};

// Options for finding with limit/offset
export type FindWithPaginationOptions = {
  limit?: number;
  offset?: number;
};

// Status distribution statistics
export type StatusDistributionItem = {
  status: string;
  count: number;
};

// ============================================
// S-INVOICE API TYPES
// ============================================

// Response from create invoice API
export type CreateInvoiceResponse = {
  transactionUuid?: string;
  invoiceNo?: string;
  message?: string;
  result: unknown;
  [key: string]: unknown;
};

// S-Invoice entity type (used for GraphQL input/output)
export type SInvoiceType = {
  id?: string;
  name?: string;
  amount?: string;
  status?: string;
  vat?: number;
  totalAmount?: number;
  sInvoiceCode?: string;
  sentAt?: string;
  supplierTaxCode?: string | null;
  invoiceType?: string;
  templateCode?: string;
  invoiceSeries?: string;
  invoiceNo?: string;
  transactionUuid?: string;
  issueDate?: string;
  totalWithoutTax?: number;
  totalTax?: number;
  totalWithTax?: number;
  taxInWords?: string;
  mktOrderId?: string;
};

// S-Invoice update data
export type SInvoiceUpdate = {
  errorCode?: string | null;
  description?: string | null;
  supplierTaxCode?: string | null;
  invoiceNo?: string | null;
  transactionID?: string | null;
  reservationCode?: string | null;
  codeOfTax?: string | null;
  errorMessage?: string | null;
  errorData?: string | null;
  orderSInvoiceStatus?: string | null;
};

// S-Invoice payload for API request
export type SInvoicePayload = {
  generalInvoiceInfo: {
    invoiceType: string;
    templateCode: string;
    invoiceSeries: string;
    currencyCode: string;
    exchangeRate: number;
    adjustmentType: string;
    paymentStatus: boolean;
    cusGetInvoiceRight: boolean;
    invoiceIssuedDate: number | null;
    transactionUuid: string | null;
  };
  buyerInfo: {
    buyerName: string;
    buyerLegalName: string | null;
    buyerTaxCode: string | null;
    buyerAddressLine: string;
    buyerPhoneNumber: string | null;
    buyerEmail: string | null;
    buyerIdNo: string | null;
    buyerIdType: string | null;
    buyerNotGetInvoice: string;
  };
  payments: {
    paymentMethodName: string;
  }[];
  itemInfo: {
    lineNumber: number;
    selection: number;
    itemCode: string | null;
    itemName: string;
    unitName: string | null;
    quantity: number | null;
    unitPrice: number | null;
    itemTotalAmountWithoutTax: number | null;
    itemTotalAmountAfterDiscount: number | null;
    itemTotalAmountWithTax: number | null;
    taxPercentage: number | null;
    taxAmount: number | null;
    discount: number | null;
    itemDiscount: number | null;
    itemNote: string | null;
    isIncreaseItem: boolean | null;
  }[];
  taxBreakdowns: {
    taxPercentage: number;
    taxableAmount: number;
    taxAmount: number;
  }[];
  summarizeInfo: {
    sumOfTotalLineAmountWithoutTax: number;
    totalAmountAfterDiscount: number;
    totalAmountWithoutTax: number;
    totalTaxAmount: number;
    totalAmountWithTax: number;
    totalAmountWithTaxInWords: string | null;
    discountAmount: number;
  };
  metadata: {
    keyTag: string;
    stringValue: string;
    valueType: string;
    keyLabel: string;
  }[];
};

// ============================================
// S-INVOICE FILE TYPES
// ============================================

// Response from get invoice file API
export type GetInvoiceFileResponse = {
  errorCode: number;
  description: string | null;
  fileToBytes: string; // Base64 encoded PDF content
  fileName?: string;
  paymentStatus?: boolean;
};

// Request for get invoice file API
export type GetInvoiceFileRequest = {
  supplierTaxCode: string;
  invoiceNo: string;
  templateCode: string;
  fileType: string; // "PDF"
};

// ============================================
// BACKWARD COMPATIBILITY ALIASES (lowercase)
// ============================================
// Note: Giữ lại để tương thích với code cũ, nên sử dụng PascalCase version

/** @deprecated Use SInvoiceType instead */
export type sInvoiceType = SInvoiceType;

/** @deprecated Use SInvoiceUpdate instead */
export type sInvoiceUpdate = SInvoiceUpdate;

/** @deprecated Use SInvoicePayload instead */
export type sInvoicePayload = SInvoicePayload;
