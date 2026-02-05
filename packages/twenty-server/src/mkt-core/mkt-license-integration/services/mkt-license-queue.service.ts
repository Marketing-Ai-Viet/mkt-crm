import { Injectable, Logger } from '@nestjs/common';

import { createHash } from 'crypto';

import { v4 as uuidv4 } from 'uuid';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { LICENSE_QUEUE_CONFIG } from 'src/mkt-core/mkt-license-integration/constants/license-queue.constants';
import {
  LICENSE_JOB_ACTIONS,
  LICENSE_JOB_NAMES,
  LicenseActivationJobData,
  LicenseCreationJobData,
  LicenseRevocationJobData,
  LicenseUpgradeJobData,
  buildLicenseJobId,
  buildLicenseLifecycleJobId,
  buildLicenseUpgradeJobId,
} from 'src/mkt-core/mkt-license-integration/types/license-job.types';
import {
  BulkEnqueueResult,
  EnqueueActivationParams,
  EnqueueCreationParams,
  EnqueueResult,
  EnqueueRevocationParams,
  EnqueueUpgradeParams,
} from 'src/mkt-core/mkt-license-integration/types/license-queue.types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MKT License Queue Service
 *
 * Service for enqueuing license-related jobs with:
 * - Deterministic jobId for BullMQ deduplication
 * - Email hashing for secure logging
 * - Correlation ID for tracing
 *
 * Supports:
 * - License creation (trial/official)
 * - License upgrade (trial → official)
 * - License activation (per-license jobs)
 * - License revocation (per-license, best effort)
 */
@Injectable()
export class MktLicenseQueueService {
  private readonly logger = new Logger(MktLicenseQueueService.name);

