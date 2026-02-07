import { Field, InputType, Int } from '@nestjs/graphql';

import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';

@InputType()
export class OrderStatsInput {
  @Field(() => String)
  @IsEnum([
    'TODAY',
    'THIS_WEEK',
    'THIS_MONTH',
    'THIS_QUARTER',
    'THIS_YEAR',
    'CUSTOM',
  ])
  period: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  startDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  endDate?: string;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  topProductsLimit?: number;
}
