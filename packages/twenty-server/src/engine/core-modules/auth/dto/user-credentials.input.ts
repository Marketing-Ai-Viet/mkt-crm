import { ArgsType, Field } from '@nestjs/graphql';

import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { PASSWORD_REGEX } from 'src/engine/core-modules/auth/auth.util';

@ArgsType()
export class UserCredentialsInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must be 8-16 chars, include upper, lower, number & special char',
  })
  password: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  captchaToken?: string;
}
