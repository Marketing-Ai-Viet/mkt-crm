import { createModuleMessages } from 'src/mkt-core/common/messages';

// ============================================
// LOG CONTEXTS
// ============================================

export const MKT_PAYMENT_LOG_CONTEXT = 'MktPayment';
export const MKT_WEBHOOK_LOG_CONTEXT = 'MktWebhookLog';

// ============================================
// PAYMENT MESSAGES
// ============================================

export const MKT_PAYMENT_MESSAGES = createModuleMessages({
  entityName: 'Payment',
  entityNamePlural: 'Payments',
  customSuccess: {
    COMPLETED: 'Payment completed successfully',
    REFUNDED: 'Payment refunded successfully',
    PARTIALLY_REFUNDED: 'Payment partially refunded successfully',
    STATUS_UPDATED: 'Payment status updated successfully',
    WEBHOOK_PROCESSED: 'Webhook processed successfully',
    ORDER_MATCHED: 'Payment matched with order successfully',
  },
  customError: {
    ALREADY_PROCESSED: 'Payment has already been processed',
    ORDER_NOT_FOUND: 'Order not found for payment',
    AMOUNT_MISMATCH: 'Payment amount does not match order total',
    INVALID_STATUS_TRANSITION: 'Invalid payment status transition',
    WEBHOOK_FAILED: 'Failed to process webhook',
    EXPIRED: 'Payment has expired',
    NO_PAYMENT_METHOD: 'No payment method found',
  },
  customOperation: {
    FETCH_BY_ORDER: 'Fetch payments by order',
    FETCH_BY_TRANSACTION_ID: 'Fetch payment by transaction ID',
    PROCESS_WEBHOOK: 'Process webhook payment',
    GENERATE_QR: 'Generate QR code',
    UPDATE_STATUS: 'Update payment status',
  },
});

// ============================================
// WEBHOOK LOG MESSAGES
// ============================================

export const MKT_WEBHOOK_LOG_MESSAGES = createModuleMessages({
  entityName: 'Webhook Log',
  entityNamePlural: 'Webhook Logs',
  customSuccess: {
    LOGGED: 'Webhook logged successfully',
    STATUS_UPDATED: 'Webhook log status updated',
  },
  customError: {
    DUPLICATE_TRANSACTION: 'Duplicate transaction ID detected',
    LOGGING_FAILED: 'Failed to log webhook',
  },
  customOperation: {
    FIND_BY_TRANSACTION: 'Find webhook log by transaction ID',
    UPDATE_STATUS: 'Update webhook log status',
  },
});

// ============================================
// PAYMENT LOG MESSAGES
// ============================================

export const MKT_PAYMENT_LOG_MESSAGES = {
  // Find operations
  FIND_BY_ID_START: (paymentId: string) =>
    `Finding payment by ID: ${paymentId}`,
  FIND_BY_ID_SUCCESS: (paymentId: string) => `Payment found: ${paymentId}`,
  FIND_BY_ID_NOT_FOUND: (paymentId: string) =>
    `Payment not found: ${paymentId}`,
  FIND_BY_ORDER_START: (orderId: string) =>
    `Finding payments for order: ${orderId}`,
  FIND_BY_ORDER_SUCCESS: (orderId: string, count: number) =>
    `Found ${count} payments for order: ${orderId}`,
  FIND_BY_TRANSACTION_ID_START: (transactionId: string) =>
    `Finding payment by transaction ID: ${transactionId}`,
  FIND_BY_TRANSACTION_ID_SUCCESS: (transactionId: string) =>
    `Payment found by transaction ID: ${transactionId}`,
  FIND_BY_TRANSACTION_ID_NOT_FOUND: (transactionId: string) =>
    `Payment not found by transaction ID: ${transactionId}`,

  // Create operations
  CREATE_START: () => `Creating new payment`,
  CREATE_SUCCESS: (paymentId: string) => `Payment created: ${paymentId}`,
  CREATE_FAILED: (error: string) => `Failed to create payment: ${error}`,

  // Update operations
  UPDATE_START: (paymentId: string) => `Updating payment: ${paymentId}`,
  UPDATE_SUCCESS: (paymentId: string) => `Payment updated: ${paymentId}`,
  UPDATE_FAILED: (paymentId: string, error: string) =>
    `Failed to update payment ${paymentId}: ${error}`,
  STATUS_UPDATE_START: (paymentId: string, status: string) =>
    `Updating payment ${paymentId} status to: ${status}`,
  STATUS_UPDATE_SUCCESS: (paymentId: string, status: string) =>
    `Payment ${paymentId} status updated to: ${status}`,

  // Delete operations
  DELETE_START: (paymentId: string) => `Deleting payment: ${paymentId}`,
  DELETE_SUCCESS: (paymentId: string) => `Payment deleted: ${paymentId}`,

  // Webhook operations
  WEBHOOK_RECEIVED: (transactionId: number) =>
    `Webhook received for transaction: ${transactionId}`,
  WEBHOOK_PROCESSING: (transactionId: number) =>
    `Processing webhook for transaction: ${transactionId}`,
  WEBHOOK_COMPLETED: (transactionId: number) =>
    `Webhook completed for transaction: ${transactionId}`,
  WEBHOOK_FAILED: (transactionId: number, error: string) =>
    `Webhook failed for transaction ${transactionId}: ${error}`,
} as const;

