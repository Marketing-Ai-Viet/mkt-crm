import { Field, InputType } from '@nestjs/graphql';

import { IsOptional, IsString } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';

@InputType()
export class DashboardSummaryInput {
  @Field(() => DashboardPeriod)
  period: DashboardPeriod;

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
