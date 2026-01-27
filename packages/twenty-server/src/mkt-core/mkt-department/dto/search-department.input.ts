import { Field, InputType, Int } from '@nestjs/graphql';

import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@InputType()
export class SearchDepartmentInput {
  @Field(() => String, {
    nullable: true,
    description: 'Tìm kiếm theo tên',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Lọc theo mã phòng ban',
  })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Lọc theo loại phòng ban',
  })
  @IsOptional()
  @IsString()
  departmentType?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Lọc theo manager ID',
  })
  @IsOptional()
  @IsString()
  managerId?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Lọc theo trạng thái active',
  })
  @IsOptional()
  isActive?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Lọc theo requiresKpiTracking',
  })
  @IsOptional()
  requiresKpiTracking?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: DEFAULT_PAGE })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @Field(() => Int, { nullable: true, defaultValue: DEFAULT_LIMIT })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;
}
