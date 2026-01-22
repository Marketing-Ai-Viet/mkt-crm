import { Injectable, Logger } from '@nestjs/common';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { PAYMENT_OVERDUE_SCAN_CONFIG } from 'src/mkt-core/order/constants/payment-deadline.constants';
import { PaymentOverdueScanService } from 'src/mkt-core/order/services/core/payment-overdue-scan.service';

/**
 * Payload cho job quét đơn hàng quá hạn
 */
export type PaymentOverdueScanJobData = {
  workspaceId: string;
};

/**
 * PaymentOverdueScanJob
 *
 * Cron job processor để quét và khóa các đơn hàng quá hạn thanh toán.
 * Đây là cơ chế backup để bắt các orders bị bỏ lỡ bởi delayed job system.
 *
 * Kiến trúc:
 * - Job này là thin layer, delegate logic cho PaymentOverdueScanService
 * - Business logic nằm trong PaymentOverdueScanService
 * - Job xử lý scheduling, monitoring, và error handling
 *
 * Lịch chạy: Mỗi 5 phút (cấu hình qua PAYMENT_OVERDUE_SCAN_CONFIG)
 */
@Processor(MessageQueue.cronQueue)
@Injectable()
export class PaymentOverdueScanJob {
  private readonly logger = new Logger(PaymentOverdueScanJob.name);

  constructor(
    private readonly paymentOverdueScanService: PaymentOverdueScanService,
  ) {}

  /**
   * Xử lý job quét đơn hàng quá hạn
   * Được trigger bởi message queue cron scheduler
   */
  @Process(PaymentOverdueScanJob.name)
  @SentryCronMonitor(
    PaymentOverdueScanJob.name,
    PAYMENT_OVERDUE_SCAN_CONFIG.CRON_PATTERN,
  )
  async handle(data: PaymentOverdueScanJobData): Promise<void> {
    const { workspaceId } = data;
    const startTime = Date.now();

    this.logger.log('Starting payment overdue scan', { workspaceId });

    try {
      const result =
        await this.paymentOverdueScanService.scanAndLockOverdueOrders(
          workspaceId,
        );

      const durationMs = Date.now() - startTime;

      this.logResult(workspaceId, result, durationMs);
    } catch (error) {
      this.handleError(workspaceId, error);
    }
  }

  /**
   * Log kết quả scan với structured format
   */
  private logResult(
    workspaceId: string,
    result: {
      scannedCount: number;
      successCount: number;
      failCount: number;
      failedOrderIds: string[];
    },
    durationMs: number,
  ): void {
    const logContext = {
      workspaceId,
      scannedCount: result.scannedCount,
      successCount: result.successCount,
      failCount: result.failCount,
      durationMs,
    };

    if (result.failCount > 0) {
      this.logger.warn('Payment overdue scan completed with failures', {
        ...logContext,
        failedOrderIds: result.failedOrderIds,
      });
    } else if (result.scannedCount > 0) {
      this.logger.log('Payment overdue scan completed', logContext);
    } else {
      this.logger.debug('No overdue orders found', logContext);
    }
  }

  /**
   * Handle và log error với structured format
   */
  private handleError(workspaceId: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('Payment overdue scan failed', {
      workspaceId,
      error: errorMessage,
    });

    throw error;
  }
}
