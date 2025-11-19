import { Injectable, Logger } from '@nestjs/common';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { ObjectRecordCreateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-create.event';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MKT_EMAIL_STATUS } from 'src/mkt-core/email/constants/mkt-email.constant';
import { MktEmailService } from 'src/mkt-core/email/service/mkt-email.service';
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/order/constants/mkt-template.constant';
import { MktTemplateWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-template.workspace-entity';

@Injectable()
export class MktCustomerEventListener {
  private readonly logger = new Logger(MktCustomerEventListener.name);

  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly mktEmailService: MktEmailService,
  ) {}

  @OnDatabaseBatchEvent('mktCustomer', DatabaseEventAction.CREATED)
  async handleCreateCustomer(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<MktCustomerWorkspaceEntity>
    >,
  ) {
    this.logger.log(
      `Received create mktCustomer event for workspace ${payload.workspaceId}`,
    );

    for (const event of payload.events) {
      const customer = event.properties.after;

      if (!customer) {
        this.logger.warn('No customer data in event, skipping');
        continue;
      }

      if (!customer.email) {
        this.logger.warn(
          `Customer ${customer.id} has no email, skipping welcome email`,
        );
        continue;
      }

      try {
        // Ensure repository operations use the correct workspace
        this.mktRepo.workspaceId = payload.workspaceId;

        const templateRepo = await this.mktRepo.getRepository(
          MktTemplateWorkspaceEntity,
        );

        // Try Vietnamese first, then fallback to English
        const template = await templateRepo.findOne({
          where: {
            templateKey: 'welcome_customers',
          },
        });

        if (!template) {
          this.logger.warn(
            'Welcome email template not found, skipping email send',
          );
          continue;
        }

        const companyName = 'Phần Mềm MKT';

        // Replace common placeholders (support {{customer_name}} / {customer_name} and company)
        const replaceAll = (input: string) =>
          input
            .replace(/{{\s*customer_name\s*}}/g, customer.name || '')
            .replace(/{\s*customer_name\s*}/g, customer.name || '')
            .replace(/{{\s*company_name\s*}}/g, companyName)
            .replace(/{\s*company_name\s*}/g, companyName);

        const subject = replaceAll(template.name || '');
        const html = replaceAll(template.content || '');

        const emailData = {
          from: `${this.twentyConfigService.get('EMAIL_FROM_NAME')} <${this.twentyConfigService.get('EMAIL_FROM_ADDRESS')}>`,
          to: customer.email,
          subject,
        };

        await this.emailService.send({ ...emailData, html });
        this.mktEmailService.save({
          ...emailData,
          body: html,
          status: MKT_EMAIL_STATUS.SENT,
          emailType: MKT_TEMPLATE_TYPE.WELCOME_EMAIL,
          sentAt: new Date(),
        });

        this.logger.log(
          `Sent welcome email to customer ${customer.id} (${customer.email})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send welcome email to customer ${customer.id}`,
        );
      }
    }
  }
}
