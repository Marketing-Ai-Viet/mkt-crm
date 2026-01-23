import { Injectable, Logger } from '@nestjs/common';

import { EmailService } from 'src/engine/core-modules/email/email.service';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { MktTemplateRepository } from 'src/mkt-core/mkt-email/repositories';
import {
  MktTemplateType,
  MktTemplateWorkspaceEntity,
} from 'src/mkt-core/mkt-email/workspace-entities';
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/mkt-email/workspace-entities/mkt-template.workspace-entity';

const DEFAULT_LOCALE = 'en';

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly templateRepository: MktTemplateRepository,
  ) {}

  async sendWelcomeEmail(
    workspaceId: string,
    email: string,
    password: string,
    locale: string = DEFAULT_LOCALE,
  ): Promise<void> {
    const template = await this.getEmailTemplate(
      workspaceId,
      MKT_TEMPLATE_TYPE.WELCOME_EMAIL,
      locale,
    );

    if (!template) {
      this.logger.warn('Welcome email template not found');

      return;
    }

    const htmlContent = template.content?.replace('{{password}}', password);

    await this.emailService.send({
      from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
      to: email,
      subject: template.subject ?? 'Welcome',
      html: htmlContent ?? '',
    });

    this.logger.log(`Welcome email sent to: ${email}`);
  }

  async sendAccountUpdateEmail(
    workspaceId: string,
    email: string,
    locale: string = DEFAULT_LOCALE,
  ): Promise<void> {
    const template = await this.getEmailTemplate(
      workspaceId,
      MKT_TEMPLATE_TYPE.ACCOUNT_UPDATE_EMAIL,
      locale,
    );

    if (!template) {
      this.logger.warn('Account update email template not found');

      return;
    }

    await this.emailService.send({
      from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
      to: email,
      subject: template.subject ?? 'Account Updated',
      html: template.content ?? '',
    });

    this.logger.log(`Account update email sent to: ${email}`);
  }

  private async getEmailTemplate(
    workspaceId: string,
    type: MktTemplateType,
    locale: string = DEFAULT_LOCALE,
  ): Promise<MktTemplateWorkspaceEntity | null> {
    // Try to find template with exact locale first
    let template = await this.templateRepository.findEmailTemplate(
      workspaceId,
      type,
      locale,
    );

    // Fallback to default locale if not found
    if (!template && locale !== DEFAULT_LOCALE) {
      template = await this.templateRepository.findEmailTemplate(
        workspaceId,
        type,
        DEFAULT_LOCALE,
      );
    }

    return template;
  }
}
