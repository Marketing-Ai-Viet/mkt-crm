/**
 * Centralized Messages for Invoice Module
 * Following MKT_CRM_Backend_Implementation_Guide pattern
 */

export const MKT_INVOICE_LOG_CONTEXT = 'MktInvoice';

export const INVOICE_MESSAGES = {
  LOG: {
    // Repository operations
    FIND_BY_ID_START: (invoiceId: string) =>
      `Finding invoice by ID: ${invoiceId}`,
    FIND_BY_ID_SUCCESS: (invoiceId: string) => `Found invoice: ${invoiceId}`,
    FIND_BY_ID_NOT_FOUND: (invoiceId: string) =>
      `Invoice not found: ${invoiceId}`,
    FIND_ALL_START: (workspaceId: string) =>
      `Finding all invoices for workspace: ${workspaceId}`,
    FIND_ALL_SUCCESS: (count: number) => `Found ${count} invoices`,

    // Create operations
    CREATE_START: (orderId: string) => `Creating invoice for order: ${orderId}`,
    CREATE_SUCCESS: (invoiceId: string) =>
      `Successfully created invoice: ${invoiceId}`,
    GENERATE_NAME_SUCCESS: (name: string) => `Generated invoice name: ${name}`,

    // Update operations
    UPDATE_START: (invoiceId: string) => `Updating invoice: ${invoiceId}`,
    UPDATE_SUCCESS: (invoiceId: string) =>
      `Successfully updated invoice: ${invoiceId}`,
    SOFT_DELETE_SUCCESS: (invoiceId: string) =>
      `Soft deleted invoice: ${invoiceId}`,

    // S-Invoice integration
    SINVOICE_CREATE_START: (orderId: string) =>
      `Creating S-Invoice for order: ${orderId}`,
    SINVOICE_CREATE_SUCCESS: (invoiceNo: string) =>
      `Successfully created S-Invoice: ${invoiceNo}`,
    SINVOICE_SYNC_START: (invoiceId: string) =>
      `Syncing S-Invoice: ${invoiceId}`,
    SINVOICE_SYNC_SUCCESS: (invoiceId: string) =>
      `Successfully synced S-Invoice: ${invoiceId}`,

    // File operations
    FILE_DOWNLOAD_START: (invoiceNo: string) =>
      `Downloading invoice file: ${invoiceNo}`,
    FILE_DOWNLOAD_SUCCESS: (invoiceNo: string, fileName: string) =>
      `Successfully downloaded invoice file ${invoiceNo}: ${fileName}`,
    FILE_UPLOAD_SUCCESS: (fileId: string) =>
      `Successfully uploaded invoice file: ${fileId}`,

    // Hook operations
    PRE_QUERY_HOOK_START: (operation: string) =>
      `Starting pre-query hook for: ${operation}`,
    POST_QUERY_HOOK_START: (operation: string) =>
      `Starting post-query hook for: ${operation}`,
  },

  WARN: {
    // Order warnings
    ORDER_NOT_FOUND: (orderId: string) =>
      `Order ${orderId} not found for invoice creation`,
    ORDER_NO_ITEMS: (orderId: string) =>
      `Order ${orderId} has no items for invoice`,
    ORDER_ALREADY_HAS_INVOICE: (orderId: string) =>
      `Order ${orderId} already has an invoice`,

    // S-Invoice warnings
    SINVOICE_NOT_CONFIGURED: 'S-Invoice integration not configured',
    SINVOICE_AUTH_EXPIRED: 'S-Invoice authentication expired',
    SINVOICE_RATE_LIMITED: 'S-Invoice API rate limited, retrying later',

    // File warnings
    FILE_NOT_FOUND: (invoiceNo: string) =>
      `Invoice file not found: ${invoiceNo}`,
    FILE_DOWNLOAD_SKIPPED: (reason: string) =>
      `Invoice file download skipped: ${reason}`,

    // General warnings
    NO_INVOICES_FOUND: 'No invoices found for the given criteria',
  },

  ERROR: {
    // General errors
    INVOICE_NOT_FOUND: (invoiceId: string) => `Invoice not found: ${invoiceId}`,
    CREATE_FAILED: (orderId: string) =>
      `Failed to create invoice for order: ${orderId}`,
    UPDATE_FAILED: (invoiceId: string) =>
      `Failed to update invoice: ${invoiceId}`,
    GENERATE_NAME_FAILED: (orderId: string) =>
      `Failed to generate invoice name for order: ${orderId}`,

    // S-Invoice errors
    SINVOICE_CREATE_FAILED: (orderId: string) =>
      `Failed to create S-Invoice for order: ${orderId}`,
    SINVOICE_SYNC_FAILED: (invoiceId: string) =>
      `Failed to sync S-Invoice: ${invoiceId}`,
    SINVOICE_AUTH_FAILED: 'Failed to authenticate with S-Invoice',
    SINVOICE_API_ERROR: (errorCode: string, message: string) =>
      `S-Invoice API error [${errorCode}]: ${message}`,

    // File errors
    FILE_DOWNLOAD_FAILED: (invoiceNo: string) =>
      `Failed to download invoice file: ${invoiceNo}`,
    FILE_UPLOAD_FAILED: (invoiceId: string) =>
      `Failed to upload invoice file: ${invoiceId}`,
    FILE_INVALID_FORMAT: (format: string) =>
      `Invalid invoice file format: ${format}`,

    // Validation errors
    INVALID_INVOICE_DATA: 'Invalid invoice data provided',
    MISSING_REQUIRED_FIELDS: (fields: string) =>
      `Missing required fields: ${fields}`,
    INVALID_TAX_CODE: (taxCode: string) =>
      `Invalid tax code format: ${taxCode}`,

    // Repository errors
    WORKSPACE_NOT_FOUND: 'Workspace ID not found in context',
    REPOSITORY_NOT_FOUND: 'Repository not found for workspace',

    // Order item errors
    ORDER_ITEMS_FETCH_FAILED: (orderId: string) =>
      `Failed to fetch order items for: ${orderId}`,
  },

  INFO: {
    INVOICE_CREATED: (invoiceNo: string) =>
      `Invoice ${invoiceNo} has been created`,
    INVOICE_SENT: (invoiceNo: string) =>
      `Invoice ${invoiceNo} has been sent to customer`,
    INVOICE_PAID: (invoiceNo: string) =>
      `Invoice ${invoiceNo} has been marked as paid`,
    FILE_READY: (invoiceNo: string) =>
      `Invoice file for ${invoiceNo} is ready for download`,
  },
} as const;
