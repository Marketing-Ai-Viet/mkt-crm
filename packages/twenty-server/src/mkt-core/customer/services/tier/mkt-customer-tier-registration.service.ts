import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MktCustomerTierCronJob } from 'src/mkt-core/customer/commands/mkt-customer-tier.cron.job';
import { MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN } from 'src/mkt-core/customer/constants/mkt-customer-tier.constants';

@Injectable()
export class MktCustomerTierRegistrationService {
  private readonly logger = new Logger(MktCustomerTierRegistrationService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly configService: ConfigService,
  ) {}

  public async register(): Promise<void> {
    const workspaceId =
      this.configService.get<string>('MKT_WORKSPACE_ID') ||
      '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

    this.logger.log(
      `🛠 Registering MktCustomerTierCronJob for workspace: ${workspaceId}`,
    );

    if (!workspaceId) return;

    const pattern =
      process.env['MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN'] ||
      MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN;

    // Register cron job to update all customer tiers
    await this.messageQueueService.addCron({
      jobName: MktCustomerTierCronJob.name,
      data: { workspaceId },
      options: {
        repeat: {
          pattern,
        },
      },
    });

    this.logger.log('Customer tier update cron job registration completed');
  }
}
