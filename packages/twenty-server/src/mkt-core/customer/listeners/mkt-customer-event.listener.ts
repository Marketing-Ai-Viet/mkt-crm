import { Injectable, Logger } from '@nestjs/common';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { EmailService } from 'src/engine/core-modules/email/email.service';
import { ObjectRecordCreateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-create.event';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event.type';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerAutoAssignService } from 'src/mkt-core/customer/services/lifecycle/mkt-customer-auto-assign.service';
import { MKT_EMAIL_STATUS } from 'src/mkt-core/mkt-email/constants';
import { MktEmailService } from 'src/mkt-core/mkt-email/services';
import { MktTemplateRepository } from 'src/mkt-core/mkt-email/repositories';
import { MKT_TEMPLATE_TYPE } from 'src/mkt-core/order/constants/mkt-template.constant';

/**
 * MktCustomerEventListener - Handles customer lifecycle events
 *
 * Uses MktTemplateRepository for thread-safe template access
 */
@Injectable()
export class MktCustomerEventListener {
  private readonly logger = new Logger(MktCustomerEventListener.name);

  constructor(
    private readonly templateRepository: MktTemplateRepository,
    private readonly emailService: EmailService,
    private readonly twentyConfigService: TwentyConfigService,
    private readonly mktEmailService: MktEmailService,
    private readonly autoAssignService: MktCustomerAutoAssignService,
  ) {}

  @OnDatabaseBatchEvent('mktCustomer', DatabaseEventAction.CREATED)
  async handleCreateCustomer(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<MktCustomerWorkspaceEntity>
    >,
  ) {
    const { workspaceId } = payload;

    if (!workspaceId) {
      this.logger.warn(CUSTOMER_MESSAGES.WARN.MISSING_WORKSPACE_ID);

      return;
    }

    this.logger.log(
      `Received create mktCustomer event for workspace ${workspaceId}`,
    );

    for (const event of payload.events) {
      const customer = event.properties.after;

      if (!customer) {
        this.logger.warn('No customer data in event, skipping');
        continue;
      }

      if (!customer.email) {
        this.logger.warn(
          CUSTOMER_MESSAGES.WARN.CUSTOMER_HAS_NO_EMAIL(customer.id),
        );
        continue;
      }

      try {
        // Auto-assign customer to sales member
        // Pass workspaceId directly to avoid race condition
        await this.autoAssignService.assignCustomer(customer, workspaceId);

        // Send welcome email
        await this.sendWelcomeEmail(workspaceId, customer);

        this.logger.log(
          CUSTOMER_MESSAGES.LOG.CUSTOMER_CREATED_PROCESSED(customer.id),
        );
      } catch (error) {
        this.logger.error(
          CUSTOMER_MESSAGES.ERROR.CUSTOMER_CREATED_FAILED(customer.id),
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Send welcome email to new customer
   * Uses MktTemplateRepository for thread-safe template access
   */
  private async sendWelcomeEmail(
    workspaceId: string,
    customer: MktCustomerWorkspaceEntity,
  ): Promise<void> {
    const template =
      await this.templateRepository.findByKey('welcome_customers');

    if (!template) {
      this.logger.warn(CUSTOMER_MESSAGES.WARN.TEMPLATE_NOT_FOUND);

      return;
    }

    const companyName = 'Phần Mềm MKT';

    // Replace common placeholders
    const replaceAll = (input: string) =>
      input
        .replace(/{{\s*customer_name\s*}}/g, customer.name ?? '')
        .replace(/{\s*customer_name\s*}/g, customer.name ?? '')
        .replace(/{{\s*company_name\s*}}/g, companyName)
        .replace(/{\s*company_name\s*}/g, companyName);

    const subject = replaceAll(template.name ?? '');
    const html = replaceAll(template.content ?? '');

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
      sentAt: DateTimeUtils.now().toJSDate(),
    });

    this.logger.log(
      `Sent welcome email to customer ${customer.id} (${customer.email})`,
    );
  }
}