// ============================================
// WEBHOOK LOG MESSAGES
// ============================================

// ============================================
// SEPAY AUTH MESSAGES
// ============================================

export const SEPAY_AUTH_MESSAGES = {
  ERROR: {
    API_KEY_NOT_CONFIGURED: 'SEPAY_WEBHOOK_API_KEY not configured',
    AUTHORIZATION_REQUIRED: 'Authorization header is required',
    INVALID_AUTH_FORMAT: 'Authorization header must start with "Apikey "',
    API_KEY_REQUIRED: 'API key is required',
    INVALID_API_KEY: 'Invalid API key',
  },
  LOG: {
    VALIDATION_SUCCESS: 'API key validation successful',
    INVALID_API_KEY: 'Invalid API key provided',
  },
} as const;

// ============================================
// SEPAY QR MESSAGES
// ============================================

export const SEPAY_QR_MESSAGES = {
  LOG: {
    GENERATING: 'Generating SEPay QR code...',
    GENERATED_SEPAY: (orderCode: string, amount: number) =>
      `Generated SEPay QR URL for order ${orderCode} with amount ${amount}`,
    GENERATED_BIDV: (orderCode: string, orderId: string) =>
      `Generated BIDV SEPay QR for order ${orderCode}, order_id: ${orderId}`,
    CALLING_BIDV: (orderCode: string, amount: number) =>
      `Calling BIDV SEPay API for order ${orderCode} with amount ${amount}`,
  },
  WARN: {
    NOT_SEPAY_METHOD:
      'Payment method is not SEPay type, skipping QR generation',
    SEPAY_NOT_CONFIGURED: 'SEPay account or bank not configured',
    NO_ORDER_CODE: 'No order code provided for QR generation',
    INVALID_AMOUNT: 'Invalid amount for QR generation',
    BIDV_NOT_CONFIGURED: 'BIDV SEPay API URL or Auth Token not configured',
  },
  ERROR: {
    GENERATE_FAILED: 'Error generating SEPay QR code',
    BIDV_API_ERROR: (message: string) => `BIDV SEPay API error: ${message}`,
    BIDV_API_CALL_FAILED: 'Error calling BIDV SEPay API',
  },
} as const;

// ============================================
// SEPAY QR PAGE MESSAGES
// ============================================

export const SEPAY_QR_PAGE_MESSAGES = {
  LOG: {
    FETCHING_QR: (orderCode: string) =>
      `Fetching payment QR for order: ${orderCode}`,
    PAGE_GENERATED: (orderCode: string) =>
      `Generated payment page for order ${orderCode}`,
    DATE_FORMAT_ERROR: 'Error formatting expired_at',
  },
  ERROR: {
    WORKSPACE_NOT_CONFIGURED: 'Workspace not configured',
    ORDER_NOT_FOUND: (orderCode: string) => `Order ${orderCode} not found`,
    NO_PAYMENTS: (orderCode: string) =>
      `No payments found for order ${orderCode}`,
    TEMPLATE_NOT_FOUND: 'Payment template not found',
  },
} as const;

// ============================================
// WEBHOOK LOG DETAIL MESSAGES
// ============================================

export const MKT_WEBHOOK_LOG_LOG_MESSAGES = {
  // Find operations
  FIND_BY_ID_START: (logId: string) => `Finding webhook log by ID: ${logId}`,
  FIND_BY_ID_SUCCESS: (logId: string) => `Webhook log found: ${logId}`,
  FIND_BY_ID_NOT_FOUND: (logId: string) => `Webhook log not found: ${logId}`,
  FIND_BY_TRANSACTION_ID_START: (transactionId: number) =>
    `Finding webhook log by transaction ID: ${transactionId}`,
  FIND_BY_TRANSACTION_ID_SUCCESS: (transactionId: number) =>
    `Webhook log found by transaction ID: ${transactionId}`,
  FIND_BY_TRANSACTION_ID_NOT_FOUND: (transactionId: number) =>
    `Webhook log not found by transaction ID: ${transactionId}`,
  FIND_BY_ORDER_CODE_START: (orderCode: string) =>
    `Finding webhook logs by order code: ${orderCode}`,
  FIND_BY_ORDER_CODE_SUCCESS: (orderCode: string, count: number) =>
    `Found ${count} webhook logs for order code: ${orderCode}`,

  // Create operations
  CREATE_START: (transactionId: number) =>
    `Creating webhook log for transaction: ${transactionId}`,
  CREATE_SUCCESS: (logId: string) => `Webhook log created: ${logId}`,
  CREATE_FAILED: (error: string) => `Failed to create webhook log: ${error}`,

  // Update operations
  UPDATE_STATUS_START: (logId: string, status: string) =>
    `Updating webhook log ${logId} status to: ${status}`,
  UPDATE_STATUS_SUCCESS: (logId: string, status: string) =>
    `Webhook log ${logId} status updated to: ${status}`,
  UPDATE_STATUS_FAILED: (logId: string, error: string) =>
    `Failed to update webhook log ${logId} status: ${error}`,
} as const;
