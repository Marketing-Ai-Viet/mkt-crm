import { Field, ObjectType } from '@nestjs/graphql';

import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';
@ObjectType()
export class UserOutput {
  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => String)
  @IsString()
  language: string;

  @Field(() => String, { nullable: true })
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
