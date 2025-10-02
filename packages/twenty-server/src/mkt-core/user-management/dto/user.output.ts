import { Field, ObjectType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';

import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
@ObjectType()
export class UserOutput {
  @Field(() => String)
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  isEmailVerified = false;

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  canImpersonate = true;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  canAdmin = false;

  @Field(() => String, { defaultValue: 'en' })
  @IsString()
  language: string;

  @Field(() => String, { nullable: true, defaultValue: null })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null = null;

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
}
