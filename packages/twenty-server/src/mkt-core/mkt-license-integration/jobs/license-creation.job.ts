import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MktLicenseProxyService } from 'src/mkt-core/mkt-license-integration/services/mkt-license-proxy.service';
import {
  LICENSE_JOB_ACTIONS,
  LICENSE_JOB_NAMES,
  LicenseCreationJobData,
} from 'src/mkt-core/mkt-license-integration/types/license-job.types';
import { LICENSE_ITEM_STATUS } from 'src/mkt-core/order/constants/license-item-status.constants';
import { MktOrderItemRepository } from 'src/mkt-core/order/repositories/mkt-order-item.repository';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * License Creation Job Processor
 *
 * Handles license creation jobs (CREATE_TRIAL | CREATE_OFFICIAL).
 *
 * Idempotency:
 * - Checks if license already exists for orderItem + deviceIndex
 * - If exists → skip (job succeeds but no action taken)
 *
 * Error Handling:
 * - Updates order item status to PROCESSING before API call
 * - Updates to CREATED on success, FAILED on max retries exceeded
 * - Errors are re-thrown for BullMQ retry mechanism
 */
@Processor(MessageQueue.licenseQueue)
export class LicenseCreationJob {
  private readonly logger = new Logger(LicenseCreationJob.name);

  constructor(
    private readonly mktLicenseProxy: MktLicenseProxyService,
    private readonly orderItemRepository: MktOrderItemRepository,
  ) {}

  @Process(LICENSE_JOB_NAMES.CREATION)
  async handle(data: LicenseCreationJobData): Promise<void> {
    const { workspaceId, orderItemId, action, payload, metadata } = data;
    const startTime = DateTimeUtils.toMillis(DateTimeUtils.now());

    this.logger.log({
      message: 'Processing license creation job',
      correlationId: metadata.correlationId,
      orderItemId,
      deviceIndex: payload.deviceIndex,
      action,
    });

    try {
      // 1. Idempotency check: đã có license cho item+deviceIndex chưa?
      const orderItem =
        await this.orderItemRepository.findByIdWithOptions(orderItemId);

      if (!orderItem) {
        this.logger.warn({
          message: 'Order item not found, skipping job',
          correlationId: metadata.correlationId,
          orderItemId,
        });

        return;
      }

      // Check if license already exists in orderItem.licenses array
      const existingLicense = this.findExistingLicense(
        orderItem.licenses,
        payload.deviceIndex,
      );

      if (existingLicense) {
        this.logger.log({
          message: 'License already exists, skipping (idempotent)',
          correlationId: metadata.correlationId,
          orderItemId,
          deviceIndex: payload.deviceIndex,
          existingLicenseId: existingLicense.id,
        });

        return; // Idempotent - job succeeds but no action taken
      }

      // 2. Update item status to PROCESSING
      await this.orderItemRepository.updateOrderItem(
        orderItemId,
        { licenseStatus: LICENSE_ITEM_STATUS.PROCESSING },
        workspaceId,
      );

      // 3. Call MKT Server API
      let licenseResponse;

      if (action === LICENSE_JOB_ACTIONS.CREATE_TRIAL) {
        licenseResponse = await this.mktLicenseProxy.createOrReuseTrial({
          customerId: payload.customerId,
          productId: payload.productId,
          workspaceId,
          trialDays: payload.trialDays ?? 14,
          maxDevices: payload.maxDevices,
        });
      } else {
        // CREATE_OFFICIAL requires productPackageId
        if (!payload.productPackageId) {
          throw new Error(
            'productPackageId is required for CREATE_OFFICIAL action',
          );
        }

        licenseResponse = await this.mktLicenseProxy.create({
          productPackageId: payload.productPackageId,
          productId: payload.productId,
          email: payload.customerEmail,
          maxDevices: payload.maxDevices,
        });
      }

      // Get the license from response (createOrReuseTrial returns { license, reused })
      const license =
        'license' in licenseResponse
          ? licenseResponse.license
          : licenseResponse;

      // 4. Update order item with license info
      await this.addLicenseToOrderItem(
        workspaceId,
        orderItemId,
        orderItem.licenses,
        {
          id: license.id,
          licenseKey: license.licenseKey,
          deviceIndex: payload.deviceIndex,
          createdAt: DateTimeUtils.toISO(DateTimeUtils.now()),
          snapshot: {
            type: license.type,
            productId: license.productId,
            expiresAt: license.endDate ?? undefined,
            maxDevices: license.maxDevices,
          },
        },
      );

      // 5. Update item status to CREATED
      await this.orderItemRepository.updateOrderItem(
        orderItemId,
        { licenseStatus: LICENSE_ITEM_STATUS.CREATED },
        workspaceId,
      );

      const duration = DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;

      this.logger.log({
        message: 'License created successfully',
        correlationId: metadata.correlationId,
        orderItemId,
        deviceIndex: payload.deviceIndex,
        licenseId: license.id,
        duration,
      });
    } catch (error) {
      const duration = DateTimeUtils.toMillis(DateTimeUtils.now()) - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error({
        message: 'License creation failed',
        correlationId: metadata.correlationId,
        orderItemId,
        deviceIndex: payload.deviceIndex,
        action,
        duration,
        error: errorMessage,
        // Không log stack trace với sensitive data
      });

      // Re-throw for BullMQ retry mechanism
      throw error;
    }
  }

  /**
   * Find existing license by deviceIndex in licenses array
   */
  private findExistingLicense(
    licenses: unknown,
    deviceIndex: number,
  ): LicenseInfo | undefined {
    if (!Array.isArray(licenses)) {
      return undefined;
    }

    return (licenses as LicenseInfo[]).find(
      (license) => license.deviceIndex === deviceIndex,
    );
  }

  /**
   * Add new license to orderItem.licenses array
   */
  private async addLicenseToOrderItem(
    workspaceId: string,
    orderItemId: string,
    existingLicenses: unknown,
    newLicense: LicenseInfo,
  ): Promise<void> {
    const licenses = Array.isArray(existingLicenses) ? existingLicenses : [];

    await this.orderItemRepository.updateOrderItem(
      orderItemId,
      {
        licenses: [...licenses, newLicense],
      },
      workspaceId,
    );
  }
}

// ============================================
// INTERNAL TYPES
// ============================================

type LicenseInfo = {
  id: string;
  licenseKey: string;
  deviceIndex: number;
  createdAt: string;
  snapshot?: {
    type?: string;
    productId?: string;
    expiresAt?: string;
    maxDevices?: number;
  };
};
