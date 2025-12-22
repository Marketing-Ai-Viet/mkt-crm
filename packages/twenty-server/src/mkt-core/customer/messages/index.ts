/**
 * Centralized Messages for Customer Module
 * Following MKT_CRM_Backend_Implementation_Guide pattern
 */

export const MKT_CUSTOMER_LOG_CONTEXT = 'MktCustomer';

export const CUSTOMER_MESSAGES = {
  LOG: {
    // Tier operations
    TIER_STATS_START: (workspaceId: string) =>
      `Getting tier statistics for workspace: ${workspaceId}`,
    TIER_UPDATE_START: (customerId: string) =>
      `Updating tier for customer: ${customerId}`,
    TIER_UPDATE_COMPLETE: (customerId: string, tier: string) =>
      `Customer ${customerId} tier updated to: ${tier}`,
    TIER_CHANGED: (customerId: string, oldTier: string, newTier: string) =>
      `Customer ${customerId} tier changed: ${oldTier} → ${newTier}`,

    // Batch operations
    BATCH_PROCESS_START: (batchNumber: number, count: number) =>
      `Processing batch ${batchNumber}: ${count} customers`,
    BATCH_PROCESS_COMPLETE: (total: number) =>
      `Completed updating ${total} customer tiers`,

    // Export operations
    EXPORT_START: (workspaceId: string) =>
      `Starting customer export for workspace: ${workspaceId}`,
    EXPORT_COMPLETE: (count: number) =>
      `Export completed: ${count} records exported`,

    // Event processing
    CUSTOMER_CREATED_PROCESSED: (customerId: string) =>
      `Customer created event processed: ${customerId}`,

    // Categorization
    CATEGORIZATION_START: (workspaceId: string) =>
      `Starting categorization for workspace: ${workspaceId}`,
    CATEGORIZATION_COMPLETE: (processed: number, updated: number) =>
      `Categorization complete: ${processed} processed, ${updated} updated`,

    // Auto-assign
    CUSTOMER_ASSIGNED: (customerId: string, salesId: string) =>
      `Customer ${customerId} assigned to sales ${salesId}`,
    CUSTOMER_PRE_CREATE: (email: string) =>
      `Pre-create validation for customer: ${email}`,

    // Repository operations
    FIND_BY_ID_START: (customerId: string) =>
      `Finding customer by ID: ${customerId}`,
    FIND_BY_ID_SUCCESS: (customerId: string) => `Found customer: ${customerId}`,
    FIND_BY_ID_NOT_FOUND: (customerId: string) =>
      `Customer not found: ${customerId}`,
    FIND_ALL_START: (workspaceId: string) =>
      `Finding all customers for workspace: ${workspaceId}`,
    FIND_ALL_SUCCESS: (count: number) => `Found ${count} customers`,
  },

  WARN: {
    MISSING_WORKSPACE_ID: 'Workspace ID not found in event payload',
    NO_CUSTOMERS_FOUND: 'No customers found for the given criteria',
    NO_SALES_AVAILABLE: 'No sales members available for auto-assignment',
    CUSTOMER_HAS_NO_EMAIL: (customerId: string) =>
      `Customer ${customerId} has no email, skipping`,
    TEMPLATE_NOT_FOUND: 'Email template not found, skipping email send',
  },

  ERROR: {
    // General errors
    CUSTOMER_NOT_FOUND: (customerId: string) =>
      `Customer not found: ${customerId}`,
    TIER_UPDATE_FAILED: (customerId: string) =>
      `Failed to update tier for customer: ${customerId}`,
    EXPORT_FAILED: (workspaceId: string) =>
      `Failed to export customers for workspace: ${workspaceId}`,
    CUSTOMER_CREATED_FAILED: (customerId: string) =>
      `Failed to process customer created event: ${customerId}`,

    // Validation errors
    INVALID_EMAIL_FORMAT: (email: string) => `Invalid email format: ${email}`,
    EMAIL_ALREADY_EXISTS: (email: string) =>
      `Email already exists in workspace: ${email}`,
    INVALID_TAX_CODE: (taxCode: string) =>
      `Tax code must be 10 or 13 digits: ${taxCode}`,
    CATEGORIZATION_FAILED: (customerId: string) =>
      `Failed to categorize customer: ${customerId}`,

    // Repository errors
    REPOSITORY_NOT_FOUND: 'Repository not found for workspace',
    WORKSPACE_NOT_FOUND: 'Workspace not found in context',
  },
} as const;
