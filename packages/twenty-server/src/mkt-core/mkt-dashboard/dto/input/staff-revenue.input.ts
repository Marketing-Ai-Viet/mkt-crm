import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { RevenueMode } from 'src/mkt-core/mkt-dashboard/types/revenue-mode.type';
import { DepartmentScope } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-daily.input';

@InputType()
export class StaffRevenueInput {
  @Field(() => DashboardPeriod, {
    nullable: true,
    defaultValue: DashboardPeriod.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  startDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  endDate?: string;

  @Field(() => DepartmentScope, {
    nullable: true,
    defaultValue: DepartmentScope.ALL,
  })
  @IsOptional()
  @IsEnum(DepartmentScope)
  departmentScope?: DepartmentScope;

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

  @Field(() => RevenueMode, {
    nullable: true,
    defaultValue: RevenueMode.DUAL,
  })
  @IsOptional()
  @IsEnum(RevenueMode)
  revenueMode?: RevenueMode;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
