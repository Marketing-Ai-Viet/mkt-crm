import { Injectable, Logger } from '@nestjs/common';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { OrderLockService } from 'src/mkt-core/order/services/core/order-lock.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Kết quả quét và khóa đơn hàng quá hạn
 */
export type PaymentOverdueScanResult = {
  scannedCount: number;
  successCount: number;
  failCount: number;
  failedOrderIds: string[];
};

/**
 * PaymentOverdueScanService
 *
 * Business logic để quét và khóa các đơn hàng quá hạn thanh toán.
 * Service này được sử dụng bởi PaymentOverdueScanJob (cron) như cơ chế backup
 * để bắt các orders bị bỏ lỡ bởi delayed job system.
 *
 * Nhiệm vụ:
 * - Tìm orders có status PROCESSING và paymentDeadline < now
 * - Khóa licenses trên MKT Server
 * - Cập nhật order status thành LOCKED
 */
@Injectable()
export class PaymentOverdueScanService {
  private readonly logger = new Logger(PaymentOverdueScanService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderLockService: OrderLockService,
  ) {}

  /**
   * Quét và khóa tất cả đơn hàng quá hạn trong workspace
   *
   * @param workspaceId - Workspace cần quét
   * @returns Kết quả quét với số lượng và danh sách order ID thất bại
   */
  async scanAndLockOverdueOrders(
    workspaceId: string,
  ): Promise<PaymentOverdueScanResult> {
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
      this.logger.debug(
        `Không tìm thấy đơn hàng quá hạn trong workspace ${workspaceId}`,
      );

      return {
        scannedCount: 0,
        successCount: 0,
        failCount: 0,
        failedOrderIds: [],
      };
    }

    this.logger.log(
      `Tìm thấy ${overdueOrders.length} đơn hàng quá hạn trong workspace ${workspaceId}`,
    );

    // Khóa từng order
    let successCount = 0;
    let failCount = 0;
    const failedOrderIds: string[] = [];

    for (const order of overdueOrders) {
      try {
        await this.lockOverdueOrder(order.id, workspaceId);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Lỗi khóa đơn hàng quá hạn ${order.id}:`,
          error instanceof Error ? error.message : error,
        );
        failCount++;
        failedOrderIds.push(order.id);
      }
    }

    this.logger.log(
      `Quét hoàn tất: ${successCount} đã khóa, ${failCount} thất bại`,
    );

    return {
      scannedCount: overdueOrders.length,
      successCount,
      failCount,
      failedOrderIds,
    };
  }

  /**
   * Khóa một đơn hàng quá hạn
   *
   * Các bước:
   * 1. Lấy licenses liên kết với order
   * 2. Khóa licenses trên MKT Server
   * 3. Cập nhật order status thành LOCKED với metadata
   *
   * @param orderId - ID đơn hàng cần khóa
   * @param workspaceId - ID workspace để lookup license
   */
  async lockOverdueOrder(orderId: string, workspaceId: string): Promise<void> {
    // Enqueue license revocation jobs via async queue
    const enqueueResult = await this.orderLockService.lockLicenses(
      workspaceId,
      orderId,
    );

    this.logger.log(
      `Enqueued ${enqueueResult.count} license revocation jobs for order ${orderId}`,
    );

    // Cập nhật order status
    const lockUpdateData = this.orderLockService.getLockUpdateData();

    await this.orderRepository.updateOrder(
      orderId,
      {
        status: lockUpdateData.status,
        lockedAt: lockUpdateData.lockedAt,
        lockedReason: lockUpdateData.lockedReason,
      },
      workspaceId,
    );

    this.logger.log(
      `Đơn hàng ${orderId} đã khóa do quá hạn thanh toán (qua scan)`,
    );
  }
}
