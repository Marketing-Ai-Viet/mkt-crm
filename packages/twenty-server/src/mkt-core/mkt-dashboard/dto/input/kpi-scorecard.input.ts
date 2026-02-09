import { Field, InputType, Int } from '@nestjs/graphql';

import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';

@InputType()
export class KpiScorecardInput {
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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  year?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  category?: string;
}
