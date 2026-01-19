import { Injectable, Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { PAYMENT_OVERDUE_SCAN_CONFIG } from 'src/mkt-core/order/constants/payment-deadline.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderLockService } from 'src/mkt-core/order/services/core/order-lock.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * PaymentOverdueScanService
 *
 * Cron job backup để scan và lock các orders quá hạn thanh toán.
 * Chạy định kỳ để catch các cases mà delayed job bị miss.
 *
 * Flow:
 * 1. Tìm tất cả orders có status PROCESSING và paymentDeadline < now
 * 2. Lock licenses trên MKT Server
 * 3. Update order status → LOCKED
 *
 * Cron schedule: Mỗi 5 phút (configurable)
 */
@Processor(MessageQueue.cronQueue)
@Injectable()
export class PaymentOverdueScanJob {
  private readonly logger = new Logger(PaymentOverdueScanJob.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderLockService: OrderLockService,
  ) {}

  /**
   * Process overdue scan job
   * Triggered by message queue cron
   */
  @Process(PaymentOverdueScanJob.name)
  @SentryCronMonitor(
    PaymentOverdueScanJob.name,
    PAYMENT_OVERDUE_SCAN_CONFIG.CRON_PATTERN,
  )
  async handle(data: { workspaceId: string }): Promise<void> {
    const { workspaceId } = data;

    this.logger.log(`🔍 Scanning overdue orders for workspace ${workspaceId}`);

    try {
      await this.scanAndLockOverdueOrders(workspaceId);
    } catch (error) {
      this.logger.error(
        `Failed to scan overdue orders for workspace ${workspaceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Scan và lock các orders quá hạn trong workspace
   */
  private async scanAndLockOverdueOrders(workspaceId: string): Promise<void> {
    const now = DateTimeUtils.toDateRequired(DateTimeUtils.now());

    // Tìm orders đang PROCESSING và đã quá deadline
    const overdueOrders = await this.orderRepository.findOverdueOrders(
      workspaceId,
      {
        status: ORDER_STATUS.PROCESSING,
        paymentDeadlineBefore: now,
      },
    );

    if (overdueOrders.length === 0) {
      this.logger.debug(`No overdue orders found in workspace ${workspaceId}`);

      return;
    }

    this.logger.log(
      `Found ${overdueOrders.length} overdue orders in workspace ${workspaceId}`,
    );

    // Lock từng order
    let successCount = 0;
    let failCount = 0;

    for (const order of overdueOrders) {
      try {
        await this.lockOverdueOrder(order.id, workspaceId);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to lock overdue order ${order.id}:`,
          error instanceof Error ? error.message : error,
        );
        failCount++;
      }
    }

    this.logger.log(
      `Overdue scan completed: ${successCount} locked, ${failCount} failed`,
    );
  }

  /**
   * Lock một order quá hạn
   */
  private async lockOverdueOrder(
    orderId: string,
    workspaceId: string,
  ): Promise<void> {
    // Lấy license IDs từ order
    const licenses = await this.orderRepository.getOrderLicenses(
      orderId,
      workspaceId,
    );

    // Extract license IDs directly - simplified for basic license data
    const licenseIds = (licenses ?? []).map((l) => l.id);

    // Lock licenses trên MKT Server
    if (licenseIds.length > 0) {
      const lockResult = await this.orderLockService.lockLicenses(licenseIds);

      if (!lockResult.success) {
        this.logger.warn(
          `Some licenses failed to lock for order ${orderId}:`,
          lockResult.results.filter((r) => !r.success),
        );
      }
    }

    // Update order status
    const lockUpdateData = this.orderLockService.getLockUpdateData();

    await this.orderRepository.update(orderId, {
      status: lockUpdateData.status,
      lockedAt: lockUpdateData.lockedAt,
      lockedReason: lockUpdateData.lockedReason,
    });

    this.logger.log(
      `Order ${orderId} locked due to payment overdue (via scan)`,
    );
  }
}
