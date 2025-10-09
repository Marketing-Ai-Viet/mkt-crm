import { Args, Field, Mutation, ObjectType, Resolver } from '@nestjs/graphql';

import { AuthTokens } from 'src/engine/core-modules/auth/dto/token.entity';
import { MtkTwoFacetorAuthGetOtpSendMailInput } from 'src/mkt-core/mkt-two-facetor-authentication/dto/mtkTwoFacetorAuthGetOtpSendMail.input';
import { MtkTwoFacetorAuthSetOtpSendMailInput } from 'src/mkt-core/mkt-two-facetor-authentication/dto/mtkTwoFacetorAuthSetOtpSendMail.input';
import { MktTwoFacetorAuthenticationService } from './mkt-two-facetor-authentication.service';

@ObjectType()
export class SimpleAuthResponse {
  @Field(() => String)
  accessToken: string;

  @Field(() => String)
  refreshToken: string;
}

@Resolver()
export class MktTwoFacetorAuthenticationResolver {
  constructor(
    private readonly mktTwoFacetorAuthenticationService: MktTwoFacetorAuthenticationService,
  ) {}

  @Mutation(() => Boolean)
  async mtkTwoFacetorAuthSetOtpSendMail(
    @Args()
    mtkTwoFacetorAuthSetOtpSendMailInput: MtkTwoFacetorAuthSetOtpSendMailInput,
  ) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return this.mktTwoFacetorAuthenticationService.mtkTwoFacetorAuthSetOtpSendMail(
      otp,
      mtkTwoFacetorAuthSetOtpSendMailInput,
    );
  }

  @Mutation(() => AuthTokens)
  async mktTwoFacetorAuthGetOtpMail(
    @Args()
    mtkTwoFacetorAuthGetOtpSendMailInput: MtkTwoFacetorAuthGetOtpSendMailInput,
  ): Promise<AuthTokens> {
    return this.mktTwoFacetorAuthenticationService.mktTwoFacetorAuthGetOtpMail(
      mtkTwoFacetorAuthGetOtpSendMailInput,
    );
  }
}
