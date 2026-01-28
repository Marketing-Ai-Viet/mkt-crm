import { Field, InputType, Int } from '@nestjs/graphql';

import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@InputType()
export class SearchUserInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  keyword?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  memberCode?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  status?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  memberType?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  organizationLevelId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  employmentStatusId?: string;

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
