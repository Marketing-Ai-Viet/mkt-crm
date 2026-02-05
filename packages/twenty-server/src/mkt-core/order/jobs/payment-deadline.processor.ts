import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  DelayedJobService,
  MKT_DELAYED_JOB_QUEUES,
} from 'src/mkt-core/infrastructure/delayed-job';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderLockService } from 'src/mkt-core/order/services/core/order-lock.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Payload for payment deadline check job
 */
type PaymentDeadlineCheckPayload = {
  orderId: string;
  workspaceId: string;
  orderCode?: string;
};

/**
 * Payload for payment reminder job
 */
type PaymentReminderPayload = {
  orderId: string;
  workspaceId: string;
  orderCode?: string;
  reminderType: string;
  hoursBeforeDeadline: number;
};

/**
 * PaymentDeadlineProcessor
 *
 * Xử lý các delayed jobs cho payment deadline:
 * 1. DEADLINE_CHECK - Kiểm tra và khóa đơn hàng quá hạn
 * 2. REMINDER - Gửi nhắc nhở thanh toán
 *
 * Sử dụng DelayedJobService (BullMQ) để register workers.
 * Jobs được schedule bởi SchedulePaymentRemindersStep khi confirm order.
 */
@Injectable()
export class PaymentDeadlineProcessor implements OnModuleInit {
  private readonly logger = new Logger(PaymentDeadlineProcessor.name);

  constructor(
    private readonly delayedJobService: DelayedJobService,
    private readonly orderRepository: MktOrderRepository,
    private readonly orderLockService: OrderLockService,
  ) {}

  /**
   * Register workers khi module khởi động
   */
  onModuleInit(): void {
    this.registerDeadlineCheckWorker();
    this.registerReminderWorker();
  }

  /**
   * Register worker cho deadline check jobs
   */
  private registerDeadlineCheckWorker(): void {
    this.delayedJobService.registerWorker<PaymentDeadlineCheckPayload>(
      {
        queueName: MKT_DELAYED_JOB_QUEUES.PAYMENT_DEADLINE,
        concurrency: 5,
      },
      async (data) => {
        this.logger.debug('Processing deadline check', {
          orderId: data.payload.orderId,
          jobId: data.jobId,
          attempt: data.attemptNumber,
        });
        await this.handleDeadlineCheck(data.payload);
      },
    );

    this.logger.log('Deadline check worker registered', {
      queue: MKT_DELAYED_JOB_QUEUES.PAYMENT_DEADLINE,
      concurrency: 5,
    });
  }

  /**
   * Register worker cho reminder jobs
   */
  private registerReminderWorker(): void {
    this.delayedJobService.registerWorker<PaymentReminderPayload>(
      {
        queueName: MKT_DELAYED_JOB_QUEUES.PAYMENT_REMINDER,
        concurrency: 10,
      },
      async (data) => {
        this.logger.debug('Processing payment reminder', {
          orderId: data.payload.orderId,
          reminderType: data.payload.reminderType,
          jobId: data.jobId,
          attempt: data.attemptNumber,
        });
        await this.handleReminder(data.payload);
      },
    );

    this.logger.log('Payment reminder worker registered', {
      queue: MKT_DELAYED_JOB_QUEUES.PAYMENT_REMINDER,
      concurrency: 10,
    });
  }

  /**
   * Handle deadline check job
   *
   * Kiểm tra nếu order đã quá hạn thanh toán:
   * - Nếu status vẫn là PROCESSING và đã quá deadline → Lock order và licenses
   */
  private async handleDeadlineCheck(
    payload: PaymentDeadlineCheckPayload,
  ): Promise<void> {
    const { orderId, workspaceId, orderCode } = payload;

    try {
      // Lấy order từ repository
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        this.logger.warn('Order not found, skipping deadline check', {
          orderId,
        });

        return;
      }

      // Skip nếu đã không còn ở PROCESSING status
      // (đã thanh toán, đã hủy, hoặc đã bị lock trước đó)
      if (order.status !== ORDER_STATUS.PROCESSING) {
        this.logger.debug('Order not in PROCESSING status, skipping', {
          orderId,
          status: order.status,
        });

        return;
      }

      // Kiểm tra deadline
      if (!order.paymentDeadline) {
        this.logger.warn('Order has no payment deadline', { orderId });

        return;
      }

      const now = DateTimeUtils.now();
      const deadline = DateTimeUtils.fromDate(order.paymentDeadline);

      // Kiểm tra đã quá hạn chưa
      if (DateTimeUtils.toMillis(now) < DateTimeUtils.toMillis(deadline)) {
        this.logger.debug('Order deadline not yet passed', { orderId });

        return;
      }

      // Đã quá hạn - lock order
      this.logger.log('Order deadline passed, locking order', { orderId });

      // Enqueue license revocation jobs via async queue
      const enqueueResult = await this.orderLockService.lockLicenses(
        workspaceId,
        orderId,
      );

      // Update order status và fields
      const lockUpdateData = this.orderLockService.getLockUpdateData();

      await this.orderRepository.update(orderId, {
        status: lockUpdateData.status,
        lockedAt: lockUpdateData.lockedAt,
        lockedReason: lockUpdateData.lockedReason,
      });

      this.logger.log('Order locked due to payment overdue', {
        orderId,
        orderCode,
        licensesEnqueued: enqueueResult.count,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to process deadline check', {
        orderId,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Handle payment reminder job
   *
   * Gửi nhắc nhở thanh toán cho khách hàng
   */
  private async handleReminder(payload: PaymentReminderPayload): Promise<void> {
    const { orderId, orderCode, reminderType, hoursBeforeDeadline } = payload;

    try {
      // Lấy order từ repository
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        this.logger.warn('Order not found, skipping reminder', { orderId });

        return;
      }

      // Skip nếu đã không còn ở PROCESSING status
      if (order.status !== ORDER_STATUS.PROCESSING) {
        this.logger.debug('Order not in PROCESSING status, skipping reminder', {
          orderId,
          status: order.status,
        });

        return;
      }

      // TODO: Implement notification service call
      // await this.notificationService.sendPaymentReminder(order, reminderType);

      this.logger.log('Payment reminder sent', {
        orderId,
        orderCode,
        reminderType,
        hoursBeforeDeadline,
      });

      // Update order với reminder info
      const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

      await this.orderRepository.update(orderId, {
        remindersSent: (order.remindersSent ?? 0) + 1,
        lastReminderAt: now,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('Failed to send payment reminder', {
        orderId,
        error: errorMessage,
      });
      throw error;
    }
  }
}
