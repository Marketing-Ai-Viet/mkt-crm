import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * Input for querying coupons by promotion
 */
@InputType()
export class GetCouponsByPromotionInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  promotionId: string;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
