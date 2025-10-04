import { ArgsType, Field } from '@nestjs/graphql';

import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

@ArgsType()
export class UserCredentialsInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/,
    {
      message:
        'Password must be 8-16 chars, include upper, lower, number & special char',
    },
  )
  password: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  captchaToken?: string;
}
