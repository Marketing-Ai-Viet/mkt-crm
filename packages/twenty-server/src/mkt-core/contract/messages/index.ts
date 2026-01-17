/**
 * Centralized Messages for Contract Module
 * Following MKT_CRM_Backend_Implementation_Guide pattern
 */

// ============================================================================
// GRAPHQL DESCRIPTIONS
// ============================================================================

/**
 * GraphQL operation descriptions for Contract queries
 */
export const CONTRACT_QUERY_DESCRIPTIONS = {
  GET_CONTRACT_BY_ID: 'Get contract by ID with hierarchical access filtering',
  GET_CONTRACT_BY_NUMBER: 'Get contract by contract number',
  GET_CONTRACTS_BY_CUSTOMER: 'Get contracts by customer ID',
  GET_CONTRACTS_BY_STATUS: 'Get contracts by status',
  GET_CONTRACT_STATUS_DISTRIBUTION:
    'Get contract status distribution statistics',
  GET_CUSTOMER_CONTRACT_STATS: 'Get contract statistics for a customer',
  GET_EXPIRING_CONTRACTS: 'Get contracts expiring within a date range',
  GET_ALL_CONTRACTS: 'Get all contracts with pagination',
} as const;

/**
 * GraphQL operation descriptions for Contract mutations
 */
export const CONTRACT_MUTATION_DESCRIPTIONS = {
  CREATE_CONTRACT: 'Create a new contract',
  UPDATE_CONTRACT: 'Update an existing contract',
  UPDATE_CONTRACT_STATUS: 'Update contract status',
  DELETE_CONTRACT: 'Soft delete a contract',
  DESTROY_CONTRACT: 'Permanently delete a contract',
  RESTORE_CONTRACT: 'Restore a soft deleted contract',
} as const;

// ============================================================================
// RESPONSE MESSAGES
// ============================================================================

/**
 * Success/error response messages for Contract operations
 */
export const CONTRACT_RESPONSE_MESSAGES = {
  SUCCESS: {
    CONTRACT_CREATED: 'Contract created successfully',
    CONTRACT_UPDATED: 'Contract updated successfully',
    CONTRACT_DELETED: 'Contract has been soft deleted',
    CONTRACT_RESTORED: 'Contract has been restored',
    STATUS_UPDATED: (previousStatus: string, newStatus: string) =>
      `Contract status updated from ${previousStatus} to ${newStatus}`,
  },
  FAILURE: {
    CREATE_FAILED: 'Failed to create contract',
    UPDATE_FAILED: 'Failed to update contract',
    DELETE_FAILED: 'Failed to delete contract',
    RESTORE_FAILED: 'Failed to restore contract',
    STATUS_UPDATE_FAILED: 'Failed to update contract status',
    NOT_FOUND: (contractId: string) =>
      `Contract with ID ${contractId} not found`,
    NOT_DELETED: 'Contract is not deleted',
  },
} as const;

// ============================================================================
// LOG MESSAGES
// ============================================================================

export const CONTRACT_MESSAGES = {
  LOG: {
    // Repository operations
    FIND_BY_ID_START: (contractId: string) =>
      `Finding contract by ID: ${contractId}`,
    FIND_BY_ID_SUCCESS: (contractId: string) => `Found contract: ${contractId}`,
    FIND_BY_ID_NOT_FOUND: (contractId: string) =>
      `Contract not found: ${contractId}`,
    FIND_ALL_START: (workspaceId: string) =>
      `Finding all contracts for workspace: ${workspaceId}`,
    FIND_ALL_SUCCESS: (count: number) => `Found ${count} contracts`,

    // Create operations
    CREATE_START: (orderId: string) =>
      `Creating contract for order: ${orderId}`,
    CREATE_SUCCESS: (contractId: string) =>
      `Successfully created contract: ${contractId}`,
    CREATE_FOR_ORDER_SUCCESS: (contractNumber: string, orderId: string) =>
      `Successfully created contract ${contractNumber} for order ${orderId}`,

    // Update operations
    UPDATE_START: (contractId: string) => `Updating contract: ${contractId}`,
    UPDATE_SUCCESS: (contractId: string) =>
      `Successfully updated contract: ${contractId}`,
    SOFT_DELETE_SUCCESS: (contractId: string) =>
      `Soft deleted contract: ${contractId}`,

    // Link operations
    LINK_TO_ORDER_START: (contractId: string, orderId: string) =>
      `Linking contract ${contractId} to order ${orderId}`,
    LINK_TO_ORDER_SUCCESS: (contractId: string, orderId: string) =>
      `Successfully linked contract ${contractId} to order ${orderId}`,

    // Number generation
    GENERATE_NUMBER_SUCCESS: (contractNumber: string) =>
      `Generated contract number: ${contractNumber}`,

    // Status operations
    STATUS_CHANGED: (
      contractId: string,
      oldStatus: string,
      newStatus: string,
    ) => `Contract ${contractId} status changed: ${oldStatus} → ${newStatus}`,

    // Expiring contracts
    EXPIRING_CONTRACTS_FOUND: (count: number, days: number) =>
      `Found ${count} contracts expiring within ${days} days`,
  },

  WARN: {
    CONTRACT_ALREADY_LINKED: (contractId: string, orderId: string) =>
      `Contract ${contractId} is already linked to order ${orderId}`,
    CONTRACT_EXPIRED: (contractId: string) =>
      `Contract ${contractId} has expired`,
    NO_CONTRACTS_FOUND: 'No contracts found for the given criteria',
  },

  ERROR: {
    // General errors
    CONTRACT_NOT_FOUND: (contractId: string) =>
      `Contract not found: ${contractId}`,
    CREATE_FAILED: (orderId: string) =>
      `Failed to create contract for order: ${orderId}`,
    UPDATE_FAILED: (contractId: string) =>
      `Failed to update contract: ${contractId}`,
    LINK_FAILED: (contractId: string, orderId: string) =>
      `Failed to link contract ${contractId} to order ${orderId}`,

    // Validation errors
    INVALID_CONTRACT_NUMBER: (contractNumber: string) =>
      `Invalid contract number format: ${contractNumber}`,
    CONTRACT_NUMBER_EXISTS: (contractNumber: string) =>
      `Contract number already exists: ${contractNumber}`,
    INVALID_DATE_RANGE: 'Contract end date must be after start date',

    // Repository errors
    WORKSPACE_NOT_FOUND: 'Workspace ID not found in context',
    REPOSITORY_NOT_FOUND: 'Repository not found for workspace',

    // Number generation errors
    GENERATE_NUMBER_FAILED: 'Failed to generate contract number',
  },

  INFO: {
    CONTRACT_ACTIVE: (contractId: string) => `Contract ${contractId} is active`,
    CONTRACT_EXPIRES_SOON: (contractId: string, days: number) =>
      `Contract ${contractId} expires in ${days} days`,
  },
} as const;
