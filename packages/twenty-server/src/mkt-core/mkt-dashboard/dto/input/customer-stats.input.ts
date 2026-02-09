import { Field, InputType, Int } from '@nestjs/graphql';

import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';

@InputType()
export class CustomerStatsInput {
  @Field(() => DashboardPeriod)
  period: DashboardPeriod;

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
  topCustomersLimit?: number;
}
