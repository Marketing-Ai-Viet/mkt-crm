import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { RevenueMode } from 'src/mkt-core/mkt-dashboard/types/revenue-mode.type';
import { DepartmentScope } from 'src/mkt-core/mkt-dashboard/dto/input/revenue-daily.input';

@InputType()
export class RevenueDailyByMonthInput {
  @Field(() => Int, { description: 'Nam (calendar year)' })
  @IsNumber()
  @Min(2020)
  year: number;

  @Field(() => Int, { description: 'Thang (1-12)' })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @Field(() => DepartmentScope, {
    nullable: true,
    defaultValue: DepartmentScope.ALL,
    description:
      'Pham vi grouping: ALL (tong hop), BY_TEAM, BY_DEPARTMENT. Mac dinh ALL.',
  })
  @IsOptional()
  @IsEnum(DepartmentScope)
  departmentScope?: DepartmentScope;

  @Field(() => String, {
    nullable: true,
    description: 'Filter theo departmentId cu the',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => RevenueMode, {
    nullable: true,
    defaultValue: RevenueMode.DUAL,
    description:
      'Che do tinh doanh thu. Mac dinh DUAL (ca hai). Frontend cu khong gui field nay van hoat dong binh thuong.',
  })
  @IsOptional()
  @IsEnum(RevenueMode)
  revenueMode?: RevenueMode;
}
