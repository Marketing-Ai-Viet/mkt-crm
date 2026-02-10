import { MKT_EMAIL_STATUS } from 'src/mkt-core/mkt-email/constants';

/**
 * Email Repository Types
 */

// Options for finding emails
export type FindEmailOptions = {
  take?: number;
  skip?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
};

// Options for finding with limit/offset
export type FindWithPaginationOptions = {
  limit?: number;
  offset?: number;
};

/**
 * Email Service Types
 */

// Data to create email record
export type CreateEmailData = {
  subject: string;
  to: string;
  from: string;
  body?: string;
  status?: MKT_EMAIL_STATUS;
  emailType?: string;
  sentAt?: Date;
  accountOwnerId?: string | null;
};

// Data to update email record
export type UpdateEmailData = {
  subject?: string;
  to?: string;
  from?: string;
  body?: string;
  status?: MKT_EMAIL_STATUS | string;
  emailType?: string;
  sentAt?: Date;
  accountOwnerId?: string | null;
};

// Email send options
export type SendEmailOptions = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

// Order email template replacements
export type OrderEmailReplacements = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string;
  order_number: string;
  order_code: string;
  order_value: string;
  order_total: string;
  order_status: string;
  order_date: string;
  order_items: string;
  order_url: string;
  shipping_address: string;
  order_notes: string;
  qr_code_url: string;
  payment_page_url: string;
  trial_duration: number;
};

// Configurable email sender
export type EmailSenderConfig = {
  fromName?: string;
  fromAddress?: string;
};

// Status distribution statistics
export type StatusDistributionItem = {
  status: string;
  count: number;
};
