import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
  MktOrderCustomEventData,
  MktOrderCustomEventPayload,
} from 'src/mkt-core/order/types';
import { MktLicenseQueueService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-queue.service';
import { ORDER_STATUS } from 'src/mkt-core/order/constants';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { LICENSE_LIFECYCLE_MESSAGES } from 'src/mkt-core/order/messages';

// ============================================
// CONSTANTS
// ============================================

const LICENSE_LIFECYCLE_LOG_CONTEXT = 'LicenseLifecycleListener';

/**
 * LicenseLifecycleListener - Handle license lifecycle based on order events
 *
 * This listener manages the lifecycle of licenses via async queue:
 * - When order is COMPLETED: Enqueue license activation jobs
 * - When order is REFUNDED: Enqueue license revocation jobs
 *
 * Phase 3: Replaced synchronous MktLicenseProxyService calls with
 * MktLicenseQueueService for async processing via BullMQ.
 */
@Injectable()
export class LicenseLifecycleListener {
  private readonly logger = new Logger(LICENSE_LIFECYCLE_LOG_CONTEXT);

  constructor(
    private readonly mktLicenseQueueService: MktLicenseQueueService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {}

  /**
   * Handle MKT Order events for license lifecycle
   */
  @OnEvent(MKT_EVENT_TYPE.MKT_ORDER)
  async handleOrderLicenseLifecycle(
    payload: MktOrderCustomEventPayload,
  ): Promise<void> {
    for (const event of payload.events) {
      try {
        await this.processLicenseLifecycle(event);
      } catch (error) {
        this.logger.error(
          `Failed to process license lifecycle for order: ${event.orderId}`,
          error,
        );
        // Continue processing other events
      }
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Process license lifecycle based on event type
   */
  private async processLicenseLifecycle(
    event: MktOrderCustomEventData,
  ): Promise<void> {
    const { eventType, orderData, orderId } = event;

    if (!orderId) {
      this.logger.warn('Event missing orderId, skipping license lifecycle');

      return;
    }

    // Handle order completion - enqueue license activation jobs
    if (orderData.status === ORDER_STATUS.COMPLETED) {
      await this.activateLicensesForOrder(event.workspaceId, orderId);

      return;
    }

    // Handle order refund - enqueue license revocation jobs
    if (eventType === MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED) {
      await this.revokeLicensesForOrder(event.workspaceId, orderId);

      return;
    }

    this.logger.debug(
      LICENSE_LIFECYCLE_MESSAGES.SKIP_EVENT(eventType ?? 'unknown'),
    );
  }

  /**
   * Enqueue activation jobs for all licenses in an order
   */
  private async activateLicensesForOrder(
    workspaceId: string,
    orderId: string,
  ): Promise<void> {
    this.logger.log(LICENSE_LIFECYCLE_MESSAGES.ACTIVATE_START(orderId));

    const licensePairs = await this.getExternalLicensePairs(orderId);

    if (licensePairs.length === 0) {
      this.logger.debug(LICENSE_LIFECYCLE_MESSAGES.NO_LICENSES(orderId));

      return;
    }

    const result = await this.mktLicenseQueueService.enqueueBulkActivation(
      workspaceId,
      orderId,
      licensePairs,
    );

    this.logger.log(
      LICENSE_LIFECYCLE_MESSAGES.ACTIVATE_SUCCESS(orderId, result.count),
    );
  }

  /**
   * Enqueue revocation jobs for all licenses in an order
   */
  private async revokeLicensesForOrder(
    workspaceId: string,
    orderId: string,
  ): Promise<void> {
    this.logger.log(LICENSE_LIFECYCLE_MESSAGES.REVOKE_START(orderId));

    const licensePairs = await this.getExternalLicensePairs(orderId);

    if (licensePairs.length === 0) {
      this.logger.debug(LICENSE_LIFECYCLE_MESSAGES.NO_LICENSES(orderId));

      return;
    }

    const result = await this.mktLicenseQueueService.enqueueBulkRevocation(
      workspaceId,
      orderId,
      licensePairs,
    );

    this.logger.log(
      LICENSE_LIFECYCLE_MESSAGES.REVOKE_SUCCESS(orderId, result.count),
    );
  }

  /**
   * Get external MKT license pairs (orderItemId + licenseId) from order items.
   * Queue service needs orderItemId for deterministic job IDs.
   */
  private async getExternalLicensePairs(
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
