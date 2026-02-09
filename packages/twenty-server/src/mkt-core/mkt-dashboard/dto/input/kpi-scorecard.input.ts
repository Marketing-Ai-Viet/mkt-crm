import { Field, InputType, Int } from '@nestjs/graphql';

import { IsOptional, IsString, IsNumber } from 'class-validator';

import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';

@InputType()
export class KpiScorecardInput {
  @Field(() => DashboardPeriod)
  period: DashboardPeriod;

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
