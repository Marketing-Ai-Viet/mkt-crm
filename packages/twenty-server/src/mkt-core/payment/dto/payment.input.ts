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
