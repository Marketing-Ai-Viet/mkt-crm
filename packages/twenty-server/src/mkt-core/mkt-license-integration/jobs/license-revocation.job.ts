import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import {
  LICENSE_JOB_NAMES,
  LicenseRevocationJobData,
} from 'src/mkt-core/mkt-license-integration/types/license-job.types';
import { LICENSE_ITEM_STATUS } from 'src/mkt-core/order/constants/license-item-status.constants';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';

/**
 * License Revocation Job Processor
 *
 * Handles license revocation jobs (order refunded).
 * Each job revokes ONE license (best effort).
 *
 * Idempotency:
 * - Checks if license status is already REVOKED
 * - If already revoked → skip (job succeeds but no action taken)
 *
 * Best Effort:
 * - Revocation failure is logged but doesn't fail the job
 * - Order will still be marked as refunded
 */
@Processor(MessageQueue.licenseQueue)
export class LicenseRevocationJob {
  private readonly logger = new Logger(LicenseRevocationJob.name);

  constructor(
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {}

  @Process(LICENSE_JOB_NAMES.REVOCATION)
  async handle(data: LicenseRevocationJobData): Promise<void> {
    const { workspaceId, orderItemId, licenseId, metadata } = data;
    const startTime = Date.now();

    this.logger.log({
      message: 'Processing license revocation job',
      correlationId: metadata.correlationId,
      orderItemId,
      licenseId,
    });

    try {
      // 1. Idempotency check: license đã revoked chưa?
      const license = await this.mktLicenseProxy.findById(licenseId);

      if (license?.status === 'revoked') {
        this.logger.log({
          message: 'License already revoked, skipping (idempotent)',
          correlationId: metadata.correlationId,
          licenseId,
        });

        return; // Idempotent skip
      }

      // 2. Revoke license on MKT Server (best effort)
      let revocationSuccess = true;

      try {
        await this.mktLicenseProxy.revoke(licenseId);
      } catch (revokeError) {
        // Log but don't fail - revocation is best effort
        const errorMessage =
          revokeError instanceof Error
            ? revokeError.message
            : String(revokeError);

        this.logger.warn({
          message: 'License revocation failed on MKT Server (best effort)',
          correlationId: metadata.correlationId,
          licenseId,
          error: errorMessage,
        });

        revocationSuccess = false;
      }

      // 3. Update order item license status to REVOKED
      // Even if revocation failed, we mark it as revoked locally
      await this.orderItemRepository.updateOrderItem(
        orderItemId,
        { licenseStatus: LICENSE_ITEM_STATUS.REVOKED },
        workspaceId,
      );

      const duration = Date.now() - startTime;

      this.logger.log({
        message: 'License revocation job completed',
        correlationId: metadata.correlationId,
        licenseId,
        orderItemId,
        revocationSuccess,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error({
        message: 'License revocation job failed',
        correlationId: metadata.correlationId,
        orderItemId,
        licenseId,
        duration,
        error: errorMessage,
      });

      // Re-throw only for non-revocation errors (e.g., DB errors)
      throw error;
    }
  }
}
