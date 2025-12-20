import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
} from 'src/mkt-core/common/common.type';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import { ORDER_STATUS } from 'src/mkt-core/order/constants';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import {
  LicenseOperationResult,
  MktOrderCustomEventData,
  MktOrderCustomEventPayload,
} from 'src/mkt-core/order/types';
import { LICENSE_LIFECYCLE_MESSAGES } from 'src/mkt-core/order/messages';

// ============================================
// CONSTANTS
// ============================================

const LICENSE_LIFECYCLE_LOG_CONTEXT = 'LicenseLifecycleListener';

/**
 * LicenseLifecycleListener - Handle license lifecycle based on order events
 *
 * This listener manages the lifecycle of licenses on MKT Server:
 * - When order is COMPLETED: Activate licenses
 * - When order is REFUNDED: Revoke licenses
 *
 * Note: This listener is separate from MktOrderCustomEventListener to
 * maintain single responsibility principle and allow independent testing.
 */
@Injectable()
export class LicenseLifecycleListener {
  private readonly logger = new Logger(LICENSE_LIFECYCLE_LOG_CONTEXT);

  constructor(
    private readonly mktLicenseProxy: MktLicenseProxyService,
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
    const { eventType, orderData, workspaceId, orderId } = event;

    if (!orderId) {
      this.logger.warn('Event missing orderId, skipping license lifecycle');

      return;
    }

    // Handle order completion - activate licenses
    if (orderData.status === ORDER_STATUS.COMPLETED) {
      await this.activateLicensesForOrder(workspaceId, orderId);

      return;
    }

    // Handle order refund - revoke licenses
    if (eventType === MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED) {
      await this.revokeLicensesForOrder(workspaceId, orderId);

      return;
    }

    this.logger.debug(
      LICENSE_LIFECYCLE_MESSAGES.SKIP_EVENT(eventType ?? 'unknown'),
    );
  }

  /**
   * Activate all licenses for an order on MKT Server
   */
  private async activateLicensesForOrder(
    workspaceId: string,
    orderId: string,
  ): Promise<void> {
    this.logger.log(LICENSE_LIFECYCLE_MESSAGES.ACTIVATE_START(orderId));

    const licenseIds = await this.getExternalLicenseIds(workspaceId, orderId);

    if (licenseIds.length === 0) {
      this.logger.debug(LICENSE_LIFECYCLE_MESSAGES.NO_LICENSES(orderId));

      return;
    }

    const results = await this.activateLicenses(licenseIds);
    const successCount = results.filter((r) => r.success).length;

    if (successCount === licenseIds.length) {
      this.logger.log(
        LICENSE_LIFECYCLE_MESSAGES.ACTIVATE_SUCCESS(orderId, successCount),
      );
    } else {
      this.logger.warn(
        `Partial license activation for order ${orderId}: ${successCount}/${licenseIds.length} succeeded`,
      );
    }
  }

  /**
   * Revoke all licenses for an order on MKT Server
   */
  private async revokeLicensesForOrder(
    workspaceId: string,
    orderId: string,
  ): Promise<void> {
    this.logger.log(LICENSE_LIFECYCLE_MESSAGES.REVOKE_START(orderId));

    const licenseIds = await this.getExternalLicenseIds(workspaceId, orderId);

    if (licenseIds.length === 0) {
      this.logger.debug(LICENSE_LIFECYCLE_MESSAGES.NO_LICENSES(orderId));

      return;
    }

    const results = await this.revokeLicenses(licenseIds);
    const successCount = results.filter((r) => r.success).length;

    if (successCount === licenseIds.length) {
      this.logger.log(
        LICENSE_LIFECYCLE_MESSAGES.REVOKE_SUCCESS(orderId, successCount),
      );
    } else {
      this.logger.warn(
        `Partial license revocation for order ${orderId}: ${successCount}/${licenseIds.length} succeeded`,
      );
    }
  }

  /**
   * Get external MKT license IDs from order items
   */
  private async getExternalLicenseIds(
    workspaceId: string,
    orderId: string,
  ): Promise<string[]> {
    const orderItems = await this.orderItemRepository.findByOrderId(
      workspaceId,
      orderId,
    );

    return orderItems
      .filter(
        (item): item is typeof item & { externalMktLicenseId: string } =>
          !!item.externalMktLicenseId,
      )
      .map((item) => item.externalMktLicenseId);
  }

  /**
   * Activate multiple licenses on MKT Server
   */
  private async activateLicenses(
    licenseIds: string[],
  ): Promise<LicenseOperationResult[]> {
    const results: LicenseOperationResult[] = [];

    for (const licenseId of licenseIds) {
      try {
        await this.mktLicenseProxy.activate(licenseId);
        results.push({ success: true, licenseId });
        this.logger.debug(`Activated license: ${licenseId}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        results.push({
          success: false,
          licenseId,
          error: errorMessage,
        });
        this.logger.error(`Failed to activate license ${licenseId}`, error);
      }
    }

    return results;
  }

  /**
   * Revoke multiple licenses on MKT Server
   */
  private async revokeLicenses(
    licenseIds: string[],
  ): Promise<LicenseOperationResult[]> {
    const results: LicenseOperationResult[] = [];

    for (const licenseId of licenseIds) {
      try {
        await this.mktLicenseProxy.revoke(licenseId);
        results.push({ success: true, licenseId });
        this.logger.debug(`Revoked license: ${licenseId}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        results.push({
          success: false,
          licenseId,
          error: errorMessage,
        });
        this.logger.error(`Failed to revoke license ${licenseId}`, error);
      }
    }

    return results;
  }
}
