import { Field, InputType, Int } from '@nestjs/graphql';

import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';

import { PROMOTION_STATUS } from 'src/mkt-core/mkt-promotion/constants';

/**
 * Input for querying promotions with pagination
 */
@InputType()
export class GetPromotionsInput {
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

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(PROMOTION_STATUS)
  status?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
}
