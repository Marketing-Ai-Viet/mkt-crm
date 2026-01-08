import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

/**
 * Input for creating single coupon
 */
@InputType()
export class CreateCouponInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  promotionId: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validTo?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  assignedCustomerId?: string;
}

/**
 * Input for creating multiple coupons in bulk
 */
@InputType()
export class CreateBulkCouponsInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  promotionId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(1000)
  quantity: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  prefix?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  validTo?: Date;
}
