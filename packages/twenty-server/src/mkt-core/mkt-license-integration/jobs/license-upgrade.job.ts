import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import {
  LICENSE_JOB_NAMES,
  LicenseUpgradeJobData,
} from 'src/mkt-core/mkt-license-integration/types/license-job.types';
import { LICENSE_ITEM_STATUS } from 'src/mkt-core/order/constants/license-item-status.constants';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * License Upgrade Job Processor
 *
 * Handles license upgrade jobs (UPGRADE_TRIAL).
 * Upgrades a trial license to official when payment is confirmed.
 *
 * Idempotency:
 * - Checks if license is already OFFICIAL type
 * - If already upgraded → skip (job succeeds but no action taken)
 */
@Processor(MessageQueue.licenseQueue)
export class LicenseUpgradeJob {
  private readonly logger = new Logger(LicenseUpgradeJob.name);

  constructor(
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {}

  @Process(LICENSE_JOB_NAMES.UPGRADE)
  async handle(data: LicenseUpgradeJobData): Promise<void> {
    const { workspaceId, orderItemId, payload, metadata } = data;
    const startTime = DateTimeUtils.toMillis(DateTimeUtils.now());

    this.logger.log({
      message: 'Processing license upgrade job',
      correlationId: metadata.correlationId,
      orderItemId,
      licenseId: payload.licenseId,
    });

    try {
      // 1. Idempotency check: license đã được upgrade chưa?
      const currentLicense = await this.mktLicenseProxy.findById(
        payload.licenseId,
      );

      if (currentLicense?.type !== 'trial') {
        this.logger.log({
          message:
            'License already upgraded (not trial), skipping (idempotent)',
          correlationId: metadata.correlationId,
          licenseId: payload.licenseId,
        });

        return; // Idempotent skip
      }

      // 2. Update item status to PROCESSING
      await this.orderItemRepository.updateOrderItem(
        orderItemId,
        { licenseStatus: LICENSE_ITEM_STATUS.PROCESSING },
        workspaceId,
      );

      // 3. Call upgrade API
      const upgradedLicense = await this.mktLicenseProxy.upgradeTrial(
        payload.licenseId,
        {
          productPackageId: payload.productPackageId,
          maxDevices: payload.maxDevices,
          reason: payload.reason,
        },
      );

      // 4. Update order item license snapshot
      await this.updateLicenseSnapshot(
        workspaceId,
        orderItemId,
        payload.licenseId,
        {
          type: upgradedLicense.type,
          productId: upgradedLicense.productId,
          expiresAt: upgradedLicense.endDate ?? undefined,
          maxDevices: upgradedLicense.maxDevices,
        },
      );

      // 5. Update item status to UPGRADED
      await this.orderItemRepository.updateOrderItem(
        orderItemId,
        { licenseStatus: LICENSE_ITEM_STATUS.UPGRADED },
        workspaceId,
      );

      const duration = DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;

      this.logger.log({
        message: 'License upgraded successfully',
        correlationId: metadata.correlationId,
        licenseId: payload.licenseId,
        newType: upgradedLicense.type,
        duration,
      });
    } catch (error) {
      const duration = DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error({
        message: 'License upgrade failed',
        correlationId: metadata.correlationId,
        orderItemId,
        licenseId: payload.licenseId,
        duration,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Update license snapshot in orderItem.licenses array
   */
  private async updateLicenseSnapshot(
    workspaceId: string,
    orderItemId: string,
    licenseId: string,
    snapshot: LicenseSnapshot,
  ): Promise<void> {
    const orderItem =
      await this.orderItemRepository.findByIdWithOptions(orderItemId);

    if (!orderItem || !Array.isArray(orderItem.licenses)) {
      return;
    }

    const licenses = orderItem.licenses as LicenseInfo[];
    const updatedLicenses = licenses.map((license) => {
      if (license.id === licenseId) {
        return { ...license, snapshot };
      }

      return license;
    });

    await this.orderItemRepository.updateOrderItem(
      orderItemId,
      { licenses: updatedLicenses },
      workspaceId,
    );
  }
}

// ============================================
// INTERNAL TYPES
// ============================================

type LicenseSnapshot = {
  type?: string;
  productId?: string;
  expiresAt?: string;
  maxDevices?: number;
};

type LicenseInfo = {
  id: string;
  licenseKey: string;
  deviceIndex: number;
  createdAt: string;
  snapshot?: LicenseSnapshot;
};
