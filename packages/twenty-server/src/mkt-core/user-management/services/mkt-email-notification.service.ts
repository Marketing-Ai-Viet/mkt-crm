import { Injectable, Logger } from '@nestjs/common';

import { APP_LOCALES } from 'twenty-shared/translations';

import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_SENDMAIL_TEMPLATE_TYPE } from 'src/mkt-core/dev-seeder/constants/mkt-sendmail-template-seeds.constant.ts';
import { MktSendmailTemplateWorkspaceEntity } from 'src/mkt-core/mkt-sendmail-template/mkt-sendmail-template.workpace-entity';

@Injectable()
export class MktEmailNotificationService {
  private readonly logger = new Logger(MktEmailNotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  async sendWelcomeEmail(
    workspaceId: string,
    email: string,
    password: string,
  ): Promise<void> {
    const template = await this.getEmailTemplate(
      workspaceId,
      MKT_SENDMAIL_TEMPLATE_TYPE.WELCOME_EMAIL,
    );

    if (!template) {
      this.logger.warn('Welcome email template not found');

      return;
    }

    await this.emailService.send({
      from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
      to: email,
      subject: template.subject,
      html: template.body.replace('{{password}}', password),
    });

    this.logger.log(`Welcome email sent to: ${email}`);
  }

  async sendAccountUpdateEmail(
    workspaceId: string,
    email: string,
  ): Promise<void> {
    const template = await this.getEmailTemplate(
      workspaceId,
      MKT_SENDMAIL_TEMPLATE_TYPE.ACCOUNT_UPDATE_EMAIL,
    );

    if (!template) {
      this.logger.warn('Account update email template not found');

      return;
    }

    await this.emailService.send({
      from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
      to: email,
      subject: template.subject,
      html: template.body,
    });

    this.logger.log(`Account update email sent to: ${email}`);
  }

  private async getEmailTemplate(
    workspaceId: string,
    type: string,
  ): Promise<MktSendmailTemplateWorkspaceEntity | null> {
    const templateRepo =
      await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktSendmailTemplateWorkspaceEntity>(
        workspaceId,
        'mktSendmailTemplate',
        { shouldBypassPermissionChecks: true },
      );

    return await templateRepo.findOne({
      where: { type, language: 'en' as keyof typeof APP_LOCALES },
    });
  }
}
