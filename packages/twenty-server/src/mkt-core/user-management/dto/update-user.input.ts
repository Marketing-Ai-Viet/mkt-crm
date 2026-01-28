import { Field, InputType } from '@nestjs/graphql';

import { IsDate, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

@InputType()
export class UpdateUserInput {
  @Field(() => String)
  @IsString()
  memberId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  endDate?: Date | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null;

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
  grade?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Permission Template ID - defines role in department',
  })
  @IsOptional()
  @IsString()
  permissionTemplateId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  organizationLevelId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  employmentStatusId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  locale?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  timeZone?: string;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsNumber()
  position?: number;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsNumber()
  calendarStartDay?: number;
}
