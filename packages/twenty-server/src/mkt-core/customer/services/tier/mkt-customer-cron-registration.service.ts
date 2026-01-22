import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  BaseCronRegistrationService,
  CronJobConfig,
} from 'src/mkt-core/infrastructure/cron-registration';
import { MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN } from 'src/mkt-core/customer/constants/mkt-customer-tier.constants';
import { MKT_CUSTOMER_CATEGORIZATION_CRON_PATTERN } from 'src/mkt-core/customer/constants/mkt-customer-categorization.constants';
import {
  MktCustomerTierCronJob,
  TierUpdateCronJobData,
} from 'src/mkt-core/customer/jobs/mkt-customer-tier.cron.job';
import {
  MktCustomerCategorizationCronJob,
  CategorizationCronJobData,
} from 'src/mkt-core/customer/jobs/mkt-customer-categorization.cron.job';

/**
 * Service tự động đăng ký customer cron jobs khi module khởi động
 *
 * Tự động query active workspaces từ DB và đăng ký cron jobs.
 *
 * Jobs được đăng ký:
 * - MktCustomerTierCronJob: Daily at 2:15 AM - Update customer tiers
 * - MktCustomerCategorizationCronJob: Daily at 2:00 AM - Categorize customers
 *
 * Environment variables:
 * - MKT_CUSTOMER_CRON_ENABLED: Enable/disable customer cron jobs (default: true)
 */
@Injectable()
export class MktCustomerCronRegistrationService extends BaseCronRegistrationService {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    messageQueueService: MessageQueueService,
    @InjectRepository(Workspace, 'core')
    workspaceRepository: Repository<Workspace>,
  ) {
    super(messageQueueService, workspaceRepository);
  }

  protected getLogContext(): string {
    return 'MktCustomer:CronRegistration';
  }

  protected isEnabled(): boolean {
    return process.env.MKT_CUSTOMER_CRON_ENABLED !== 'false';
  }

  protected getCronJobsForWorkspace(
    workspaceId: string,
  ): CronJobConfig<TierUpdateCronJobData | CategorizationCronJobData>[] {
    return [
      {
        jobName: MktCustomerTierCronJob.name,
        pattern: MKT_CUSTOMER_TIER_UPDATE_CRON_PATTERN,
        data: { workspaceId } as TierUpdateCronJobData,
        description: 'Update customer tiers based on order history',
      },
      {
        jobName: MktCustomerCategorizationCronJob.name,
        pattern: MKT_CUSTOMER_CATEGORIZATION_CRON_PATTERN,
        data: { workspaceId } as CategorizationCronJobData,
        description: 'Categorize customers (active, dormant, churned)',
      },
    ];
  }
}
