import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { MtkTwoFacetorAuthGetOtpSendMailInput } from 'src/mkt-core/mkt-two-facetor-authentication/dto/mtkTwoFacetorAuthGetOtpSendMail.input';
import { MtkTwoFacetorAuthSetOtpSendMailInput } from 'src/mkt-core/mkt-two-facetor-authentication/dto/mtkTwoFacetorAuthSetOtpSendMail.input';
import { MktTwoFacetorAuthenticationService } from './mkt-two-facetor-authentication.service';

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

  @Mutation(() => String, { nullable: true })
  async mktTwoFacetorAuthGetOtpMail(
    @Args()
    mtkTwoFacetorAuthGetOtpSendMailInput: MtkTwoFacetorAuthGetOtpSendMailInput,
  ): Promise<Boolean> {
    return this.mktTwoFacetorAuthenticationService.mktTwoFacetorAuthGetOtpMail(
      mtkTwoFacetorAuthGetOtpSendMailInput,
    );
  }
}
