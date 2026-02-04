/**
 * Payment Reminder DTOs
 *
 * GraphQL input and output types for payment reminder operations.
 * Uses GraphQL Errors Extension pattern for error handling.
 */

import { Field, InputType, ObjectType, Int, ID } from '@nestjs/graphql';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsArray,
} from 'class-validator';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { PAYMENT_REMINDER_CONFIG } from 'src/mkt-core/order/constants/payment-reminder.constants';

// ============================================
// FILTER INPUT
// ============================================

@InputType({ description: 'Filter options for payment reminder operations' })
export class PaymentReminderFilterInput {
  @Field(() => String, {
    nullable: true,
    description: 'Order status filter (default: PROCESSING)',
  })
  @IsOptional()
  @IsString()
  status?: ORDER_STATUS;

  @Field(() => String, {
    nullable: true,
    description: 'Payment status filter (default: PENDING, PARTIAL)',
  })
  @IsOptional()
  @IsString()
  paymentStatus?: ORDER_PAYMENT_STATUS;

  @Field(() => Int, {
    nullable: true,
    description: 'Minimum days past payment deadline (0 = today)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysPastDeadline?: number;

  @Field(() => Int, {
    nullable: true,
    description: `Maximum reminders already sent (default: ${PAYMENT_REMINDER_CONFIG.MAX_REMINDERS - 1})`,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PAYMENT_REMINDER_CONFIG.MAX_REMINDERS)
  maxRemindersSent?: number;
}

// ============================================
// PAGINATION INPUT
// ============================================

@InputType({ description: 'Pagination input for payment reminder query' })
export class PaymentReminderPaginationInput {
  @Field(() => Int, {
    nullable: true,
    defaultValue: 20,
    description: 'Number of items per page',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 0,
    description: 'Offset for pagination',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Cursor for cursor-based pagination',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

// ============================================
// SINGLE REMINDER INPUT
// ============================================

@InputType({ description: 'Input for sending a single payment reminder' })
export class SendPaymentReminderInput {
  @Field(() => ID, { description: 'Order ID to send reminder for' })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @Field({
    nullable: true,
    description: 'Idempotency key to prevent duplicate sends',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;

  @Field({
    nullable: true,
    description: `Template key to use (default: ${PAYMENT_REMINDER_CONFIG.DEFAULT_TEMPLATE_KEY})`,
  })
  @IsOptional()
  @IsString()
  templateKey?: string;

  @Field({
    nullable: true,
    description: `Custom note/message (max ${PAYMENT_REMINDER_CONFIG.MAX_NOTE_LENGTH} chars, will be sanitized)`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(PAYMENT_REMINDER_CONFIG.MAX_NOTE_LENGTH)
  note?: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description:
      'Bypass MAX_REMINDERS and MIN_INTERVAL checks (use with caution)',
  })
  @IsOptional()
  @IsBoolean()
  forceResend?: boolean;
}

// ============================================
// BULK REMINDER INPUT
// ============================================

@InputType({ description: 'Input for sending bulk payment reminders' })
export class SendBulkPaymentRemindersInput {
  @Field(() => [ID], {
    nullable: true,
    description: `Specific order IDs to send reminders (max ${PAYMENT_REMINDER_CONFIG.BULK_LIMIT})`,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  orderIds?: string[];

  @Field(() => PaymentReminderFilterInput, {
    nullable: true,
    description: 'Filter to select orders (used if orderIds not provided)',
  })
  @IsOptional()
  filter?: PaymentReminderFilterInput;

  @Field({
    nullable: true,
    description: `Template key to use (default: ${PAYMENT_REMINDER_CONFIG.DEFAULT_TEMPLATE_KEY})`,
  })
  @IsOptional()
  @IsString()
  templateKey?: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description: 'Preview mode - validate without sending (no DB/queue writes)',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

// ============================================
// QUERY INPUT
// ============================================

@InputType({
  description: 'Input for querying orders needing payment reminder',
})
export class GetOrdersNeedingReminderInput {
  @Field(() => PaymentReminderFilterInput, {
    nullable: true,
    description: 'Filter options',
  })
  @IsOptional()
  filter?: PaymentReminderFilterInput;

  @Field(() => PaymentReminderPaginationInput, {
    nullable: true,
    description: 'Pagination options',
  })
  @IsOptional()
  pagination?: PaymentReminderPaginationInput;
}

// ============================================
// SINGLE REMINDER OUTPUT
// ============================================

@ObjectType({ description: 'Result of sending a single payment reminder' })
export class SendPaymentReminderOutput {
  @Field(() => ID, { description: 'Order ID' })
  orderId: string;

  @Field({ nullable: true, description: 'Order code' })
  orderCode?: string;

  @Field({ nullable: true, description: 'Customer email address' })
  customerEmail?: string;

  @Field({
    nullable: true,
    description: 'Timestamp when reminder was sent (ISO format)',
  })
  sentAt?: string;

  @Field(() => Int, {
    description: 'Total reminders sent after this operation',
  })
  reminderCount: number;

  @Field(() => Int, {
    description: 'Reminders sent before this operation (for audit)',
  })
  previousReminderCount: number;
}

// ============================================
// BULK REMINDER OUTPUT
// ============================================

@ObjectType({ description: 'Result item for a single order in bulk operation' })
export class BulkReminderResultItemOutput {
  @Field(() => ID, { description: 'Order ID' })
  orderId: string;

  @Field({ nullable: true, description: 'Order code' })
  orderCode?: string;

  @Field(() => Boolean, { description: 'Whether reminder was sent (queued)' })
  sent: boolean;

  @Field(() => Boolean, {
    description: 'Whether order was skipped (validation fail or dryRun)',
  })
  skipped: boolean;

  @Field({ nullable: true, description: 'Reason for skip (error code)' })
  skipReason?: string;

  @Field({ nullable: true, description: 'Timestamp when sent (ISO format)' })
  sentAt?: string;
}

@ObjectType({ description: 'Result of bulk payment reminder operation' })
export class SendBulkPaymentRemindersOutput {
  @Field(() => Int, { description: 'Total orders processed' })
  totalProcessed: number;

  @Field(() => Int, { description: 'Total reminders sent successfully' })
  totalSent: number;

  @Field(() => Int, {
    description: 'Total orders skipped (validation or dryRun)',
  })
  totalSkipped: number;

  @Field(() => Int, { description: 'Total orders failed (email queue error)' })
  totalFailed: number;

  @Field(() => Boolean, { description: 'Whether this was a dry run' })
  isDryRun: boolean;

  @Field(() => [BulkReminderResultItemOutput], {
    description: 'Individual results for each order',
  })
  results: BulkReminderResultItemOutput[];
}

// ============================================
// QUERY OUTPUT - SINGLE ORDER
// ============================================

@ObjectType({ description: 'Order information for reminder query' })
export class OrderNeedingReminderOutput {
  @Field(() => ID, { description: 'Order ID' })
  id: string;

  @Field({ description: 'Order code' })
  orderCode: string;

  @Field({ description: 'Customer name' })
  customerName: string;

  @Field({ nullable: true, description: 'Customer email' })
  customerEmail?: string;

  @Field({ nullable: true, description: 'Customer phone' })
  customerPhone?: string;

  @Field({ description: 'Total order amount (formatted)' })
  totalAmount: string;

  @Field({ description: 'Amount already paid (formatted)' })
  paidAmount: string;

  @Field({ description: 'Remaining amount to pay (formatted)' })
  remainingAmount: string;

  @Field({ nullable: true, description: 'Payment deadline (ISO format)' })
  paymentDeadline?: string;

  @Field(() => Int, { description: 'Number of reminders already sent' })
  remindersSent: number;

  @Field({ nullable: true, description: 'Last reminder sent at (ISO format)' })
  lastReminderAt?: string;

  @Field(() => Int, { description: 'Days past payment deadline' })
  daysPastDeadline: number;

  @Field(() => String, { description: 'Order status' })
  status: ORDER_STATUS;

  @Field(() => String, { description: 'Payment status' })
  paymentStatus: ORDER_PAYMENT_STATUS;

  @Field(() => Boolean, {
    description: 'Whether reminder can be sent (pre-validated)',
  })
  canSendReminder: boolean;
}

// ============================================
// QUERY OUTPUT - PAGE INFO
// ============================================

@ObjectType({ description: 'Pagination information' })
export class PaymentReminderPageInfo {
  @Field(() => Boolean, { description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @Field(() => Boolean, { description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;

  @Field({ nullable: true, description: 'Start cursor' })
  startCursor?: string;

  @Field({ nullable: true, description: 'End cursor' })
  endCursor?: string;
}

// ============================================
// QUERY OUTPUT - PAGINATED LIST
// ============================================

@ObjectType({ description: 'Paginated list of orders needing reminder' })
export class GetOrdersNeedingReminderOutput {
  @Field(() => [OrderNeedingReminderOutput], {
    description: 'List of orders needing reminder',
  })
  orders: OrderNeedingReminderOutput[];

  @Field(() => Int, { description: 'Total count of matching orders' })
  totalCount: number;

  @Field(() => PaymentReminderPageInfo, { description: 'Pagination info' })
  pageInfo: PaymentReminderPageInfo;
}
