import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

@ArgsType()
export class MtkTwoFacetorAuthSetOtpSendMailInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  loginToken: string;

  @Field(() => Int)
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  ttl: number;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  origin: string;
}
