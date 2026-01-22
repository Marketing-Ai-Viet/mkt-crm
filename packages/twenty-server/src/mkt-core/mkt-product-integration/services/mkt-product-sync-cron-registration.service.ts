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
import {
  MKT_SYNC_CONFIG,
  MKT_PRODUCT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-product-integration/constants';
import {
  MktProductScheduledSyncJob,
  MktProductScheduledSyncJobData,
} from 'src/mkt-core/mkt-product-integration/jobs';

/**
 * Service tự động đăng ký cron job cho Product Sync khi module khởi động
 *
 * Tự động query active workspaces từ DB và đăng ký cron jobs.
 *
 * Environment variables:
 * - MKT_SCHEDULED_SYNC_ENABLED: Enable/disable (default: true)
 */
@Injectable()
export class MktProductSyncCronRegistrationService extends BaseCronRegistrationService {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    messageQueueService: MessageQueueService,
    @InjectRepository(Workspace, 'core')
    workspaceRepository: Repository<Workspace>,
  ) {
    super(messageQueueService, workspaceRepository);
  }

  protected getLogContext(): string {
    return `${MKT_PRODUCT_LOG_CONTEXT}:CronRegistration`;
  }

  protected isEnabled(): boolean {
    return MKT_SYNC_CONFIG.SCHEDULED_SYNC_ENABLED;
  }

  protected getCronJobsForWorkspace(
    workspaceId: string,
  ): CronJobConfig<MktProductScheduledSyncJobData>[] {
    return [
      {
        jobName: MktProductScheduledSyncJob.name,
        pattern: MKT_SYNC_CONFIG.SCHEDULED_SYNC_CRON,
        data: { workspaceId },
        description: 'Sync products from MKT Server',
      },
    ];
  }
}
