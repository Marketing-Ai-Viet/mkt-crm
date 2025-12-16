/**
 * Base Messages - Message templates có thể extend và tùy biến
 * Sử dụng placeholder {entity} để thay thế tên entity
 */

// =============================================================================
// BASE SUCCESS MESSAGES
// =============================================================================

export const BASE_SUCCESS_MESSAGES = {
  CREATED: '{entity} created successfully',
  UPDATED: '{entity} updated successfully',
  DELETED: '{entity} deleted successfully',
  RETRIEVED: '{entity} retrieved successfully',
  LIST_RETRIEVED: '{entity} list retrieved successfully',
  BULK_CREATED: '{count} {entity} created successfully',
  BULK_UPDATED: '{count} {entity} updated successfully',
  BULK_DELETED: '{count} {entity} deleted successfully',
  ACTIVATED: '{entity} activated successfully',
  DEACTIVATED: '{entity} deactivated successfully',
  VALIDATED: '{entity} validated successfully',
  EXPORTED: '{entity} exported successfully',
  IMPORTED: '{entity} imported successfully',
  SYNCED: '{entity} synced successfully',
  PROCESSED: '{entity} processed successfully',
  COMPLETED: '{entity} completed successfully',
  CONFIRMED: '{entity} confirmed successfully',
  CANCELLED: '{entity} cancelled successfully',
  APPROVED: '{entity} approved successfully',
  REJECTED: '{entity} rejected successfully',
} as const;

export type BaseSuccessMessageKey = keyof typeof BASE_SUCCESS_MESSAGES;
export type BaseSuccessMessageValue =
  (typeof BASE_SUCCESS_MESSAGES)[BaseSuccessMessageKey];

// =============================================================================
// BASE ERROR MESSAGES
// =============================================================================

export const BASE_ERROR_MESSAGES = {
  // CRUD errors
  CREATE_FAILED: 'Failed to create {entity}',
  UPDATE_FAILED: 'Failed to update {entity}',
  DELETE_FAILED: 'Failed to delete {entity}',
  FETCH_FAILED: 'Failed to fetch {entity}',
  NOT_FOUND: '{entity} not found',
  ALREADY_EXISTS: '{entity} already exists',

  // Validation errors
  VALIDATION_FAILED: '{entity} validation failed',
  INVALID_DATA: 'Invalid {entity} data',
  INVALID_ID: 'Invalid {entity} ID',
  INVALID_STATUS: 'Invalid {entity} status',
  INVALID_FORMAT: 'Invalid {entity} format',

  // Bulk operation errors
  BULK_CREATE_FAILED: 'Failed to bulk create {entity}',
  BULK_UPDATE_FAILED: 'Failed to bulk update {entity}',
  BULK_DELETE_FAILED: 'Failed to bulk delete {entity}',
  PARTIAL_BULK_FAILED: '{failed} of {total} {entity} operations failed',

  // Permission errors
  UNAUTHORIZED: 'Unauthorized access to {entity}',
  FORBIDDEN: 'Access to {entity} is forbidden',

  // Status errors
  ACTIVATE_FAILED: 'Failed to activate {entity}',
  DEACTIVATE_FAILED: 'Failed to deactivate {entity}',
  STATUS_CHANGE_FAILED: 'Failed to change {entity} status',

  // Business logic errors
  PROCESS_FAILED: 'Failed to process {entity}',
  EXPORT_FAILED: 'Failed to export {entity}',
  IMPORT_FAILED: 'Failed to import {entity}',
  SYNC_FAILED: 'Failed to sync {entity}',

  // Constraint errors
  DEPENDENCY_EXISTS: 'Cannot delete {entity} - dependencies exist',
  CONSTRAINT_VIOLATION: '{entity} constraint violation',

  // System errors
  INTERNAL_ERROR: 'Internal error while processing {entity}',
  TIMEOUT_ERROR: '{entity} operation timed out',
  CONNECTION_ERROR: 'Connection error while processing {entity}',
} as const;

export type BaseErrorMessageKey = keyof typeof BASE_ERROR_MESSAGES;
export type BaseErrorMessageValue =
  (typeof BASE_ERROR_MESSAGES)[BaseErrorMessageKey];

// =============================================================================
// BASE OPERATION MESSAGES (for logging)
// =============================================================================

export const BASE_OPERATION_MESSAGES = {
  CREATE: 'Create {entity}',
  UPDATE: 'Update {entity}',
  DELETE: 'Delete {entity}',
  FETCH_BY_ID: 'Fetch {entity} by ID',
  FETCH_ALL: 'Fetch all {entity}',
  BULK_CREATE: 'Bulk create {entity}',
  BULK_UPDATE: 'Bulk update {entity}',
  BULK_DELETE: 'Bulk delete {entity}',
  VALIDATE: 'Validate {entity}',
  ACTIVATE: 'Activate {entity}',
  DEACTIVATE: 'Deactivate {entity}',
  EXPORT: 'Export {entity}',
  IMPORT: 'Import {entity}',
  SYNC: 'Sync {entity}',
  PROCESS: 'Process {entity}',
} as const;

export type BaseOperationMessageKey = keyof typeof BASE_OPERATION_MESSAGES;
export type BaseOperationMessageValue =
  (typeof BASE_OPERATION_MESSAGES)[BaseOperationMessageKey];

// =============================================================================
// BASE WARNING MESSAGES
// =============================================================================

export const BASE_WARNING_MESSAGES = {
  DEPRECATED: '{entity} is deprecated',
  EXPIRING_SOON: '{entity} is expiring soon',
  QUOTA_NEAR_LIMIT: '{entity} quota is near limit',
  PERFORMANCE_DEGRADED: '{entity} performance is degraded',
  PARTIAL_SUCCESS: '{entity} operation partially successful',
  DATA_INCONSISTENCY: '{entity} data inconsistency detected',
} as const;

export type BaseWarningMessageKey = keyof typeof BASE_WARNING_MESSAGES;
export type BaseWarningMessageValue =
  (typeof BASE_WARNING_MESSAGES)[BaseWarningMessageKey];

// =============================================================================
// BASE INFO MESSAGES
// =============================================================================

export const BASE_INFO_MESSAGES = {
  PROCESSING: '{entity} is being processed',
  QUEUED: '{entity} has been queued',
  IN_PROGRESS: '{entity} operation in progress',
  NO_CHANGES: 'No changes detected for {entity}',
  NO_RECORDS: 'No {entity} records found',
  ALREADY_PROCESSED: '{entity} has already been processed',
} as const;

export type BaseInfoMessageKey = keyof typeof BASE_INFO_MESSAGES;
export type BaseInfoMessageValue =
  (typeof BASE_INFO_MESSAGES)[BaseInfoMessageKey];

// =============================================================================
// COMBINED BASE MESSAGES
// =============================================================================

export const BASE_MESSAGES = {
  SUCCESS: BASE_SUCCESS_MESSAGES,
  ERROR: BASE_ERROR_MESSAGES,
  OPERATION: BASE_OPERATION_MESSAGES,
  WARNING: BASE_WARNING_MESSAGES,
  INFO: BASE_INFO_MESSAGES,
} as const;
