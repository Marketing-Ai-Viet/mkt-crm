import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

@InputType()
export class LeaderboardInput {
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

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
