import { Field, InputType } from '@nestjs/graphql';

import { IsEnum, IsOptional, IsString } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class DashboardSummaryInput {
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

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  filters?: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  startDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  endDate?: string;
}
