import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CronExpression } from '@nestjs/schedule';

import { Repository } from 'typeorm';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  BaseCronRegistrationService,
  CronJobConfig,
} from 'src/mkt-core/infrastructure/cron-registration';
import { CASBIN_LOG_CONTEXT } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import {
  CacheWarmerJob,
  CacheWarmerJobData,
  CrossRegionReloadJob,
  CrossRegionReloadJobData,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/jobs';

/**
 * Service tự động đăng ký cron jobs cho RBAC khi module khởi động
 *
 * Tự động query active workspaces từ DB và đăng ký cron jobs.
 *
 * Jobs được đăng ký:
 * - CacheWarmerJob: Every hour - Warm RBAC enforcer caches
 * - CrossRegionReloadJob: Every hour - Full policy reload for consistency
 *
 * Environment variables:
 * - MKT_RBAC_CRON_ENABLED: Enable/disable RBAC cron jobs (default: true)
 */
@Injectable()
export class RbacCronRegistrationService extends BaseCronRegistrationService {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    messageQueueService: MessageQueueService,
    @InjectRepository(Workspace, 'core')
    workspaceRepository: Repository<Workspace>,
  ) {
    super(messageQueueService, workspaceRepository);
  }

  protected getLogContext(): string {
    return `${CASBIN_LOG_CONTEXT}:CronRegistration`;
  }

  protected isEnabled(): boolean {
    return process.env.MKT_RBAC_CRON_ENABLED !== 'false';
  }

  protected getCronJobsForWorkspace(
    workspaceId: string,
  ): CronJobConfig<CacheWarmerJobData | CrossRegionReloadJobData>[] {
    return [
      {
        jobName: CacheWarmerJob.name,
        pattern: CronExpression.EVERY_HOUR,
        data: { workspaceId } as CacheWarmerJobData,
        description: 'Warm RBAC enforcer caches',
      },
      {
        jobName: CrossRegionReloadJob.name,
        pattern: CronExpression.EVERY_HOUR,
        data: { workspaceId } as CrossRegionReloadJobData,
        description: 'Full policy reload for cross-region consistency',
      },
    ];
  }
}
