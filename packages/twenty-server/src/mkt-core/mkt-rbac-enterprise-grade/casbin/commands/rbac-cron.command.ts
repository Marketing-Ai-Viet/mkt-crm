import { CronExpression } from '@nestjs/schedule';

import { Command, CommandRunner } from 'nest-commander';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import {
  CacheWarmerJob,
  CacheWarmerJobData,
  CrossRegionReloadJob,
  CrossRegionReloadJobData,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/casbin/jobs';

/**
 * CLI Command để đăng ký cron jobs cho RBAC module
 *
 * Usage:
 * ```bash
 * npx nx command twenty-server -- cron:rbac
 * ```
 *
 * Jobs được đăng ký:
 * - CacheWarmerJob: Every hour - Warm RBAC enforcer caches
 * - CrossRegionReloadJob: Every hour - Full policy reload for consistency
 *
 * Environment variables:
 * - MKT_WORKSPACE_ID: Workspace ID (required)
 */
@Command({
  name: 'cron:rbac',
  description:
    'Starts cron jobs for RBAC cache warming and cross-region reload',
})
export class RbacCronCommand extends CommandRunner {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {
    super();
  }

  async run(): Promise<void> {
    const workspaceId =
      process.env.MKT_WORKSPACE_ID || '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

    if (!workspaceId) {
      // eslint-disable-next-line no-console
      console.error('MKT_WORKSPACE_ID environment variable is required');

      return;
    }

    // Register CacheWarmerJob - runs every hour
    await this.messageQueueService.addCron<CacheWarmerJobData>({
      jobName: CacheWarmerJob.name,
      data: { workspaceId },
      options: {
        repeat: {
          pattern: CronExpression.EVERY_HOUR,
        },
      },
    });

    // eslint-disable-next-line no-console
    console.log(
      `✅ CacheWarmerJob cron registered with pattern: ${CronExpression.EVERY_HOUR}`,
    );

    // Register CrossRegionReloadJob - runs every hour
    await this.messageQueueService.addCron<CrossRegionReloadJobData>({
      jobName: CrossRegionReloadJob.name,
      data: { workspaceId },
      options: {
        repeat: {
          pattern: CronExpression.EVERY_HOUR,
        },
      },
    });

    // eslint-disable-next-line no-console
    console.log(
      `✅ CrossRegionReloadJob cron registered with pattern: ${CronExpression.EVERY_HOUR}`,
    );
  }
}
