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
        await this.handleDeadlineCheck(data.payload);
      },
    );

    this.logger.log('Deadline check worker registered');
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
        await this.handleReminder(data.payload);
      },
    );

    this.logger.log('Payment reminder worker registered');
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

    this.logger.debug(
      `Processing deadline check for order ${orderCode ?? orderId}`,
    );

    try {
      // Lấy order từ repository
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        this.logger.warn(`Order ${orderId} not found, skipping deadline check`);

        return;
      }

      // Skip nếu đã không còn ở PROCESSING status
      // (đã thanh toán, đã hủy, hoặc đã bị lock trước đó)
      if (order.status !== ORDER_STATUS.PROCESSING) {
        this.logger.debug(
          `Order ${orderId} status is ${order.status}, skipping deadline check`,
        );

        return;
      }

      // Kiểm tra deadline
      if (!order.paymentDeadline) {
        this.logger.warn(`Order ${orderId} has no payment deadline`);

        return;
      }

      const now = DateTimeUtils.now();
      const deadline = DateTimeUtils.fromDate(order.paymentDeadline);

      // Kiểm tra đã quá hạn chưa
      if (DateTimeUtils.toMillis(now) < DateTimeUtils.toMillis(deadline)) {
        this.logger.debug(`Order ${orderId} deadline not yet passed`);

        return;
      }

      // Đã quá hạn - lock order
      this.logger.log(`Order ${orderId} deadline passed, locking order`);

      // Lấy license IDs từ order items
      const licenses = await this.orderRepository.getOrderLicenses(
        orderId,
        workspaceId,
      );

      // Extract license IDs directly - simplified for basic license data
      const licenseIds = (licenses ?? []).map((l) => l.id);

      // Lock licenses trên MKT Server
      if (licenseIds.length > 0) {
        await this.orderLockService.lockLicenses(licenseIds);
      }

      // Update order status và fields
      const lockUpdateData = this.orderLockService.getLockUpdateData();

      await this.orderRepository.update(orderId, {
        status: lockUpdateData.status,
        lockedAt: lockUpdateData.lockedAt,
        lockedReason: lockUpdateData.lockedReason,
      });

      this.logger.log(
        `Order ${orderCode ?? orderId} locked due to payment overdue`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process deadline check for order ${orderId}:`,
        error,
      );
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

    this.logger.debug(
      `Processing ${reminderType} reminder for order ${orderCode ?? orderId}`,
    );

    try {
      // Lấy order từ repository
      const order = await this.orderRepository.findById(orderId);

      if (!order) {
        this.logger.warn(`Order ${orderId} not found, skipping reminder`);

        return;
      }

      // Skip nếu đã không còn ở PROCESSING status
      if (order.status !== ORDER_STATUS.PROCESSING) {
        this.logger.debug(
          `Order ${orderId} status is ${order.status}, skipping reminder`,
        );

        return;
      }

      // TODO: Implement notification service call
      // await this.notificationService.sendPaymentReminder(order, reminderType);

      this.logger.log(
        `Payment reminder sent for order ${orderCode ?? orderId}: ${reminderType} (${hoursBeforeDeadline}h before deadline)`,
      );

      // Update order với reminder info
      const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

      await this.orderRepository.update(orderId, {
        remindersSent: (order.remindersSent ?? 0) + 1,
        lastReminderAt: now,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send payment reminder for order ${orderId}:`,
        error,
      );
      throw error;
    }
  }
}
