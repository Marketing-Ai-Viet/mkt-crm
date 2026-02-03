import { Field, InputType } from '@nestjs/graphql';

import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

/**
 * Input để user tự cập nhật profile của mình
 * Không có memberId vì sẽ lấy từ token
 * Chỉ cho phép update các field cá nhân, không cho phép update departmentId, permissionTemplateId, etc.
 */
@InputType()
export class UpdateMyProfileInput {
  @Field(() => String, {
    nullable: true,
    description: 'New email address (must be unique)',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase?.().trim() ?? value)
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

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
  calendarStartDay?: number;
}
