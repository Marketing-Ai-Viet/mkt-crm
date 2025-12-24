import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { MKT_SUPPORTED_LANGUAGES } from 'src/mkt-core/mkt-product-integration/constants';

// ============================================
// GRAPHQL ENUMS - Restricted action sets
// ============================================

/**
 * Actions cho phép khi TẠO đơn hàng
 */
export enum CREATE_ORDER_ACTION {
  NEW_ORDER = 'NEW_ORDER',
  TRIAL = 'TRIAL',
  LICENSE_RENEWING = 'LICENSE_RENEWING',
  TRIAL_TO_PAID = 'TRIAL_TO_PAID',
  CHANGE_VARIANT = 'CHANGE_VARIANT',
}

/**
 * Actions cho phép khi XÁC NHẬN đơn hàng
 */
export enum CONFIRM_ORDER_ACTION {
  ACCOUNTING_CONFIRMED = 'ACCOUNTING_CONFIRMED',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
  BLOCK = 'BLOCK',
}

// Register enums for GraphQL
registerEnumType(ORDER_ACTION, {
  name: 'OrderAction',
  description: 'All order actions (for backward compatibility)',
});

registerEnumType(CREATE_ORDER_ACTION, {
  name: 'CreateOrderAction',
  description: 'Actions allowed when creating an order',
});

registerEnumType(CONFIRM_ORDER_ACTION, {
  name: 'ConfirmOrderAction',
  description: 'Actions allowed when confirming an order',
});

/**
 * Input for external MKT Server product
 */
@InputType()
export class ExternalMktProductInputDto {
  @Field(() => String, { description: 'Product ID from MKT Server (UUIDv7)' })
  @IsString()
  productId: string;

  @Field(() => String, {
    nullable: true,
    description: 'Package ID from MKT Server',
  })
  @IsOptional()
  @IsString()
  packageId: string;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 1,
    description: 'Maximum devices allowed for license',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDevices?: number;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description:
      'Split into multiple licenses (e.g., maxDevices=3 with splitLicenses=true creates 3 licenses with 1 device each)',
  })
  @IsOptional()
  @IsBoolean()
  splitLicenses?: boolean;
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

/**
 * Input DTO for creating order with items
 *
 * Uses external products from MKT Server via OAuth2 API
 */
@InputType()
export class CreateOrderWithItemsInputDto {
  @Field(() => String, { description: 'Customer ID' })
  @IsUUID()
  customerId: string;

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

  @Field(() => [ExternalMktProductInputDto], {
    description: 'List of external MKT Server products (required)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalMktProductInputDto)
  externalProducts: ExternalMktProductInputDto[];

  @Field(() => String, {
    nullable: true,
    defaultValue: 'vi',
    description: 'Order language for display names from MKT Server (vi/en/ko)',
  })
  @IsOptional()
  @IsString()
  @IsIn(MKT_SUPPORTED_LANGUAGES)
  orderLanguage?: string;

  @Field(() => [OrderPaymentMethodInputDto], {
    nullable: true,
    description: 'Payment methods (not required for TRIAL)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPaymentMethodInputDto)
  paymentMethods?: OrderPaymentMethodInputDto[];

  @Field(() => CREATE_ORDER_ACTION, {
    description:
      'Action type (NEW_ORDER, TRIAL, LICENSE_RENEWING, TRIAL_TO_PAID, CHANGE_VARIANT)',
  })
  @IsEnum(CREATE_ORDER_ACTION)
  action: CREATE_ORDER_ACTION;

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

  // ============================================
  // PROMOTION FIELDS
  // ============================================

  @Field(() => String, {
    nullable: true,
    description: 'Coupon code to apply for discount',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description: 'Whether to automatically apply eligible promotions',
  })
  @IsOptional()
  @IsBoolean()
  applyAutoPromotions?: boolean;
}

@InputType()
export class ConfirmOrderInputDto {
  @Field(() => String)
  @IsUUID()
  orderId: string;

  @Field(() => CONFIRM_ORDER_ACTION, {
    description: 'Action type (ACCOUNTING_CONFIRMED, COMPLETE, CANCEL, BLOCK)',
  })
  @IsEnum(CONFIRM_ORDER_ACTION)
  action: CONFIRM_ORDER_ACTION;

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
