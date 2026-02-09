/**
 * Centralized Messages for Email Module
 * Following MKT_CRM_Backend_Implementation_Guide pattern
 */

export const MKT_EMAIL_LOG_CONTEXT = 'MktEmail';

export const EMAIL_MESSAGES = {
  LOG: {
    // Repository operations
    FIND_BY_ID_START: (emailId: string) => `Finding email by ID: ${emailId}`,
    FIND_BY_ID_SUCCESS: (emailId: string) => `Found email: ${emailId}`,
    FIND_BY_ID_NOT_FOUND: (emailId: string) => `Email not found: ${emailId}`,
    FIND_ALL_START: (workspaceId: string) =>
      `Finding all emails for workspace: ${workspaceId}`,
    FIND_ALL_SUCCESS: (count: number) => `Found ${count} emails`,

    // Create operations
    CREATE_SUCCESS: (emailId: string) =>
      `Successfully created email: ${emailId}`,
    SAVE_SUCCESS: (to: string) => `Successfully saved email record to: ${to}`,

    // Update operations
    UPDATE_SUCCESS: (emailId: string) =>
      `Successfully updated email: ${emailId}`,
    SOFT_DELETE_SUCCESS: (emailId: string) => `Soft deleted email: ${emailId}`,

    // Send operations
    SEND_START: (to: string, templateKey: string) =>
      `Sending email to ${to} using template: ${templateKey}`,
    SEND_SUCCESS: (to: string) => `Successfully sent email to: ${to}`,
    SEND_ORDER_EMAIL_SUCCESS: (orderId: string, to: string) =>
      `Sent order notification email for order ${orderId} to ${to}`,

    // Template operations
    TEMPLATE_FOUND: (templateKey: string) => `Found template: ${templateKey}`,
    USING_LOCALE: (locale: string) => `Using locale ${locale} for email`,
  },

  WARN: {
    // Order email warnings
    ORDER_NOT_FOUND: (orderId: string) =>
      `Order ${orderId} not found, skipping email`,
    ORDER_NO_CUSTOMER_EMAIL:
      'Order has no customer email, skipping notification',
    NO_TEMPLATE_FOR_STATUS: (status: string) =>
      `No email template configured for order status: ${status}`,
    TEMPLATE_NOT_FOUND: (templateKey: string) =>
      `Email template '${templateKey}' not found, skipping email send`,

    // General warnings
    NO_EMAILS_FOUND: 'No emails found for the given criteria',
    EMAIL_ALREADY_SENT: (emailId: string) =>
      `Email ${emailId} was already sent`,
  },

  ERROR: {
    // General errors
    EMAIL_NOT_FOUND: (emailId: string) => `Email not found: ${emailId}`,
    SAVE_FAILED: 'Failed to save email record',
    SEND_FAILED: (to: string) => `Failed to send email to: ${to}`,

    // Order email errors
    ORDER_EMAIL_FAILED: (orderId: string) =>
      `Failed to send order notification email for order: ${orderId}`,

    // Template errors
    TEMPLATE_RENDER_FAILED: (templateKey: string) =>
      `Failed to render email template: ${templateKey}`,
    INVALID_TEMPLATE: (templateKey: string) =>
      `Invalid email template: ${templateKey}`,

    // Repository errors
    WORKSPACE_NOT_FOUND: 'Workspace ID not found in context',
    REPOSITORY_NOT_FOUND: 'Repository not found for workspace',
  },

  INFO: {
    EMAIL_QUEUED: (emailId: string) => `Email ${emailId} queued for sending`,
    EMAIL_SENT: (emailId: string) => `Email ${emailId} has been sent`,
    EMAIL_FAILED: (emailId: string) => `Email ${emailId} failed to send`,
  },
} as const;

// ============================================================================
// GRAPHQL DESCRIPTIONS
// ============================================================================

/**
 * GraphQL operation descriptions for Email queries
 */
export const EMAIL_QUERY_DESCRIPTIONS = {
  GET_EMAIL_BY_ID: 'Get email by ID',
  GET_ALL_EMAILS: 'Get all emails with pagination',
  GET_EMAILS_BY_STATUS: 'Get emails by status',
  GET_EMAILS_BY_RECIPIENT: 'Get emails by recipient address',
  GET_EMAIL_STATUS_DISTRIBUTION: 'Get email status distribution statistics',
} as const;

/**
 * GraphQL operation descriptions for Email mutations
 */
export const EMAIL_MUTATION_DESCRIPTIONS = {
  CREATE_EMAIL: 'Create a new email',
  UPDATE_EMAIL: 'Update an existing email',
  DELETE_EMAIL: 'Soft delete an email',
} as const;

/**
 * Success/error response messages for Email operations
 */
export const EMAIL_RESPONSE_MESSAGES = {
  SUCCESS: {
    EMAIL_CREATED: 'Email created successfully',
    EMAIL_UPDATED: 'Email updated successfully',
    EMAIL_DELETED: 'Email has been soft deleted',
  },
  FAILURE: {
    CREATE_FAILED: 'Failed to create email',
    UPDATE_FAILED: 'Failed to update email',
    DELETE_FAILED: 'Failed to delete email',
    NOT_FOUND: (emailId: string) => `Email with ID ${emailId} not found`,
  },
} as const;

// ============================================================================
// TEMPLATE GRAPHQL DESCRIPTIONS
// ============================================================================

/**
 * GraphQL operation descriptions for Template queries
 */
export const TEMPLATE_QUERY_DESCRIPTIONS = {
  GET_TEMPLATE_BY_ID: 'Get template by ID',
  GET_ALL_TEMPLATES: 'Get all templates with pagination',
  GET_TEMPLATES_BY_TYPE: 'Get templates by type',
  GET_TEMPLATE_BY_KEY: 'Get template by template key',
} as const;

/**
 * GraphQL operation descriptions for Template mutations
 */
export const TEMPLATE_MUTATION_DESCRIPTIONS = {
  CREATE_TEMPLATE: 'Create a new template',
  UPDATE_TEMPLATE: 'Update an existing template',
  TOGGLE_TEMPLATE_ACTIVE: 'Toggle template active status',
  DELETE_TEMPLATE: 'Soft delete a template',
} as const;

/**
 * Success/error response messages for Template operations
 */
export const TEMPLATE_RESPONSE_MESSAGES = {
  SUCCESS: {
    TEMPLATE_CREATED: 'Template created successfully',
    TEMPLATE_UPDATED: 'Template updated successfully',
    TEMPLATE_DELETED: 'Template has been soft deleted',
    TEMPLATE_ACTIVATED: 'Template has been activated',
    TEMPLATE_DEACTIVATED: 'Template has been deactivated',
  },
  FAILURE: {
    CREATE_FAILED: 'Failed to create template',
    UPDATE_FAILED: 'Failed to update template',
    DELETE_FAILED: 'Failed to delete template',
    TOGGLE_FAILED: 'Failed to toggle template active status',
    NOT_FOUND: (templateId: string) =>
      `Template with ID ${templateId} not found`,
  },
} as const;
