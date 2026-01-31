import { Field, Float, ID, InputType } from '@nestjs/graphql';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * Input DTO for creating a payment
 */
@InputType()
export class CreatePaymentInputDto {
  @Field(() => ID, { description: 'Order ID for the payment' })
  @IsNotEmpty()
  @IsString()
  mktOrderId: string;

  @Field(() => ID, { nullable: true, description: 'Payment method ID' })
  @IsOptional()
  @IsString()
  mktPaymentMethodId?: string;

  @Field({ nullable: true, description: 'Payment name' })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Float, { nullable: true, description: 'Payment amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @Field({ nullable: true, description: 'Currency code (default: VND)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field({ nullable: true, description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => ID, { nullable: true, description: 'Invoice ID' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @Field(() => ID, { nullable: true, description: 'Template ID' })
  @IsOptional()
  @IsString()
  mktTemplateId?: string;
}

/**
 * Input DTO for updating a payment
 */
@InputType()
export class UpdatePaymentInputDto {
  @Field(() => ID, { description: 'Payment ID to update' })
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @Field(() => ID, { nullable: true, description: 'Payment method ID' })
  @IsOptional()
  @IsString()
  mktPaymentMethodId?: string;

  @Field({ nullable: true, description: 'Payment name' })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Float, { nullable: true, description: 'Payment amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @Field({ nullable: true, description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field({ nullable: true, description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true, description: 'Payment status' })
  @IsOptional()
  @IsString()
  status?: string;

  @Field({ nullable: true, description: 'Payment date' })
  @IsOptional()
  @IsString()
  paymentDate?: string;
}

// ============================================
// PHASE 2: CONFIRM/REJECT/REFUND DTOs
// ============================================

/**
 * Input DTO for confirming a payment manually
 * Note: Named differently from order's ConfirmPaymentInputDto which is for order-level payment
 */
@InputType()
export class ManualConfirmPaymentInputDto {
  @Field(() => ID, { description: 'Payment ID to confirm' })
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @Field({ nullable: true, description: 'Confirmation note' })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Input DTO for rejecting a payment
 */
@InputType()
export class RejectPaymentInputDto {
  @Field(() => ID, { description: 'Payment ID to reject' })
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @Field({ description: 'Rejection reason' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

/**
 * Input DTO for refunding a payment
 */
@InputType()
export class RefundPaymentInputDto {
  @Field(() => ID, { description: 'Payment ID to refund' })
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Amount to refund. If null, full remaining amount is refunded',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @Field({ description: 'Refund reason' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
