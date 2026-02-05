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
import { PAYMENT_OVERDUE_SCAN_CONFIG } from 'src/mkt-core/order/constants/payment-deadline.constants';
import {
  PaymentOverdueScanJob,
  PaymentOverdueScanJobData,
} from 'src/mkt-core/order/jobs';

/**
 * Service tu dong dang ky order cron jobs khi module khoi dong
 *
 * Jobs duoc dang ky:
 * - PaymentOverdueScanJob: Every 5 minutes - Scan and lock overdue orders (backup for delayed jobs)
 *
 * Environment variables:
 * - MKT_ORDER_CRON_ENABLED: Enable/disable order cron jobs (default: true)
 */
@Injectable()
export class OrderCronRegistrationService extends BaseCronRegistrationService {
  constructor(
    @InjectMessageQueue(MessageQueue.cronQueue)
    messageQueueService: MessageQueueService,
    @InjectRepository(Workspace, 'core')
    workspaceRepository: Repository<Workspace>,
  ) {
    super(messageQueueService, workspaceRepository);
  }

  protected getLogContext(): string {
    return 'MktOrder:CronRegistration';
  }

  protected isEnabled(): boolean {
    return (
      process.env.MKT_ORDER_CRON_ENABLED !== 'false' &&
      PAYMENT_OVERDUE_SCAN_CONFIG.ENABLED
    );
  }

  protected getCronJobsForWorkspace(
    workspaceId: string,
  ): CronJobConfig<PaymentOverdueScanJobData>[] {
    return [
      {
        jobName: PaymentOverdueScanJob.name,
        pattern: PAYMENT_OVERDUE_SCAN_CONFIG.CRON_PATTERN,
        data: { workspaceId },
        description: 'Scan and lock overdue orders (backup for delayed jobs)',
      },
    ];
  }
}