  constructor(
    @InjectMessageQueue(MessageQueue.licenseQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  // ============================================
  // EMAIL HASHING (No sensitive data in logs)
  // ============================================

  /**
   * Hash email for logging (không log email plaintext).
   * Uses SHA-256, truncated to 12 characters.
   */
  private hashEmail(email: string): string {
    return createHash('sha256').update(email).digest('hex').substring(0, 12);
  }

  // ============================================
  // LICENSE CREATION
  // ============================================

  /**
   * Enqueue a license creation job.
   *
   * Uses deterministic jobId for BullMQ deduplication:
   * Format: {orderItemId}:{deviceIndex}:{action}
   *
   * @param params - Creation parameters
   * @returns Job ID and correlation ID
   */
  async enqueueCreation(params: EnqueueCreationParams): Promise<EnqueueResult> {
    const correlationId = uuidv4();

    // Deterministic jobId để đảm bảo dedup
    const jobId = buildLicenseJobId(
      params.orderItemId,
      params.deviceIndex,
      params.action,
    );

    const jobData: LicenseCreationJobData = {
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      action: params.action,
      payload: {
        customerId: params.customerId,
        customerEmailHash: this.hashEmail(params.customerEmail),
        customerEmail: params.customerEmail,
        productId: params.productId,
        productPackageId: params.productPackageId,
        trialDays: params.trialDays,
        maxDevices: params.maxDevices,
        deviceIndex: params.deviceIndex,
      },
      metadata: {
        enqueuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        correlationId,
      },
    };

    await this.messageQueueService.add<LicenseCreationJobData>(
      LICENSE_JOB_NAMES.CREATION,
      jobData,
      {
        id: jobId, // Deterministic jobId for dedup
        retryLimit: LICENSE_QUEUE_CONFIG.JOB_OPTIONS.CREATION.attempts,
      },
    );

    this.logger.log({
      message: 'License creation job enqueued',
      jobId,
      correlationId,
      orderItemId: params.orderItemId,
      deviceIndex: params.deviceIndex,
      action: params.action,
      productId: params.productId,
      // Không log email - chỉ log hash nếu cần debug
    });

    return { jobId, correlationId };
  }

  /**
   * Bulk enqueue creation jobs for multiple items/devices.
   *
   * Each item is enqueued as a separate job for partial failure handling.
   *
   * @param items - Array of creation parameters
   * @returns Array of job IDs and correlation IDs
   */
  async enqueueBulkCreation(
    items: EnqueueCreationParams[],
  ): Promise<BulkEnqueueResult> {
    const results: EnqueueResult[] = [];

    for (const item of items) {
      const result = await this.enqueueCreation(item);

      results.push(result);
    }

    const jobIds = results.map((r) => r.jobId);
    const correlationIds = results.map((r) => r.correlationId);

    this.logger.log({
      message: 'Bulk license creation jobs enqueued',
      count: items.length,
      jobIds,
    });

    return {
      jobIds,
      correlationIds,
      count: items.length,
    };
  }

  // ============================================
  // LICENSE UPGRADE
  // ============================================

  /**
   * Enqueue a license upgrade job (trial → official).
   *
   * Uses deterministic jobId:
   * Format: {orderItemId}:upgrade:{licenseId}
   *
   * @param params - Upgrade parameters
   * @returns Job ID and correlation ID
   */
  async enqueueUpgrade(params: EnqueueUpgradeParams): Promise<EnqueueResult> {
    const correlationId = uuidv4();

    // Deterministic jobId
    const jobId = buildLicenseUpgradeJobId(
      params.orderItemId,
      params.licenseId,
    );

    const jobData: LicenseUpgradeJobData = {
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      action: LICENSE_JOB_ACTIONS.UPGRADE_TRIAL,
      payload: {
        licenseId: params.licenseId,
        productPackageId: params.productPackageId,
        maxDevices: params.maxDevices,
        reason: params.reason,
      },
      metadata: {
        enqueuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        correlationId,
      },
    };

    await this.messageQueueService.add<LicenseUpgradeJobData>(
      LICENSE_JOB_NAMES.UPGRADE,
      jobData,
      {
        id: jobId,
        retryLimit: LICENSE_QUEUE_CONFIG.JOB_OPTIONS.UPGRADE.attempts,
      },
    );

    this.logger.log({
      message: 'License upgrade job enqueued',
      jobId,
      correlationId,
      licenseId: params.licenseId,
      orderItemId: params.orderItemId,
    });

    return { jobId, correlationId };
  }

  // ============================================
  // LICENSE ACTIVATION
  // ============================================

  /**
   * Enqueue a license activation job.
   *
   * IMPORTANT: Each license is enqueued separately (not batched)
   * to handle partial failures correctly.
   *
   * Uses deterministic jobId:
   * Format: {orderItemId}:{licenseId}:ACTIVATE
   *
   * @param params - Activation parameters
   * @returns Job ID and correlation ID
   */
  async enqueueActivation(
    params: EnqueueActivationParams,
  ): Promise<EnqueueResult> {
    const correlationId = uuidv4();

    // Deterministic jobId for activation
    const jobId = buildLicenseLifecycleJobId(
      params.orderItemId,
      params.licenseId,
      LICENSE_JOB_ACTIONS.ACTIVATE,
    );

    const jobData: LicenseActivationJobData = {
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      licenseId: params.licenseId,
      action: LICENSE_JOB_ACTIONS.ACTIVATE,
      metadata: {
        enqueuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        correlationId,
      },
    };

    await this.messageQueueService.add<LicenseActivationJobData>(
      LICENSE_JOB_NAMES.ACTIVATION,
      jobData,
      {
        id: jobId,
        retryLimit: LICENSE_QUEUE_CONFIG.JOB_OPTIONS.ACTIVATION.attempts,
      },
    );

    this.logger.log({
      message: 'License activation job enqueued',
      jobId,
      correlationId,
      licenseId: params.licenseId,
      orderItemId: params.orderItemId,
    });

    return { jobId, correlationId };
  }

  /**
   * Bulk activation - enqueue từng license riêng biệt.
   *
   * IMPORTANT: Does NOT batch activations. Each license gets its own job
   * so that partial failures can be handled individually.
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @param licenses - Array of licenses to activate
   * @returns Array of correlation IDs
   */
  async enqueueBulkActivation(
    workspaceId: string,
    orderId: string,
    licenses: Array<{ orderItemId: string; licenseId: string }>,
  ): Promise<BulkEnqueueResult> {
    const results: EnqueueResult[] = [];

    for (const license of licenses) {
      const result = await this.enqueueActivation({
        workspaceId,
        orderId,
        orderItemId: license.orderItemId,
        licenseId: license.licenseId,
      });

      results.push(result);
    }

    const jobIds = results.map((r) => r.jobId);
    const correlationIds = results.map((r) => r.correlationId);

    this.logger.log({
      message: 'Bulk license activation jobs enqueued',
      count: licenses.length,
      orderId,
    });

    return {
      jobIds,
      correlationIds,
      count: licenses.length,
    };
  }

  // ============================================
  // LICENSE REVOCATION
  // ============================================

  /**
   * Enqueue a license revocation job.
   *
   * NOTE: Revocation is best-effort. Jobs may fail but order
   * will still be marked as refunded.
   *
   * Uses deterministic jobId:
   * Format: {orderItemId}:{licenseId}:REVOKE
   *
   * @param params - Revocation parameters
   * @returns Job ID and correlation ID
   */
  async enqueueRevocation(
    params: EnqueueRevocationParams,
  ): Promise<EnqueueResult> {
    const correlationId = uuidv4();

    // Deterministic jobId for revocation
    const jobId = buildLicenseLifecycleJobId(
      params.orderItemId,
      params.licenseId,
      LICENSE_JOB_ACTIONS.REVOKE,
    );

    const jobData: LicenseRevocationJobData = {
      workspaceId: params.workspaceId,
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      licenseId: params.licenseId,
      action: LICENSE_JOB_ACTIONS.REVOKE,
      metadata: {
        enqueuedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
        correlationId,
      },
    };

    await this.messageQueueService.add<LicenseRevocationJobData>(
      LICENSE_JOB_NAMES.REVOCATION,
      jobData,
      {
        id: jobId,
        retryLimit: LICENSE_QUEUE_CONFIG.JOB_OPTIONS.REVOCATION.attempts,
      },
    );

    this.logger.log({
      message: 'License revocation job enqueued',
      jobId,
      correlationId,
      licenseId: params.licenseId,
      orderItemId: params.orderItemId,
    });

    return { jobId, correlationId };
  }

  /**
   * Bulk revocation - enqueue từng license riêng biệt (best effort).
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @param licenses - Array of licenses to revoke
   * @returns Array of correlation IDs
   */
  async enqueueBulkRevocation(
    workspaceId: string,
    orderId: string,
    licenses: Array<{ orderItemId: string; licenseId: string }>,
  ): Promise<BulkEnqueueResult> {
    const results: EnqueueResult[] = [];

    for (const license of licenses) {
      const result = await this.enqueueRevocation({
        workspaceId,
        orderId,
        orderItemId: license.orderItemId,
        licenseId: license.licenseId,
      });

      results.push(result);
    }

    const jobIds = results.map((r) => r.jobId);
    const correlationIds = results.map((r) => r.correlationId);

    this.logger.log({
      message: 'Bulk license revocation jobs enqueued',
      count: licenses.length,
      orderId,
    });

    return {
      jobIds,
      correlationIds,
      count: licenses.length,
    };
  }
}
