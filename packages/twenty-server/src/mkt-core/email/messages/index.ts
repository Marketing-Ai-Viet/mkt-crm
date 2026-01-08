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
