import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  DelayedJobService,
  MKT_DELAYED_JOB_QUEUES,
} from 'src/mkt-core/infrastructure/delayed-job';
import { OrderConfig } from 'src/mkt-core/order/config/order-config.types';
import { orderConfig } from 'src/mkt-core/order/config/order.config';
import { GET_OVERDUE_JOB_ID } from 'src/mkt-core/order/constants/mkt-order-overdue.constants';
import { OrderOverduePayload } from 'src/mkt-core/order/types/order-overdue.types';

/**
 * OrderOverdueSchedulerService
 *
 * Service để schedule và cancel delayed jobs cho việc kiểm tra overdue orders.
 * Được gọi từ CreateOrderSaga khi order được tạo với status PENDING_PAYMENT
 * và từ ConfirmOrderSaga/PaymentService khi order được thanh toán hoặc huỷ.
 */
@Injectable()
export class OrderOverdueSchedulerService {
  private readonly logger = new Logger(OrderOverdueSchedulerService.name);

  constructor(
    private readonly delayedJobService: DelayedJobService,
    @Inject(orderConfig.KEY)
    private readonly config: OrderConfig,
  ) {}

  /**
   * Schedule overdue check for an order
   *
   * Gọi khi order được tạo với status PENDING_PAYMENT.
   * Job sẽ được execute sau thời gian delay (default 24h).
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @param orderCode - Order code (optional, for logging)
   * @param customDelayMs - Custom delay in milliseconds (optional, for testing)
   * @returns true if job was scheduled successfully
   */
  async scheduleOverdueCheck(
    workspaceId: string,
    orderId: string,
    orderCode?: string,
    customDelayMs?: number,
  ): Promise<boolean> {
    const delayMs = customDelayMs ?? this.config.overdue.delayMs;
    const jobId = GET_OVERDUE_JOB_ID(orderId);

    const payload: OrderOverduePayload = {
      orderId,
      workspaceId,
      orderCode,
    };

    const scheduled = await this.delayedJobService.scheduleJob(
      MKT_DELAYED_JOB_QUEUES.ORDER_OVERDUE,
      this.config.overdue.jobName,
      payload,
      {
        jobId,
        delayMs,
        retryAttempts: this.config.overdue.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: this.config.overdue.backoffMs,
        },
      },
    );

    if (scheduled) {
      this.logger.log({
        message: 'Scheduled overdue check',
        orderId,
        orderCode,
        workspaceId,
        jobId,
        delayMs,
        delayHours: delayMs / (60 * 60 * 1000),
      });
    } else {
      this.logger.warn({
        message: 'Failed to schedule overdue check - job may already exist',
        orderId,
        orderCode,
        workspaceId,
        jobId,
      });
    }

    return scheduled;
  }

  /**
   * Cancel scheduled overdue check
   *
   * Gọi khi order được thanh toán hoặc huỷ trước thời hạn.
   * Đảm bảo job không được execute sau khi order đã được xử lý.
   *
   * @param orderId - Order ID
   * @returns true if job was cancelled successfully
   */
  async cancelOverdueCheck(orderId: string): Promise<boolean> {
    const jobId = GET_OVERDUE_JOB_ID(orderId);

    const result = await this.delayedJobService.cancelJob(
      MKT_DELAYED_JOB_QUEUES.ORDER_OVERDUE,
      jobId,
    );

    this.logger.log({
      message: result.success
        ? 'Cancelled overdue check'
        : 'Overdue job not found (may have already executed)',
      orderId,
      jobId,
      success: result.success,
      reason: result.reason,
    });

    return result.success;
  }
}
