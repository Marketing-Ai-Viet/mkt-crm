import { Inject, Injectable } from '@nestjs/common';
import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { LoginTokenService } from 'src/engine/core-modules/auth/token/services/login-token.service';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { DomainManagerService } from 'src/engine/core-modules/domain-manager/services/domain-manager.service';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserService } from 'src/engine/core-modules/user/services/user.service';
import { workspaceValidator } from 'src/engine/core-modules/workspace/workspace.validate';
import { MtkTwoFacetorAuthGetOtpSendMailInput } from 'src/mkt-core/mkt-two-facetor-authentication/dto/mtkTwoFacetorAuthGetOtpSendMail.input';
import { MtkTwoFacetorAuthSetOtpSendMailInput } from 'src/mkt-core/mkt-two-facetor-authentication/dto/mtkTwoFacetorAuthSetOtpSendMail.input';

@Injectable()
export class MktTwoFacetorAuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly loginTokenService: LoginTokenService,
    private readonly domainManagerService: DomainManagerService,
    private readonly twentyConfigService: TwentyConfigService,
    @Inject(CacheStorageNamespace.EngineHealth)
    private readonly cache: CacheStorageService,
  ) {}

  async mtkTwoFacetorAuthSetOtpSendMail(
    otp: number | string,
    mtkTwoFacetorAuthSetOtpSendMailInput: MtkTwoFacetorAuthSetOtpSendMailInput,
  ): Promise<boolean> {
    // Xác thực loginToken và lấy email người dùng cùng workspaceId từ token
    const { sub: userEmail, workspaceId: tokenWorkspaceId } =
      await this.loginTokenService.verifyLoginToken(
        mtkTwoFacetorAuthSetOtpSendMailInput.loginToken,
      );

    // Lấy workspace dựa trên origin hoặc workspace mặc định
    const workspace =
      await this.domainManagerService.getWorkspaceByOriginOrDefaultWorkspace(
        mtkTwoFacetorAuthSetOtpSendMailInput.origin,
      );

    workspaceValidator.assertIsDefinedOrThrow(
      workspace,
      new AuthException(
        'Workspace not found',
        AuthExceptionCode.WORKSPACE_NOT_FOUND,
      ),
    );

    // Kiểm tra workspaceId trong token có khớp với workspace hiện tại không
    if (tokenWorkspaceId !== workspace.id) {
      throw new AuthException(
        'Token is not valid for this workspace',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    }

    // Lấy thông tin người dùng theo email
    const user = await this.userService.getUserByEmail(userEmail);

    if (!user) {
      throw new AuthException(
        'User not found',
        AuthExceptionCode.USER_NOT_FOUND,
      );
    }
    // luu otp vào redis
    const otpKey = `twofa:otp:${user.id}:${workspace.id}`;

    await this.cache.set(
      otpKey,
      otp.toString(),
      +mtkTwoFacetorAuthSetOtpSendMailInput.ttl,
    ); // thơi gian hết hạn 60 giây

    // Gửi email chứa mã OTP cho người dùng
    const sendMail = await this.emailService.send({
      from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
      to: user.email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
      html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
    });

    // Nếu gửi email thất bại thì ném lỗi
    if (!sendMail) {
      throw new AuthException(
        'Failed to send email',
        AuthExceptionCode.FAILED_TO_SEND_EMAIL,
      );
    }

    // Trả về true nếu gửi email thành công
    return true;
  }

  async mktTwoFacetorAuthGetOtpMail(
    mtkTwoFacetorAuthGetOtpSendMailInput: MtkTwoFacetorAuthGetOtpSendMailInput,
  ): Promise<Boolean> {
    const { sub: userEmail, workspaceId: tokenWorkspaceId } =
      await this.loginTokenService.verifyLoginToken(
        mtkTwoFacetorAuthGetOtpSendMailInput.loginToken,
      );

    // Lấy workspace dựa trên origin hoặc workspace mặc định
    const workspace =
      await this.domainManagerService.getWorkspaceByOriginOrDefaultWorkspace(
        mtkTwoFacetorAuthGetOtpSendMailInput.origin,
      );

    workspaceValidator.assertIsDefinedOrThrow(
      workspace,
      new AuthException(
        'Workspace not found',
        AuthExceptionCode.WORKSPACE_NOT_FOUND,
      ),
    );

    // Kiểm tra workspaceId trong token có khớp với workspace hiện tại không
    if (tokenWorkspaceId !== workspace.id) {
      throw new AuthException(
        'Token is not valid for this workspace',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    }

    // Lấy thông tin người dùng theo email
    const user = await this.userService.getUserByEmail(userEmail);

    if (!user) {
      throw new AuthException(
        'User not found',
        AuthExceptionCode.USER_NOT_FOUND,
      );
    }
    // luu otp vào redis

    const otpKey = `twofa:otp:${user.id}:${workspace.id}`;

    const otp = await this.cache.get<string>(otpKey);

    if (otp && +otp === mtkTwoFacetorAuthGetOtpSendMailInput.otp) {
      await this.cache.del(otpKey);
      return true;
    } else {
      throw new AuthException('Invalid OTP', AuthExceptionCode.INVALID_OTP);
    }
  }
}
