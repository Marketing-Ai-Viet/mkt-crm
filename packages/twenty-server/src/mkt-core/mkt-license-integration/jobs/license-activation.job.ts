import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import {
  LICENSE_JOB_NAMES,
  LicenseActivationJobData,
} from 'src/mkt-core/mkt-license-integration/types/license-job.types';
import { LICENSE_ITEM_STATUS } from 'src/mkt-core/order/constants/license-item-status.constants';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * License Activation Job Processor
 *
 * Handles license activation jobs.
 * Each job activates ONE license for partial failure handling.
 *
 * Idempotency:
 * - Checks if license status is already ACTIVE
 * - If already active → skip (job succeeds but no action taken)
 */
@Processor(MessageQueue.licenseQueue)
export class LicenseActivationJob {
  private readonly logger = new Logger(LicenseActivationJob.name);

  constructor(
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {}

  @Process(LICENSE_JOB_NAMES.ACTIVATION)
  async handle(data: LicenseActivationJobData): Promise<void> {
    const { workspaceId, orderItemId, licenseId, metadata } = data;
    const startTime = DateTimeUtils.toMillis(DateTimeUtils.now());

    this.logger.log({
      message: 'Processing license activation job',
      correlationId: metadata.correlationId,
      orderItemId,
      licenseId,
    });

    try {
      // 1. Idempotency check: license đã active chưa?
      const license = await this.mktLicenseProxy.findById(licenseId);

      if (license?.status === 'active') {
        this.logger.log({
          message: 'License already active, skipping (idempotent)',
          correlationId: metadata.correlationId,
          licenseId,
        });

        return; // Idempotent skip
      }

      // 2. Activate license on MKT Server
      await this.mktLicenseProxy.activate(licenseId);

      // 3. Update order item license status to ACTIVATED
      // Note: We track activation per-license in the item's licenseStatus
      await this.orderItemRepository.updateOrderItem(
        orderItemId,
        { licenseStatus: LICENSE_ITEM_STATUS.ACTIVATED },
        workspaceId,
      );

      const duration = DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;

      this.logger.log({
        message: 'License activated successfully',
        correlationId: metadata.correlationId,
        licenseId,
        orderItemId,
        duration,
      });
    } catch (error) {
      const duration = DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error({
        message: 'License activation failed',
        correlationId: metadata.correlationId,
        orderItemId,
        licenseId,
        duration,
        error: errorMessage,
      });

      throw error;
    }
  }
}
