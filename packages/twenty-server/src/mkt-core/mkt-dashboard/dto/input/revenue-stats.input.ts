import { Field, InputType, Int } from '@nestjs/graphql';

import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';

import { DashboardPeriod } from 'src/mkt-core/mkt-dashboard/types/dashboard-period.type';
import { RevenueMode } from 'src/mkt-core/mkt-dashboard/types/revenue-mode.type';

@InputType()
export class RevenueStatsInput {
  @Field(() => DashboardPeriod)
  period: DashboardPeriod;

  @Field(() => RevenueMode, {
    nullable: true,
    defaultValue: RevenueMode.DUAL,
    description:
      'Chế độ tính doanh thu. Mặc định DUAL (cả hai). Frontend cũ không gửi field này vẫn hoạt động bình thường.',
  })
  @IsOptional()
  @IsEnum(RevenueMode)
  revenueMode?: RevenueMode;

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

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
