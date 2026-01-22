import { Injectable, Logger } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  ORDER_STATUS,
  ORDER_ACTION,
} from 'src/mkt-core/order/constants/order-status.constants';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/mkt-license-integration/types/mkt-license.types';
import { MktLicenseResponse } from 'src/mkt-core/mkt-license-integration/types';
import { OrderLicenseIntegrationService } from 'src/mkt-core/order/services/integration/order-license.integration';
import { UserContext } from 'src/mkt-core/oauth2-client/types';

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
 * Handles order and license locking/unlocking for new payment flow.
 *
 * Lock Flow (when payment deadline exceeded):
 * 1. Update license status → LOCKED on MKT Server
 * 2. Record lockedAt and lockedReason on order
 * 3. Order status → LOCKED
 *
 * Unlock Flow (when late payment confirmed):
 * 1. Update license status → ACTIVE on MKT Server
 * 2. Clear lockedAt and lockedReason on order
 * 3. Order status → COMPLETED
 */
@Injectable()
export class OrderLockService {
  private readonly logger = new Logger(OrderLockService.name);

  constructor(
    private readonly licenseIntegration: OrderLicenseIntegrationService,
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
   * Lock licenses for an order on MKT Server
   *
   * Updates license status to LOCKED via update API
   */
  async lockLicenses(
    licenseIds: string[],
    reason: string = LOCK_REASON_PAYMENT_OVERDUE,
    userContext?: UserContext,
  ): Promise<{
    success: boolean;
    results: { licenseId: string; success: boolean; error?: string }[];
  }> {
    this.logger.debug(`Locking ${licenseIds.length} licenses`, { reason });

    const results: { licenseId: string; success: boolean; error?: string }[] =
      [];

    if (licenseIds.length === 0) {
      return { success: true, results };
    }

    // Lock each license by updating status
    // Note: MKT Server should have an endpoint for this
    // For now, we use revoke which sets status to REVOKED
    // TODO: Add proper lock endpoint on MKT Server that sets status to LOCKED
    const revokeResult = await this.licenseIntegration.revokeLicenses(
      licenseIds,
      userContext,
    );

    for (const licenseId of licenseIds) {
      const error = revokeResult.errors.find((e) => e.licenseId === licenseId);

      results.push({
        licenseId,
        success: !error,
        error: error?.error,
      });
    }

    const success = results.every((r) => r.success);

    this.logger.log(`Lock licenses completed`, {
      total: licenseIds.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return { success, results };
  }

  /**
   * Unlock licenses for an order on MKT Server
   *
   * Updates license status to ACTIVE via activate API
   */
  async unlockLicenses(
    licenseIds: string[],
    userContext?: UserContext,
  ): Promise<{
    success: boolean;
    results: { licenseId: string; success: boolean; error?: string }[];
  }> {
    this.logger.debug(`Unlocking ${licenseIds.length} licenses`);

    const results: { licenseId: string; success: boolean; error?: string }[] =
      [];

    if (licenseIds.length === 0) {
      return { success: true, results };
    }

    // Unlock by activating licenses
    const activateResult = await this.licenseIntegration.activateLicenses(
      licenseIds,
      userContext,
    );

    for (const licenseId of licenseIds) {
      const error = activateResult.errors.find(
        (e) => e.licenseId === licenseId,
      );

      results.push({
        licenseId,
        success: !error,
        error: error?.error,
      });
    }

    const success = results.every((r) => r.success);

    this.logger.log(`Unlock licenses completed`, {
      total: licenseIds.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return { success, results };
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
}
