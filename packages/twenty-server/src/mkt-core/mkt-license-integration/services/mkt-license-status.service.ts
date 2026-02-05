import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  LICENSE_ITEM_STATUS,
  LICENSE_ITEM_SUCCESS_STATUSES,
  LicenseItemStatus,
} from 'src/mkt-core/order/constants/license-item-status.constants';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';

// ============================================
// EVENT TYPES
// ============================================

type OrderLicenseStatusChangedEvent = {
  workspaceId: string;
  orderId: string;
  newStatus: ORDER_STATUS;
  previousStatus?: ORDER_STATUS;
};

type LicenseJobFailedEvent = {
  workspaceId: string;
  orderId: string;
  orderItemId: string;
  failedAt: string;
};

// ============================================
// SERVICE
// ============================================

/**
 * MKT License Status Service
 *
 * Manages order status based on license processing status.
 *
 * Responsibilities:
 * - Check and update order status based on license status of all items
 * - Handle license job failures
 * - Emit events for order status changes
 *
 * Status Flow:
 * - LICENSE_PENDING → PROCESSING (all licenses created)
 * - PROCESSING → COMPLETED (all licenses activated)
 * - Any → LICENSE_FAILED (any license job failed after max retries)
 */
@Injectable()
export class MktLicenseStatusService {
  private readonly logger = new Logger(MktLicenseStatusService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderItemRepository: MktOrderItemRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check và update order status dựa trên license status của các items.
   *
   * Called after each license job completes (success or fail).
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID to check
   */
  async checkAndUpdateOrderLicenseStatus(
    workspaceId: string,
    orderId: string,
  ): Promise<void> {
    this.logger.debug({
      message: 'Checking order license status',
      orderId,
    });

    const items = await this.orderItemRepository.findByOrderId(orderId);

    // Filter items cần license (exclude NOT_APPLICABLE)
    const licensableItems = items.filter(
      (item) =>
        (item.licenseStatus as LicenseItemStatus) !==
        LICENSE_ITEM_STATUS.NOT_APPLICABLE,
    );

    if (licensableItems.length === 0) {
      this.logger.debug({
        message: 'No licensable items found, skipping status check',
        orderId,
      });

      return;
    }

    // Analyze license statuses
    const statusAnalysis = this.analyzeLicenseStatuses(licensableItems);

    // Get current order
    const order = await this.orderRepository.findByIdWithOptions(
      orderId,
      {},
      workspaceId,
    );

    if (!order) {
      this.logger.warn({
        message: 'Order not found',
        orderId,
      });

      return;
    }

    const currentStatus = order.status as ORDER_STATUS;

    // Determine new status based on analysis
    const newStatus = this.determineNewOrderStatus(
      currentStatus,
      statusAnalysis,
    );

    if (newStatus && newStatus !== currentStatus) {
      await this.updateOrderStatus(
        workspaceId,
        orderId,
        currentStatus,
        newStatus,
      );
    }

    this.logger.log({
      message: 'Order license status checked',
      orderId,
      currentStatus,
      newStatus: newStatus ?? 'no_change',
      ...statusAnalysis,
    });
  }

  /**
   * Handle when a license job fails permanently (max retries exceeded).
   *
   * Updates order status to LICENSE_FAILED and emits event.
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @param orderItemId - Order item ID that failed
   */
  async handleLicenseJobFailed(
    workspaceId: string,
    orderId: string,
    orderItemId: string,
  ): Promise<void> {
    this.logger.error({
      message: 'Handling license job failure',
      orderId,
      orderItemId,
    });

    // Get current order status
    const order = await this.orderRepository.findByIdWithOptions(
      orderId,
      {},
      workspaceId,
    );

    if (!order) {
      this.logger.warn({
        message: 'Order not found for failed license job',
        orderId,
      });

      return;
    }

    const previousStatus = order.status as ORDER_STATUS;

    // Update order status to LICENSE_FAILED
    await this.orderRepository.updateStatus(
      orderId,
      ORDER_STATUS.LICENSE_FAILED,
    );

    this.logger.error({
      message: 'Order marked as LICENSE_FAILED',
      orderId,
      orderItemId,
      previousStatus,
    });

    // Emit event for license job failure
    const event: LicenseJobFailedEvent = {
      workspaceId,
      orderId,
      orderItemId,
      failedAt: new Date().toISOString(),
    };

    this.eventEmitter.emit('order.license.job.failed', event);
  }

  /**
   * Manually trigger status re-check for an order.
   *
   * Useful for retry scenarios or admin actions.
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   */
  async retriggerStatusCheck(
    workspaceId: string,
    orderId: string,
  ): Promise<void> {
    this.logger.log({
      message: 'Manually retriggering order license status check',
      orderId,
    });

    await this.checkAndUpdateOrderLicenseStatus(workspaceId, orderId);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Analyze license statuses of all items.
   */
  private analyzeLicenseStatuses(
    items: Array<{ licenseStatus: unknown }>,
  ): LicenseStatusAnalysis {
    const statuses = items.map(
      (item) => item.licenseStatus as LicenseItemStatus,
    );

    return {
      total: items.length,
      pending: statuses.filter((s) => s === LICENSE_ITEM_STATUS.PENDING).length,
      processing: statuses.filter((s) => s === LICENSE_ITEM_STATUS.PROCESSING)
        .length,
      created: statuses.filter((s) => s === LICENSE_ITEM_STATUS.CREATED).length,
      upgraded: statuses.filter((s) => s === LICENSE_ITEM_STATUS.UPGRADED)
        .length,
      activated: statuses.filter((s) => s === LICENSE_ITEM_STATUS.ACTIVATED)
        .length,
      revoked: statuses.filter((s) => s === LICENSE_ITEM_STATUS.REVOKED).length,
      failed: statuses.filter((s) => s === LICENSE_ITEM_STATUS.FAILED).length,

      // Derived flags
      allCreated: statuses.every((s) =>
        LICENSE_ITEM_SUCCESS_STATUSES.includes(s),
      ),
      allActivated: statuses.every((s) => s === LICENSE_ITEM_STATUS.ACTIVATED),
      anyFailed: statuses.some((s) => s === LICENSE_ITEM_STATUS.FAILED),
      anyPending: statuses.some(
        (s) =>
          s === LICENSE_ITEM_STATUS.PENDING ||
          s === LICENSE_ITEM_STATUS.PROCESSING,
      ),
    };
  }

  /**
   * Determine new order status based on current status and license analysis.
   */
  private determineNewOrderStatus(
    currentStatus: ORDER_STATUS,
    analysis: LicenseStatusAnalysis,
  ): ORDER_STATUS | null {
    // If any license failed → LICENSE_FAILED
    if (analysis.anyFailed) {
      return ORDER_STATUS.LICENSE_FAILED;
    }

    // If all licenses activated and order is PROCESSING → COMPLETED
    if (analysis.allActivated && currentStatus === ORDER_STATUS.PROCESSING) {
      return ORDER_STATUS.COMPLETED;
    }

    // If all licenses created and order is LICENSE_PENDING → PROCESSING
    if (analysis.allCreated && currentStatus === ORDER_STATUS.LICENSE_PENDING) {
      return ORDER_STATUS.PROCESSING;
    }

    // No status change needed
    return null;
  }

  /**
   * Update order status and emit event.
   */
  private async updateOrderStatus(
    workspaceId: string,
    orderId: string,
    previousStatus: ORDER_STATUS,
    newStatus: ORDER_STATUS,
  ): Promise<void> {
    await this.orderRepository.updateStatus(orderId, newStatus);

    this.logger.log({
      message: 'Order status updated based on license status',
      orderId,
      previousStatus,
      newStatus,
    });

    // Emit status change event
    const event: OrderLicenseStatusChangedEvent = {
      workspaceId,
      orderId,
      newStatus,
      previousStatus,
    };

    // Emit specific events based on new status
    if (newStatus === ORDER_STATUS.COMPLETED) {
      this.eventEmitter.emit('order.completed', event);
    } else if (newStatus === ORDER_STATUS.PROCESSING) {
      this.eventEmitter.emit('order.licenses.created', event);
    } else if (newStatus === ORDER_STATUS.LICENSE_FAILED) {
      this.eventEmitter.emit('order.license.failed', event);
    }

    // Generic status change event
    this.eventEmitter.emit('order.license.status.changed', event);
  }
}

// ============================================
// INTERNAL TYPES
// ============================================

type LicenseStatusAnalysis = {
  total: number;
  pending: number;
  processing: number;
  created: number;
  upgraded: number;
  activated: number;
  revoked: number;
  failed: number;

  // Derived flags
  allCreated: boolean;
  allActivated: boolean;
  anyFailed: boolean;
  anyPending: boolean;
};
