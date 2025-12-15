import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';

// Register enum for GraphQL
registerEnumType(ORDER_ACTION, {
  name: 'OrderAction',
  description: 'Action to perform when creating/confirming order',
});

@InputType()
export class OrderVariantInputDto {
  @Field(() => String)
  @IsUUID()
  variantId: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

@InputType()
export class OrderPaymentMethodInputDto {
  @Field(() => String)
  @IsUUID()
  paymentMethodId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsNumber()
  amount?: number;
}

@InputType()
export class CreateOrderWithItemsInputDto {
  @Field(() => String, { description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @Field(() => String, { nullable: true, description: 'Order name' })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true, defaultValue: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  requireContract?: boolean;

  @Field(() => Number, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @Field(() => [OrderVariantInputDto], { description: 'List of variants' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderVariantInputDto)
  variants: OrderVariantInputDto[];

  @Field(() => [OrderPaymentMethodInputDto], {
    nullable: true,
    description: 'Payment methods (not required for TRIAL)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPaymentMethodInputDto)
  paymentMethods?: OrderPaymentMethodInputDto[];

  @Field(() => ORDER_ACTION, { description: 'Action type' })
  @IsEnum(ORDER_ACTION)
  action: ORDER_ACTION;

  @Field(() => String, {
    nullable: true,
    description: 'License ID for LICENSE_RENEWING',
  })
  @IsOptional()
  @IsUUID()
  licenseId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Trial order ID for TRIAL_TO_PAID',
  })
  @IsOptional()
  @IsUUID()
  trialOrderId?: string;
}

@InputType()
export class ConfirmOrderInputDto {
  @Field(() => String)
  @IsUUID()
  orderId: string;

  @Field(() => ORDER_ACTION)
  @IsEnum(ORDER_ACTION)
  action: ORDER_ACTION;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  accountingConfirmed?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}

@InputType()
export class UpdateOrderStatusInputDto {
  @Field(() => String, { description: 'Order ID to update' })
  @IsUUID()
  orderId: string;

  @Field(() => ORDER_ACTION, { description: 'Action to perform' })
  @IsEnum(ORDER_ACTION)
  action: ORDER_ACTION;

  @Field(() => String, { nullable: true, description: 'Optional note' })
  @IsOptional()
  @IsString()
  note?: string;
}

@InputType()
export class RefundOrderInputDto {
  @Field(() => String, { description: 'Order ID to refund' })
  @IsUUID()
  orderId: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Specific license IDs to refund (for partial refund)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  licenseIds?: string[];

  @Field(() => Number, {
    nullable: true,
    description: 'Custom refund amount (optional)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @Field(() => String, { nullable: true, description: 'Refund reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description: 'Is partial refund',
  })
  @IsOptional()
  @IsBoolean()
  isPartial?: boolean;
}

@InputType()
export class UpdateOrderItemInputDto {
  @Field(() => String, { description: 'Order item ID to update' })
  @IsUUID()
  orderItemId: string;

  @Field(() => String, { nullable: true, description: 'New variant ID' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @Field(() => Int, { nullable: true, description: 'New quantity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @Field(() => Number, { nullable: true, description: 'Custom unit price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @Field(() => String, { nullable: true, description: 'Note' })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Updated at timestamp for optimistic locking',
  })
  @IsOptional()
  @IsString()
  updatedAt?: string;
}
