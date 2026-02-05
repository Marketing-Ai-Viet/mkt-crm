import { Injectable, Logger } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  ORDER_STATUS,
  ORDER_ACTION,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/mkt-license-integration/types/mkt-license.types';
import { MktLicenseResponse } from 'src/mkt-core/mkt-license-integration/types';
import { MktLicenseQueueService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-queue.service';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories';
import { BulkEnqueueResult } from 'src/mkt-core/mkt-license-integration/types/license-queue.types';

/**
 * Order data for lock operations
 */
export type OrderLockData = {
  id: string;
  status: string | null;
  paymentDeadline?: Date | null;
};

/**
 * License IDs for an order (extracted from order items)
 */
export type OrderLicenseIds = {
  orderId: string;
  licenseIds: string[];
};

/**
 * Result of lock operation
 */
export type LockOrderResult = {
  success: boolean;
  orderId: string;
  lockedAt: Date;
  lockedReason: string;
  lockedLicenses: {
    licenseId: string;
    success: boolean;
    error?: string;
  }[];
};

/**
 * Result of unlock operation
 */
export type UnlockOrderResult = {
  success: boolean;
  orderId: string;
  unlockedAt: Date;
  unlockedLicenses: {
    licenseId: string;
    success: boolean;
    error?: string;
  }[];
};

const LOCK_REASON_PAYMENT_OVERDUE = 'Payment overdue - deadline exceeded';

/**
 * OrderLockService
 *
 * Handles order and license locking/unlocking for payment flow.
 *
 * Lock Flow (when payment deadline exceeded):
 * 1. Enqueue license revocation jobs via BullMQ (async)
 * 2. Record lockedAt and lockedReason on order
 * 3. Order status → LOCKED
 *
 * Unlock Flow (when late payment confirmed):
 * 1. Enqueue license activation jobs via BullMQ (async)
 * 2. Clear lockedAt and lockedReason on order
 * 3. Order status → COMPLETED
 */
@Injectable()
export class OrderLockService {
  private readonly logger = new Logger(OrderLockService.name);

  constructor(
    private readonly mktLicenseQueueService: MktLicenseQueueService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {}

  /**
   * Check if order can be locked
   * Only PROCESSING orders can be locked
   */
  canLockOrder(order: OrderLockData): boolean {
    return order.status === ORDER_STATUS.PROCESSING;
  }

  /**
   * Check if order can be unlocked
   * Only LOCKED orders can be unlocked
   */
  canUnlockOrder(order: OrderLockData): boolean {
    return order.status === ORDER_STATUS.LOCKED;
  }

  /**
   * Check if order should be locked (deadline passed)
   */
  shouldLockOrder(order: OrderLockData): boolean {
    if (!this.canLockOrder(order)) {
      return false;
    }

    if (!order.paymentDeadline) {
      return false;
    }

    const deadline = DateTimeUtils.fromDate(order.paymentDeadline);

    // Should lock if deadline is in the past
    return DateTimeUtils.isPast(deadline);
  }

  /**
   * Lock licenses for an order via async queue.
   * Enqueues revocation jobs for all licenses in the order.
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @returns Enqueue result with job count
   */
  async lockLicenses(
    workspaceId: string,
    orderId: string,
  ): Promise<BulkEnqueueResult> {
    const licensePairs = await this.getOrderLicensePairs(orderId);

    if (licensePairs.length === 0) {
      this.logger.debug(`No licenses to lock for order ${orderId}`);

      return { jobIds: [], correlationIds: [], count: 0 };
    }

    this.logger.log(
      `Enqueuing ${licensePairs.length} license revocation jobs for lock (order: ${orderId})`,
    );

    const result = await this.mktLicenseQueueService.enqueueBulkRevocation(
      workspaceId,
      orderId,
      licensePairs,
    );

    this.logger.log(
      `Lock licenses enqueued: ${result.count} jobs for order ${orderId}`,
    );

    return result;
  }

  /**
   * Unlock licenses for an order via async queue.
   * Enqueues activation jobs for all licenses in the order.
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @returns Enqueue result with job count
   */
  async unlockLicenses(
    workspaceId: string,
    orderId: string,
  ): Promise<BulkEnqueueResult> {
    const licensePairs = await this.getOrderLicensePairs(orderId);

    if (licensePairs.length === 0) {
      this.logger.debug(`No licenses to unlock for order ${orderId}`);

      return { jobIds: [], correlationIds: [], count: 0 };
    }

    this.logger.log(
      `Enqueuing ${licensePairs.length} license activation jobs for unlock (order: ${orderId})`,
    );

    const result = await this.mktLicenseQueueService.enqueueBulkActivation(
      workspaceId,
      orderId,
      licensePairs,
    );

    this.logger.log(
      `Unlock licenses enqueued: ${result.count} jobs for order ${orderId}`,
    );

    return result;
  }

  /**
   * Get order update data for lock
   */
  getLockUpdateData(): {
    status: string;
    lockedAt: Date;
    lockedReason: string;
  } {
    return {
      status: ORDER_STATUS.LOCKED,
      lockedAt: DateTimeUtils.toDateRequired(DateTimeUtils.now()),
      lockedReason: LOCK_REASON_PAYMENT_OVERDUE,
    };
  }

  /**
   * Get order update data for unlock
   */
  getUnlockUpdateData(): {
    status: string;
    lockedAt: null;
    lockedReason: null;
  } {
    return {
      status: ORDER_STATUS.COMPLETED,
      lockedAt: null,
      lockedReason: null,
    };
  }

  /**
   * Get order history action for lock
   */
  getLockHistoryAction(): ORDER_ACTION {
    return ORDER_ACTION.LOCK_OVERDUE;
  }

  /**
   * Get order history action for unlock
   */
  getUnlockHistoryAction(): ORDER_ACTION {
    return ORDER_ACTION.UNLOCK_AFTER_PAYMENT;
  }

  /**
   * Extract license IDs from order licenses response
   */
  extractLicenseIds(
    licenses: MktLicenseResponse[] | null | undefined,
  ): string[] {
    if (!licenses) {
      return [];
    }

    return licenses.map((l) => l.id);
  }

  /**
   * Filter licenses that are lockable (not already revoked/expired)
   */
  filterLockableLicenses(licenses: MktLicenseResponse[]): MktLicenseResponse[] {
    const lockableStatuses = [
      MKT_LICENSE_STATUS.ACTIVE,
      MKT_LICENSE_STATUS.PENDING,
      MKT_LICENSE_STATUS.PENDING_PAYMENT,
    ];

    return licenses.filter((l) =>
      lockableStatuses.includes(l.status as (typeof lockableStatuses)[number]),
    );
  }

  /**
   * Filter licenses that are unlockable (locked or revoked)
   */
  filterUnlockableLicenses(
    licenses: MktLicenseResponse[],
  ): MktLicenseResponse[] {
    const unlockableStatuses = [
      MKT_LICENSE_STATUS.REVOKED,
      MKT_LICENSE_STATUS.LOCKED,
    ];

    return licenses.filter((l) =>
      unlockableStatuses.includes(
        l.status as (typeof unlockableStatuses)[number],
      ),
    );
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Get license pairs (orderItemId + licenseId) from order items.
   * Queue service needs orderItemId for deterministic job IDs.
   */
  private async getOrderLicensePairs(
    orderId: string,
  ): Promise<Array<{ orderItemId: string; licenseId: string }>> {
    const orderItems = await this.orderItemRepository.findByOrderId(orderId);

    return orderItems.flatMap((item) =>
      (item.licenses ?? []).map((license) => ({
        orderItemId: item.id,
        licenseId: license.id,
      })),
    );
  }
}
