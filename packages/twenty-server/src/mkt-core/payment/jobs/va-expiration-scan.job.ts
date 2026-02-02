/**
 * VA Expiration Scan Job
 *
 * BullMQ job that periodically scans for expired Virtual Accounts
 * and deactivates them.
 *
 * Schedule: Every 15 minutes (via PAYMENT_JOB_CRON.VA_EXPIRATION_SCAN)
 */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import chunk from 'lodash.chunk';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MktVirtualAccountRepository } from 'src/mkt-core/payment/repositories';
import {
  PAYMENT_JOB_NAMES,
  PAYMENT_JOB_CRON,
  PAYMENT_JOB_CONFIG,
} from 'src/mkt-core/payment/constants/job.constants';
import {
  IVAProvider,
  VA_PROVIDER_TOKEN,
} from 'src/mkt-core/payment/domain/ports';

// ============================================
// TYPES
// ============================================

/**
 * Job data for VA expiration scan
 */
export type VAExpirationScanJobData = {
  workspaceId: string;
};

/**
 * Result of VA expiration scan
 */
type VAExpirationScanResult = {
  scannedCount: number;
  deactivatedCount: number;
  failedCount: number;
  failedVAIds: string[];
};

// ============================================
// JOB PROCESSOR
// ============================================

/**
 * VAExpirationScanJob
 *
 * Cron job processor to scan and deactivate expired Virtual Accounts.
 *
 * Process:
 * 1. Find all active VAs with expiresAt < now
 * 2. For each expired VA (in batches):
 *    - Call vaProvider.deactivateVA() if available
 *    - Update isActive = false in database
 *    - Emit va.expired event
 * 3. Log results and metrics
 *
 * Architecture:
 * - Job is thin layer, delegates to repository and provider
 * - Processes in batches to avoid overload
 * - Graceful degradation if provider unavailable
 */
@Processor(MessageQueue.cronQueue)
@Injectable()
export class VAExpirationScanJob {
  private readonly logger = new Logger(VAExpirationScanJob.name);

  constructor(
    private readonly vaRepository: MktVirtualAccountRepository,
    private readonly eventEmitter: EventEmitter2,
    @Optional()
    @Inject(VA_PROVIDER_TOKEN)
    private readonly vaProvider: IVAProvider | null,
  ) {}

  /**
   * Process VA expiration scan job
   */
  @Process(PAYMENT_JOB_NAMES.VA_EXPIRATION_SCAN)
  @SentryCronMonitor(
    PAYMENT_JOB_NAMES.VA_EXPIRATION_SCAN,
    PAYMENT_JOB_CRON.VA_EXPIRATION_SCAN,
  )
  async handle(data: VAExpirationScanJobData): Promise<void> {
    const { workspaceId } = data;
    const startTime = Date.now();

    this.logger.log('Starting VA expiration scan', { workspaceId });

    try {
      const result = await this.scanAndDeactivateExpiredVAs(workspaceId);
      const durationMs = Date.now() - startTime;

      this.logResult(workspaceId, result, durationMs);
    } catch (error) {
      this.handleError(workspaceId, error);
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Scan and deactivate expired VAs for a workspace
   */
  private async scanAndDeactivateExpiredVAs(
    workspaceId: string,
  ): Promise<VAExpirationScanResult> {
    // Find all expired active VAs
    const expiredVAs =
      await this.vaRepository.findExpiredActiveVAs(workspaceId);

    if (expiredVAs.length === 0) {
      this.logger.debug('No expired VAs found', { workspaceId });

      return {
        scannedCount: 0,
        deactivatedCount: 0,
        failedCount: 0,
        failedVAIds: [],
      };
    }

    this.logger.log('Found expired VAs', {
      workspaceId,
      count: expiredVAs.length,
    });

    // Process in batches
    const batches = chunk(
      expiredVAs,
      PAYMENT_JOB_CONFIG.VA_EXPIRATION_BATCH_SIZE,
    );
    let totalDeactivated = 0;
    let totalFailed = 0;
    const failedVAIds: string[] = [];

    for (const batch of batches) {
      const batchResult = await this.processBatch(batch, workspaceId);

      totalDeactivated += batchResult.deactivated;
      totalFailed += batchResult.failed;
      failedVAIds.push(...batchResult.failedIds);

      this.logger.debug('Processed batch', {
        workspaceId,
        batchSize: batch.length,
        deactivated: batchResult.deactivated,
        failed: batchResult.failed,
      });
    }

    return {
      scannedCount: expiredVAs.length,
      deactivatedCount: totalDeactivated,
      failedCount: totalFailed,
      failedVAIds,
    };
  }

  /**
   * Process a batch of expired VAs
   */
  private async processBatch(
    vas: { id: string; vaNumber: string; mktOrderId?: string }[],
    workspaceId: string,
  ): Promise<{ deactivated: number; failed: number; failedIds: string[] }> {
    const idsToDeactivate: string[] = [];
    const failedIds: string[] = [];

    // Try to deactivate via provider first (if available)
    for (const va of vas) {
      try {
        // Call provider to deactivate (if configured)
        if (this.vaProvider) {
          await this.vaProvider.deactivateVA(va.vaNumber);
        }

        idsToDeactivate.push(va.id);

        // Emit event
        this.eventEmitter.emit('va.expired', {
          workspaceId,
          vaId: va.id,
          vaNumber: va.vaNumber,
          orderId: va.mktOrderId,
        });
      } catch (error) {
        this.logger.warn({
          message: 'Failed to deactivate VA via provider',
          vaId: va.id,
          vaNumber: va.vaNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Still deactivate in database even if provider fails
        idsToDeactivate.push(va.id);
        failedIds.push(va.id);
      }
    }

    // Bulk deactivate in database
    if (idsToDeactivate.length > 0) {
      await this.vaRepository.bulkDeactivate(idsToDeactivate, workspaceId);
    }

    return {
      deactivated: idsToDeactivate.length,
      failed: failedIds.length,
      failedIds,
    };
  }

  /**
   * Log scan result
   */
  private logResult(
    workspaceId: string,
    result: VAExpirationScanResult,
    durationMs: number,
  ): void {
    const logContext = {
      workspaceId,
      scannedCount: result.scannedCount,
      deactivatedCount: result.deactivatedCount,
      failedCount: result.failedCount,
      durationMs,
    };

    if (result.failedCount > 0) {
      this.logger.warn('VA expiration scan completed with failures', {
        ...logContext,
        failedVAIds: result.failedVAIds,
      });
    } else if (result.scannedCount > 0) {
      this.logger.log('VA expiration scan completed', logContext);
    } else {
      this.logger.debug('No expired VAs found', logContext);
    }
  }

  /**
   * Handle and log error
   */
  private handleError(workspaceId: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('VA expiration scan failed', {
      workspaceId,
      error: errorMessage,
    });

    throw error;
  }
}
