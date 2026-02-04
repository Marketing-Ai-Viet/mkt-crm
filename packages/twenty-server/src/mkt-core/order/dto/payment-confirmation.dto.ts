/**
 * Payment Confirmation DTOs
 *
 * GraphQL input and output types for sale/accounting payment confirmation.
 */

import {
  Field,
  InputType,
  ObjectType,
  Int,
  registerEnumType,
} from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

import { PAYMENT_CONFIRMATION_TYPE } from 'src/mkt-core/order/constants/confirmation-rules.constants';

// Register enum for GraphQL
registerEnumType(PAYMENT_CONFIRMATION_TYPE, {
  name: 'PaymentConfirmationType',
  description: 'Type of payment confirmation (SALE or ACCOUNTING)',
});

// ============================================
// INPUT TYPES
// ============================================

@InputType({ description: 'Input for sale/accounting payment confirmation' })
export class PaymentConfirmationInputDto {
  @Field({ description: 'Order ID to confirm' })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @Field({
    nullable: true,
    description: 'Idempotency key to prevent duplicate processing',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @Field({ nullable: true, description: 'Note for the confirmation' })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional metadata (bankRef, amount, etc.)',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

@InputType({ description: 'Input for revoking confirmation' })
export class RevokeConfirmationInputDto {
  @Field({ description: 'Order ID to revoke confirmation' })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @Field(() => PAYMENT_CONFIRMATION_TYPE, {
    description: 'Type of confirmation to revoke',
  })
  @IsNotEmpty()
  type: PAYMENT_CONFIRMATION_TYPE;

  @Field({ description: 'Reason for revoking (required)' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @Field({
    nullable: true,
    description: 'Idempotency key to prevent duplicate processing',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType({ description: 'Actor information' })
export class ActorInfoOutput {
  @Field({ description: 'Actor ID (workspace member ID)' })
  id: string;

  @Field({ description: 'Actor name' })
  name: string;

  @Field({ nullable: true, description: 'Actor email' })
  email?: string;

  @Field({ nullable: true, description: 'Actor role' })
  role?: string;
}

@ObjectType({ description: 'Impact of revoke action' })
export class RevokeImpactOutput {
  @Field({ description: 'Whether the order will be auto-locked after revoke' })
  willBeLocked: boolean;

  @Field({ description: 'Reason explaining the impact' })
  reason: string;

  @Field({ nullable: true, description: 'Whether status changed' })
  statusChanged?: boolean;

  @Field({ nullable: true, description: 'Previous status before revoke' })
  previousStatus?: string;

  @Field({ nullable: true, description: 'New status after revoke' })
  newStatus?: string;
}

@ObjectType({ description: 'Result of confirmation action' })
export class ConfirmationResultOutput {
  @Field({ description: 'Whether the action was successful' })
  success: boolean;

  @Field({ description: 'Order ID' })
  orderId: string;

  @Field({ description: 'Timestamp of the action (ISO format)' })
  confirmedAt: string;

  @Field(() => PAYMENT_CONFIRMATION_TYPE, {
    description: 'Type of confirmation',
  })
  type: PAYMENT_CONFIRMATION_TYPE;

  @Field(() => ActorInfoOutput, { description: 'Who performed the action' })
  actor: ActorInfoOutput;

  @Field({ nullable: true, description: 'Note provided with the action' })
  note?: string;

  @Field(() => Int, { description: 'New order version after update' })
  version: number;

  @Field(() => RevokeImpactOutput, {
    nullable: true,
    description: 'Impact info (only for revoke actions)',
  })
  impact?: RevokeImpactOutput;
}

@ObjectType({ description: 'Current confirmation status of an order' })
export class OrderConfirmationStatusOutput {
  @Field({ description: 'Order ID' })
  orderId: string;

  // Sale confirmation
  @Field({ description: 'Whether sale has confirmed payment' })
  saleConfirmed: boolean;

  @Field({ nullable: true, description: 'When sale confirmed (ISO format)' })
  saleConfirmedAt?: string;

  @Field(() => ActorInfoOutput, {
    nullable: true,
    description: 'Who confirmed (sale)',
  })
  saleConfirmedBy?: ActorInfoOutput;

  // Accounting confirmation
  @Field({ description: 'Whether accounting has confirmed payment' })
  accountingConfirmed: boolean;

  @Field({
    nullable: true,
    description: 'When accounting confirmed (ISO format)',
  })
  accountingConfirmedAt?: string;

  @Field(() => ActorInfoOutput, {
    nullable: true,
    description: 'Who confirmed (accounting)',
  })
  accountingConfirmedBy?: ActorInfoOutput;

  // Protection status
  @Field({ description: 'Whether order is protected from auto-lock' })
  isProtectedFromAutoLock: boolean;

  @Field({ nullable: true, description: 'Reason for protection status' })
  protectionReason?: string;
}

@ObjectType({ description: 'Single confirmation detail from history' })
export class ConfirmationDetailOutput {
  @Field({ description: 'History record ID' })
  id: string;

  @Field({ description: 'Action type' })
  action: string;

  @Field({ description: 'When the action was performed (ISO format)' })
  confirmedAt: string;

  @Field(() => ActorInfoOutput, { description: 'Who performed the action' })
  actor: ActorInfoOutput;

  @Field({ nullable: true, description: 'Note' })
  note?: string;

  @Field({ nullable: true, description: 'Reason (for revoke actions)' })
  reason?: string;

  @Field(() => GraphQLJSON, {
    nullable: true,
    description: 'Additional metadata',
  })
  metadata?: Record<string, unknown>;
}

@ObjectType({ description: 'Confirmation history of an order' })
export class ConfirmationHistoryOutput {
  @Field({ description: 'Order ID' })
  orderId: string;

  @Field(() => [ConfirmationDetailOutput], {
    description: 'List of confirmation actions (newest first)',
  })
  confirmations: ConfirmationDetailOutput[];
}
