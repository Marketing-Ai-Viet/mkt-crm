import { Command, CommandRunner } from 'nest-commander';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MKT_SYNC_CONFIG } from 'src/mkt-core/mkt-product-integration/constants';
import {
  MktProductScheduledSyncJob,
  MktProductScheduledSyncJobData,
} from 'src/mkt-core/mkt-product-integration/jobs/mkt-product-scheduled-sync.job';

/**
 * CLI Command để đăng ký cron job cho product sync
 *
 * Usage:
 * ```bash
 * npx nx command twenty-server -- cron:mkt-product-sync
 * ```
 *
 * Environment variables:
 * - MKT_WORKSPACE_ID: Workspace ID to sync (required)
 * - MKT_SCHEDULED_SYNC_CRON: Cron pattern (default: every 30 minutes)
 */
@Command({
  name: 'cron:mkt-product-sync',
  description: 'Starts a cron job to sync products from MKT Server',
})
export class MktProductSyncCronCommand extends CommandRunner {
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

    await this.messageQueueService.addCron<MktProductScheduledSyncJobData>({
      jobName: MktProductScheduledSyncJob.name,
      data: { workspaceId },
      options: {
        repeat: {
          pattern: MKT_SYNC_CONFIG.SCHEDULED_SYNC_CRON,
        },
      },
    });

    // eslint-disable-next-line no-console
    console.log(
      `✅ MktProductScheduledSyncJob cron registered with pattern: ${MKT_SYNC_CONFIG.SCHEDULED_SYNC_CRON}`,
    );
  }
}
