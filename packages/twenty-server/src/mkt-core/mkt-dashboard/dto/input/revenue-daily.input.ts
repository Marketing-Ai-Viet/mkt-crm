import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

import { RevenueMode } from 'src/mkt-core/mkt-dashboard/types/revenue-mode.type';

const MAX_WEEK_RANGE = 12;

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

@ValidatorConstraint({ name: 'weekEndRange', async: false })
export class WeekEndRangeConstraint implements ValidatorConstraintInterface {
  validate(weekEnd: number, args: ValidationArguments): boolean {
    const obj = args.object as RevenueDailyInput;

    if (weekEnd == null) return true;
    if (obj.week != null && weekEnd < obj.week) return false;
    if (obj.week != null && weekEnd - obj.week + 1 > MAX_WEEK_RANGE)
      return false;

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as RevenueDailyInput;

    if (obj.week != null && (args.value as number) < obj.week) {
      return `weekEnd ($value) must be >= week (${obj.week})`;
    }

    return `Week range must not exceed ${MAX_WEEK_RANGE} weeks`;
  }
}

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

  @Field(() => Int, {
    nullable: true,
    description:
      'Tuần kết thúc (ISO week number 1-53). Khi truyền, query trả dữ liệu từ week→weekEnd. Max range: 12 tuần.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(53)
  @Validate(WeekEndRangeConstraint)
  weekEnd?: number;

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
