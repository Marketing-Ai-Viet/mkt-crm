import { Field, InputType, Float, Int } from '@nestjs/graphql';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Input for order item in discount calculation
 */
@InputType()
export class OrderItemInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  productId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  variantId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  quantity: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  totalPrice: number;
}

/**
 * Input for calculating discount
 */
@InputType()
export class CalculateDiscountInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @Field(() => [OrderItemInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  orderItems: OrderItemInput[];

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  orderSubtotal: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  customerTags?: string[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isFirstOrder?: boolean;
}
