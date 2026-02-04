/**
 * Export Audit Constants
 *
 * Constants for audit logging of export operations.
 * Used to track export activities for compliance and security.
 */

// ============================================
// EXPORT AUDIT ACTIONS
// ============================================

export const EXPORT_AUDIT_ACTION = {
  EXPORT_ORDERS: 'EXPORT_ORDERS',
  EXPORT_ORDERS_ASYNC: 'EXPORT_ORDERS_ASYNC',
  EXPORT_ORDER_DETAIL: 'EXPORT_ORDER_DETAIL',
  EXPORT_CUSTOMERS: 'EXPORT_CUSTOMERS',
  EXPORT_LICENSES: 'EXPORT_LICENSES',
} as const;

export type ExportAuditAction =
  (typeof EXPORT_AUDIT_ACTION)[keyof typeof EXPORT_AUDIT_ACTION];

// ============================================
// EXPORT JOB STATUS
// ============================================

export const EXPORT_JOB_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type ExportJobStatus =
  (typeof EXPORT_JOB_STATUS)[keyof typeof EXPORT_JOB_STATUS];

// ============================================
// PII COLUMNS DEFINITIONS
// ============================================

/**
 * PII columns that require special permission to export
 * These columns contain personally identifiable information
 */
export const PII_COLUMNS = [
  'customerEmail',
  'customerPhone',
  'customerAddress',
  'taxCode',
] as const;

export type PiiColumn = (typeof PII_COLUMNS)[number];

// ============================================
// EXPORT PERMISSION CONSTANTS
// ============================================

export const EXPORT_PERMISSION = {
  /** Permission required to export PII data */
  EXPORT_PII: 'export:pii',

  /** Permission required to use async export (large datasets) */
  EXPORT_ASYNC: 'export:async',

  /** Resource name for export operations */
  RESOURCE_NAME: 'export',
} as const;

// ============================================
// ASYNC EXPORT CONFIGURATION
// ============================================

export const ASYNC_EXPORT_CONFIG = {
  /** Queue name for export jobs */
  QUEUE_NAME: 'excel-export',

  /** Job name for export processing */
  JOB_NAME: 'process-export',

  /** Download URL expiry time in seconds (24 hours) */
  DOWNLOAD_URL_EXPIRY_SECONDS: 24 * 60 * 60,

  /** Maximum concurrent export jobs per workspace */
  MAX_CONCURRENT_JOBS_PER_WORKSPACE: 3,

  /** Job timeout in milliseconds (30 minutes) */
  JOB_TIMEOUT_MS: 30 * 60 * 1000,

  /** Job retry attempts */
  JOB_RETRY_ATTEMPTS: 2,
} as const;

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

export const EXPORT_RATE_LIMIT = {
  /** Maximum requests per minute for sync export */
  SYNC_REQUESTS_PER_MINUTE: 10,

  /** Maximum requests per hour for async export */
  ASYNC_REQUESTS_PER_HOUR: 20,

  /** TTL for rate limit window in milliseconds */
  TTL_MS: 60 * 1000,
} as const;
