import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { AuthTokens } from 'src/engine/core-modules/auth/dto/token.entity';
import { AuthService } from 'src/engine/core-modules/auth/services/auth.service';
import { LoginTokenService } from 'src/engine/core-modules/auth/token/services/login-token.service';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { CacheStorageNamespace } from 'src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum';
import { DomainManagerService } from 'src/engine/core-modules/domain-manager/services/domain-manager.service';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserService } from 'src/engine/core-modules/user/services/user.service';
import { workspaceValidator } from 'src/engine/core-modules/workspace/workspace.validate';
import { MktTemplateRepository } from 'src/mkt-core/mkt-sendmail-template/repositories';
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/mkt-sendmail-template/workspace-entity/mkt-template.workspace-entity';
import { MtkTwoFacetorAuthGetOtpSendMailInput } from 'src/mkt-core/mkt-two-facetor-authentication/dto/mtkTwoFacetorAuthGetOtpSendMail.input';
import { MtkTwoFacetorAuthSetOtpSendMailInput } from 'src/mkt-core/mkt-two-facetor-authentication/dto/mtkTwoFacetorAuthSetOtpSendMail.input';

const DEFAULT_LOCALE = 'en';

@Injectable()
export class MktTwoFacetorAuthenticationService {
  private readonly logger = new Logger(MktTwoFacetorAuthenticationService.name);

  constructor(
    private authService: AuthService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly loginTokenService: LoginTokenService,
    private readonly domainManagerService: DomainManagerService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly templateRepository: MktTemplateRepository,
    @Inject(CacheStorageNamespace.EngineHealth)
    private readonly cache: CacheStorageService,
  ) {}

  /**
   * Gửi mã OTP xác thực hai yếu tố qua email cho người dùng.
   *
   * @param otp - Mã OTP được sinh ra ngẫu nhiên
   * @param mtkTwoFacetorAuthSetOtpSendMailInput - Dữ liệu đầu vào gồm loginToken, origin, language, ttl,...
   * @returns true nếu gửi email thành công, ngược lại ném lỗi
   */
  async mtkTwoFacetorAuthSetOtpSendMail(
    otp: number | string,
    mtkTwoFacetorAuthSetOtpSendMailInput: MtkTwoFacetorAuthSetOtpSendMailInput,
  ): Promise<boolean> {
    this.logger.log('[2FA] Start sending OTP via email...');

    // Xác thực loginToken và lấy email người dùng + workspaceId từ token
    const { sub: userEmail, workspaceId: tokenWorkspaceId } =
      await this.loginTokenService.verifyLoginToken(
        mtkTwoFacetorAuthSetOtpSendMailInput.loginToken,
      );

    this.logger.log(`[2FA] Token verified for user: ${userEmail}`);

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

    this.logger.log(`[2FA] Workspace resolved: ${workspace.id}`);

    // Kiểm tra workspaceId trong token có khớp với workspace hiện tại không
    if (tokenWorkspaceId !== workspace.id) {
      this.logger.warn(
        `[2FA] Token workspace mismatch: token=${tokenWorkspaceId}, current=${workspace.id}`,
      );
      throw new AuthException(
        'Token is not valid for this workspace',
        AuthExceptionCode.FORBIDDEN_EXCEPTION,
      );
    }

    // Lấy thông tin người dùng theo email
    const user = await this.userService.getUserByEmail(userEmail);

    if (!user) {
      this.logger.warn(`[2FA] User not found: ${userEmail}`);
      throw new AuthException(
        'User not found',
        AuthExceptionCode.USER_NOT_FOUND,
      );
    }

    // Lưu OTP vào Redis
    const otpKey = `twofa:otp:${user.id}:${workspace.id}`;

    await this.cache.set(
      otpKey,
      otp.toString(),
      +mtkTwoFacetorAuthSetOtpSendMailInput.ttl,
    );

    this.logger.log(
      `[2FA] OTP cached with key ${otpKey} (TTL=${mtkTwoFacetorAuthSetOtpSendMailInput.ttl}s)`,
    );

    // Lấy template gửi mail phù hợp (theo ngôn ngữ)
    const locale =
      mtkTwoFacetorAuthSetOtpSendMailInput.language || DEFAULT_LOCALE;
    let template = await this.templateRepository.findEmailTemplate(
      workspace.id,
      MKT_TEMPLATE_TYPE.TWO_FACTOR_AUTH,
      locale,
    );

    // Fallback to default locale if not found
    if (!template && locale !== DEFAULT_LOCALE) {
      template = await this.templateRepository.findEmailTemplate(
        workspace.id,
        MKT_TEMPLATE_TYPE.TWO_FACTOR_AUTH,
        DEFAULT_LOCALE,
      );
    }

    if (!template) {
      this.logger.error(
        `[2FA] Email template not found for type=${MKT_TEMPLATE_TYPE.TWO_FACTOR_AUTH}, locale=${locale}`,
      );
      throw new InternalServerErrorException('Email template not found');
    }

    // Gửi email chứa mã OTP cho người dùng
    try {
      this.logger.log(`[2FA] Sending OTP email to ${user.email}...`);
      const htmlContent =
        template.content?.replace('{{otp}}', otp.toString()) ?? '';

      await this.emailService.send({
        from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
        to: user.email,
        subject: template.subject ?? 'Two Factor Authentication',
        html: htmlContent,
      });
      this.logger.log(`[2FA] OTP email sent successfully to ${user.email}`);
    } catch (error) {
      this.logger.error(
        `[2FA] Failed to send OTP email to ${user.email}`,
        error,
      );
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
  ): Promise<AuthTokens> {
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

    // Lấy OTP từ Redis
    const otpKey = `twofa:otp:${user.id}:${workspace.id}`;
    const otp = await this.cache.get<string>(otpKey);

    if (otp && +otp === mtkTwoFacetorAuthGetOtpSendMailInput.otp) {
      await this.cache.del(otpKey);

      return this.authService.verify(userEmail, workspace.id);
    }

    throw new AuthException('Invalid OTP', AuthExceptionCode.INVALID_OTP);
  }
}
