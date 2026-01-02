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

    // Update operations
    UPDATE_NO_CHANGES: (email: string) =>
      `No update needed for customer: ${email}`,
    UPDATE_CHANGES: (email: string, changes: string) =>
      `Updating customer ${email}: ${changes}`,
    UPDATE_SUCCESS: (email: string) =>
      `Successfully updated customer for: ${email}`,

    // Account operations
    ACCOUNT_GET_LIST: (customerId: string) =>
      `Getting accounts for customer ${customerId}`,
    ACCOUNT_GET_PRIMARY: (customerId: string) =>
      `Getting primary account for customer ${customerId}`,
    ACCOUNT_FIND_BY_MKT: (mktAccountId: string) =>
      `Finding customer by MKT account ${mktAccountId}`,
    ACCOUNT_LINKING: (customerId: string, mktAccountId: string) =>
      `Linking MKT account ${mktAccountId} to customer ${customerId}`,
    ACCOUNT_LINK_SUCCESS: (customerId: string, mktAccountId: string) =>
      `Successfully linked MKT account ${mktAccountId} to customer ${customerId}`,
    ACCOUNT_SET_PRIMARY: (customerId: string, mktAccountId: string) =>
      `Setting primary account ${mktAccountId} for customer ${customerId}`,
    ACCOUNT_UNLINKING: (customerId: string, mktAccountId: string) =>
      `Unlinking MKT account ${mktAccountId} from customer ${customerId}`,
    ACCOUNT_UNLINK_SUCCESS: (mktAccountId: string) =>
      `Successfully unlinked MKT account ${mktAccountId}`,

    // Queue operations
    QUEUE_TIER_UPDATE: (customerId: string) =>
      `Enqueuing tier update for customer: ${customerId}`,
    QUEUE_TIER_BATCH: (workspaceId: string, count: number) =>
      `Enqueuing batch tier update for workspace ${workspaceId}: ${count} customers`,

    // Categorization operations
    CATEGORIZATION_JOB_START: (workspaceId: string) =>
      `Starting customer categorization job for workspace: ${workspaceId}`,
    CATEGORIZATION_JOB_COMPLETE: (processed: number, updated: number) =>
      `Categorization complete: ${processed} processed, ${updated} updated`,
    CUSTOMER_STAGE_CHANGED: (
      customerId: string,
      oldStage: string,
      newStage: string,
    ) => `Customer ${customerId} stage changed: ${oldStage} → ${newStage}`,

    // Auto-assign operations
    AUTO_ASSIGN_START: (customerId: string) =>
      `Starting auto-assign for customer: ${customerId}`,
    AUTO_ASSIGN_SUCCESS: (customerId: string, salesId: string) =>
      `Customer ${customerId} assigned to sales ${salesId}`,
    AUTO_ASSIGN_SKIP: (customerId: string, reason: string) =>
      `Skipping auto-assign for customer ${customerId}: ${reason}`,
  },

  WARN: {
    MISSING_WORKSPACE_ID: 'Workspace ID not found in event payload',
    NO_CUSTOMERS_FOUND: 'No customers found for the given criteria',
    NO_SALES_AVAILABLE: 'No sales members available for auto-assignment',
    CUSTOMER_HAS_NO_EMAIL: (customerId: string) =>
      `Customer ${customerId} has no email, skipping`,
    TEMPLATE_NOT_FOUND: 'Email template not found, skipping email send',
    CUSTOMER_NOT_FOUND_BY_MKT_ACCOUNT: (mktAccountId: string, email?: string) =>
      `Customer not found for MKT Account: ${mktAccountId}${email ? `, email: ${email}` : ''}`,
    LINKED_ACCOUNT_PRIMARY_AUTO_FIXED: (providers: string[]) =>
      `Auto-fixed multiple primary accounts for providers: ${providers.join(', ')}. Only first primary kept.`,
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

    // Account errors
    ACCOUNT_LINK_FAILED: 'Failed to link MKT account',
    ACCOUNT_SET_PRIMARY_FAILED: 'Failed to set primary account',
    ACCOUNT_UNLINK_FAILED: 'Failed to unlink MKT account',
    ACCOUNT_ALREADY_LINKED: (mktAccountId: string) =>
      `MKT account ${mktAccountId} is already linked to another customer`,
    ACCOUNT_NOT_LINKED: (mktAccountId: string, customerId: string) =>
      `MKT account ${mktAccountId} is not linked to customer ${customerId}`,

    // Linked account validation errors
    LINKED_ACCOUNT_DUPLICATE_PRIMARY: (provider: string) =>
      `Provider "${provider}" can only have one primary account`,
    LINKED_ACCOUNT_INVALID: (errors: string[]) =>
      `Invalid linkedAccounts: ${errors.join('; ')}`,

    // MKT Server email errors
    MKT_SERVER_EMAIL_NOT_FOUND: (customerId: string) =>
      `Customer "${customerId}" does not have a valid MKT_SERVER linked account (isPrimary=true, status=ACTIVE). Please configure linkedAccounts or provide mktServerEmail in the request.`,
    MKT_SERVER_EMAIL_NO_LINKED_ACCOUNTS: (customerId: string) =>
      `Customer "${customerId}" has no linkedAccounts configured. Please add an MKT_SERVER account with isPrimary=true and status=ACTIVE, or provide mktServerEmail in the request.`,
  },

  INFO: {
    // Tier upgrade messages
    UPGRADE_REQUIREMENTS: (
      remainingSpending: number,
      remainingOrders: number,
      targetTier: string,
    ) =>
      `Cần thêm ${remainingSpending.toLocaleString()} VND và ${remainingOrders} đơn hàng để lên hạng ${targetTier}`,
    MAX_TIER_REACHED: 'Đã đạt hạng cao nhất',
  },
} as const;
