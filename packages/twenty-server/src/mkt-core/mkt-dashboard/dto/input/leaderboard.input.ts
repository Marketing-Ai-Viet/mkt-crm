import { Field, InputType, Int } from '@nestjs/graphql';

import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';

@InputType()
export class LeaderboardInput {
  @Field(() => DashboardPeriod)
  period: DashboardPeriod;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Filter by specific staff (workspaceMemberId)',
  })
  @IsOptional()
  @IsString()
  staffId?: string;

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
