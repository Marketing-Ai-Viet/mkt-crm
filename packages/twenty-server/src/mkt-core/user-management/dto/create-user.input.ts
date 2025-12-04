import { Field, InputType } from '@nestjs/graphql';

import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field(() => Date)
  @IsDate()
  startDate: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => Number, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  position?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  canImpersonate = true;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  canAdmin = false;

  @Field(() => String, { defaultValue: 'en' })
  @IsString()
  language = 'en';

  @Field(() => String, { nullable: true, defaultValue: null })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null = null;

  @Field(() => Number, { nullable: true, defaultValue: 7 })
  @IsOptional()
  @IsNumber()
  calendarStartDay?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  teamId?: string;

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
  employmentStatusId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  organizationLevelId?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  roleId: string;
}
