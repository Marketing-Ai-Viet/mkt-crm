import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MailerService } from 'src/mkt-core/infrastructure/mailer/mailer.service';
import { LoginToken2FA } from 'src/mkt-core/libs/otp/dto/otp.entity';
import { GoogleAuthVerifyTempResult, OtpSetupTempResult, OtpVerifyTempResult } from './dto/otp-auth.entity';
import { OtpAuthAppService } from './otp-auth-app.service';
import { OtpService } from './otp.service';

@Resolver()
export class OtpResolver {
  constructor(
    private readonly otpService: OtpService,
    private readonly otpAppService: OtpAuthAppService,
    private readonly mailerService: MailerService,
  ) {
    console.log('OtpResolver LOADED ✅');
  }

  @Mutation(() => LoginToken2FA)
  async sendOtpToUser(
    @Args('userId') userId: string,
    @Args('userMail') userMail: string,
  ): Promise<LoginToken2FA> {
    const otp = this.otpService.generate6DigitCode();

    await this.otpService.saveOtpForUser(userId, otp);

    try {
      await this.mailerService.sendMail(
        userMail,
        'Your OTP Code',
        `<p>Your OTP code is: <strong>${otp}</strong></p>`,
      );
    } catch (error) {
      console.error('Error send OTP for user:', error);
      return {
        message: `Error send OTP for user: ${error.message}`,
        requiresTwoFactor: false,
      };
    }

    return {
      message: `otpCode has been sent to your email`,
      requiresTwoFactor: true,
    };
  }

  @Mutation(() => OtpVerifyTempResult)
  async verifyOtp(@Args('userId') userId: string, @Args('otp') otp: string) {
    return this.otpService.verifyOtpForUser(userId, otp);
  }

  @Mutation(() => GoogleAuthVerifyTempResult)
  async verifyGoogleOtp(
    @Args('email') email: string,
    @Args('otp') otp: string,
  ) {
    return this.otpAppService.verifyGoogleAuthOtp(email, otp);
  }

  @Mutation(() => OtpSetupTempResult)
  async generateTempOtpSecret(
    @Args('email') email: string,
  ): Promise<OtpSetupTempResult> {
    return this.otpAppService.generateTempOtpSecret(email);
  }

  @Mutation(() => OtpSetupTempResult)
  async setupGoogleAuthOtp(
    @Args('email') email: string,
  ): Promise<OtpSetupTempResult> {
    return this.otpAppService.setupGoogleAuthOtp(email);
  }

  // ... thêm mutation khác nếu cần
}
