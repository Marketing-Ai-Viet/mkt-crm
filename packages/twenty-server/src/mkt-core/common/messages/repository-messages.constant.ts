/**
 * Repository Messages - Common messages for all repositories
 * Reusable across mkt-core modules to avoid duplication
 */

// =============================================================================
// REPOSITORY ERROR MESSAGES
// =============================================================================

export const REPOSITORY_ERROR_MESSAGES = {
  /** Workspace not found in context */
  WORKSPACE_NOT_FOUND: 'Workspace not found in context',

  /** Repository not found for workspace */
  REPOSITORY_NOT_FOUND: 'Repository not found for workspace',

  /** Entity not found by ID */
  ENTITY_NOT_FOUND: (entityName: string, id: string) =>
    `${entityName} not found: ${id}`,

  /** Entity not found by code */
  ENTITY_NOT_FOUND_BY_CODE: (entityName: string, code: string) =>
    `${entityName} not found with code: ${code}`,

  /** Entity already exists */
  ENTITY_ALREADY_EXISTS: (entityName: string, identifier: string) =>
    `${entityName} already exists: ${identifier}`,

  /** Invalid ID format */
  INVALID_ID: (entityName: string, id: string) =>
    `Invalid ${entityName} ID: ${id}`,

  /** Bulk operation failed */
  BULK_OPERATION_FAILED: (entityName: string, operation: string) =>
    `Bulk ${operation} failed for ${entityName}`,

  /** Transaction failed */
  TRANSACTION_FAILED: (operation: string) =>
    `Transaction failed during ${operation}`,
} as const;

// =============================================================================
// REPOSITORY LOG MESSAGES
// =============================================================================

export const REPOSITORY_LOG_MESSAGES = {
  // Find operations
  FIND_BY_ID_START: (entityName: string, id: string) =>
    `Finding ${entityName} by ID: ${id}`,
  FIND_BY_ID_SUCCESS: (entityName: string, id: string) =>
    `Found ${entityName}: ${id}`,
  FIND_BY_ID_NOT_FOUND: (entityName: string, id: string) =>
    `${entityName} not found: ${id}`,
  FIND_ALL_START: (entityName: string, workspaceId: string) =>
    `Finding all ${entityName} for workspace: ${workspaceId}`,
  FIND_ALL_SUCCESS: (entityName: string, count: number) =>
    `Found ${count} ${entityName}`,

  // Create operations
  CREATE_START: (entityName: string) => `Creating ${entityName}`,
  CREATE_SUCCESS: (entityName: string, id: string) =>
    `Created ${entityName}: ${id}`,
  BULK_CREATE_START: (entityName: string, count: number) =>
    `Bulk creating ${count} ${entityName}`,
  BULK_CREATE_SUCCESS: (entityName: string, count: number) =>
    `Bulk created ${count} ${entityName}`,

  // Update operations
  UPDATE_START: (entityName: string, id: string) =>
    `Updating ${entityName}: ${id}`,
  UPDATE_SUCCESS: (entityName: string, id: string) =>
    `Updated ${entityName}: ${id}`,
  BULK_UPDATE_START: (entityName: string, count: number) =>
    `Bulk updating ${count} ${entityName}`,
  BULK_UPDATE_SUCCESS: (entityName: string, count: number) =>
    `Bulk updated ${count} ${entityName}`,

  // Delete operations
  SOFT_DELETE_START: (entityName: string, id: string) =>
    `Soft deleting ${entityName}: ${id}`,
  SOFT_DELETE_SUCCESS: (entityName: string, id: string) =>
    `Soft deleted ${entityName}: ${id}`,
  HARD_DELETE_START: (entityName: string, id: string) =>
    `Hard deleting ${entityName}: ${id}`,
  HARD_DELETE_SUCCESS: (entityName: string, id: string) =>
    `Hard deleted ${entityName}: ${id}`,
  BULK_DELETE_START: (entityName: string, count: number) =>
    `Bulk deleting ${count} ${entityName}`,
  BULK_DELETE_SUCCESS: (entityName: string, count: number) =>
    `Bulk deleted ${count} ${entityName}`,

  // Count operations
  COUNT_START: (entityName: string) => `Counting ${entityName}`,
  COUNT_SUCCESS: (entityName: string, count: number) =>
    `Counted ${count} ${entityName}`,
} as const;

// =============================================================================
// REPOSITORY WARNING MESSAGES
// =============================================================================

export const REPOSITORY_WARNING_MESSAGES = {
  /** No records found */
  NO_RECORDS_FOUND: (entityName: string) => `No ${entityName} records found`,

  /** Partial bulk operation */
  PARTIAL_BULK_SUCCESS: (entityName: string, success: number, total: number) =>
    `Partial success: ${success}/${total} ${entityName} operations completed`,

  /** Stale data detected */
  STALE_DATA: (entityName: string, id: string) =>
    `Stale ${entityName} data detected: ${id}`,
} as const;

// =============================================================================
// COMBINED REPOSITORY MESSAGES
// =============================================================================

export const REPOSITORY_MESSAGES = {
  ERROR: REPOSITORY_ERROR_MESSAGES,
  LOG: REPOSITORY_LOG_MESSAGES,
  WARNING: REPOSITORY_WARNING_MESSAGES,
} as const;
