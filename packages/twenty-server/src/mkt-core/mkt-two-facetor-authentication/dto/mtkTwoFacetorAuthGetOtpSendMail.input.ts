import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

@ArgsType()
export class MtkTwoFacetorAuthGetOtpSendMailInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  loginToken: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  origin: string;

  @Field(() => Number)
  @IsNotEmpty()
  @IsNumber()
  otp: number;
}
