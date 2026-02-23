import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { RevenueMode } from 'src/mkt-core/mkt-dashboard/types/revenue-mode.type';

export enum DepartmentScope {
  ALL = 'ALL',
  BY_TEAM = 'BY_TEAM',
  BY_DEPARTMENT = 'BY_DEPARTMENT',
}

registerEnumType(DepartmentScope, {
  name: 'DepartmentScope',
  description:
    'Phạm vi grouping theo phòng ban: ALL (tổng hợp), BY_TEAM (theo team), BY_DEPARTMENT (theo phòng ban)',
  valuesMap: {
    ALL: { description: 'Tổng hợp toàn bộ, không phân tách theo phòng ban' },
    BY_TEAM: { description: 'Phân tách theo team (departmentType = TEAM)' },
    BY_DEPARTMENT: {
      description: 'Phân tách theo phòng ban (departmentType = DEPARTMENT)',
    },
  },
});

@InputType()
export class RevenueDailyInput {
  @Field(() => Int, { description: 'Năm (ISO week year)' })
  @IsNumber()
  @Min(2020)
  year: number;

  @Field(() => Int, {
    nullable: true,
    description: 'ISO week number (1-53). Mặc định = tuần hiện tại.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(53)
  week?: number;

  @Field(() => DepartmentScope, {
    nullable: true,
    defaultValue: DepartmentScope.ALL,
    description:
      'Phạm vi grouping: ALL (tổng hợp), BY_TEAM, BY_DEPARTMENT. Mặc định ALL.',
  })
  @IsOptional()
  @IsEnum(DepartmentScope)
  departmentScope?: DepartmentScope;

  @Field(() => String, {
    nullable: true,
    description: 'Filter theo departmentId cụ thể',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => RevenueMode, {
    nullable: true,
    defaultValue: RevenueMode.DUAL,
    description:
      'Chế độ tính doanh thu. Mặc định DUAL (cả hai). Frontend cũ không gửi field này vẫn hoạt động bình thường.',
  })
  @IsOptional()
  @IsEnum(RevenueMode)
  revenueMode?: RevenueMode;
}
