import { Module } from '@nestjs/common';

import { DelayedJobService } from './services';

/**
 * Delayed Job Infrastructure Module
 *
 * Cung cấp infrastructure cho delayed jobs sử dụng BullMQ:
 * - Schedule jobs với configurable delay
 * - Cancel jobs trước khi execute
 * - Retry với exponential backoff
 * - Queue stats cho monitoring
 *
 * Module này wrap BullMQ và không sửa đổi core engine của Twenty.
 *
 * @example
 * // Import module
 * @Module({
 *   imports: [DelayedJobInfrastructureModule],
 * })
 * export class MyModule {}
 *
 * // Inject và sử dụng service
 * constructor(private readonly delayedJobService: DelayedJobService) {}
 *
 * await this.delayedJobService.scheduleJob(
 *   MKT_DELAYED_JOB_QUEUES.PAYMENT_DEADLINE,
 *   'PaymentDeadlineCheck',
 *   { orderId, workspaceId },
 *   { jobId: `payment-deadline:${orderId}`, delayMs: 86400000 }
 * );
 */
@Module({
  providers: [DelayedJobService],
  exports: [DelayedJobService],
})
export class DelayedJobInfrastructureModule {}
