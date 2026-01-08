/**
 * Centralized Messages for Contract Module
 * Following MKT_CRM_Backend_Implementation_Guide pattern
 */

export const MKT_CONTRACT_LOG_CONTEXT = 'MktContract';

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
