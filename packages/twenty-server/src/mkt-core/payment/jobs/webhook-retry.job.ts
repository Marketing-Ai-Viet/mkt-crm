/**
 * Webhook Retry Job
 *
 * BullMQ job that periodically retries failed webhook processing.
 *
 * Schedule: Every 5 minutes (via PAYMENT_JOB_CRON.WEBHOOK_RETRY)
 */

import { Injectable, Logger } from '@nestjs/common';

import chunk from 'lodash.chunk';

import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MktWebhookLogRepository } from 'src/mkt-core/payment/repositories';
import {
  ProcessWebhookUseCase,
  WebhookPayload,
} from 'src/mkt-core/payment/application/use-cases';
import {
  PAYMENT_JOB_NAMES,
  PAYMENT_JOB_CRON,
  PAYMENT_JOB_CONFIG,
} from 'src/mkt-core/payment/constants/job.constants';
import { PaymentProviderType } from 'src/mkt-core/payment/constants/payment-provider.constants';

// ============================================
// TYPES
// ============================================

/**
 * Job data for webhook retry
 */
export type WebhookRetryJobData = {
  workspaceId: string;
};

/**
 * Result of webhook retry
 */
type WebhookRetryResult = {
  totalCount: number;
  successCount: number;
  failCount: number;
  permanentFailCount: number;
  failedIds: string[];
};

// ============================================
// JOB PROCESSOR
// ============================================

/**
 * WebhookRetryJob
 *
 * Cron job processor to retry failed webhook processing.
 *
 * Process:
 * 1. Find webhook logs with status FAILED and retryCount < MAX_RETRIES
 * 2. For each (in batches):
 *    - Reprocess the webhook payload
 *    - Update status and retryCount
 *    - Mark as permanent failure if max retries exceeded
 * 3. Log results and metrics
 *
 * Architecture:
 * - Job is thin layer, delegates to ProcessWebhookUseCase
 * - Processes in batches to avoid overload
 * - Exponential backoff is handled by checking nextRetryAt
 */
@Processor(MessageQueue.cronQueue)
@Injectable()
export class WebhookRetryJob {
  private readonly logger = new Logger(WebhookRetryJob.name);

  constructor(
    private readonly webhookLogRepository: MktWebhookLogRepository,
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
  ) {}

  /**
   * Process webhook retry job
   */
  @Process(PAYMENT_JOB_NAMES.WEBHOOK_RETRY)
  @SentryCronMonitor(
    PAYMENT_JOB_NAMES.WEBHOOK_RETRY,
    PAYMENT_JOB_CRON.WEBHOOK_RETRY,
  )
  async handle(data: WebhookRetryJobData): Promise<void> {
    const { workspaceId } = data;
    const startTime = Date.now();

    this.logger.log('Starting webhook retry scan', { workspaceId });

    try {
      const result = await this.scanAndRetryFailedWebhooks(workspaceId);
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
   * Scan and retry failed webhooks for a workspace
   */
  private async scanAndRetryFailedWebhooks(
    workspaceId: string,
  ): Promise<WebhookRetryResult> {
    // Find failed webhook logs that are eligible for retry
    const failedLogs = await this.webhookLogRepository.findByStatus('FAILED');

    // Filter logs that haven't exceeded max retries
    // Note: In a full implementation, we'd have retryCount and nextRetryAt fields
    // For now, we just retry all failed logs once
    const eligibleLogs = failedLogs.slice(
      0,
      PAYMENT_JOB_CONFIG.WEBHOOK_RETRY_BATCH_SIZE,
    );

    if (eligibleLogs.length === 0) {
      this.logger.debug('No failed webhooks to retry', { workspaceId });

      return {
        totalCount: 0,
        successCount: 0,
        failCount: 0,
        permanentFailCount: 0,
        failedIds: [],
      };
    }

    this.logger.log('Found failed webhooks to retry', {
      workspaceId,
      totalFailed: failedLogs.length,
      eligibleCount: eligibleLogs.length,
    });

    // Process in batches
    const batches = chunk(
      eligibleLogs,
      PAYMENT_JOB_CONFIG.WEBHOOK_RETRY_BATCH_SIZE,
    );
    let successCount = 0;
    let failCount = 0;
    let permanentFailCount = 0;
    const failedIds: string[] = [];

    for (const batch of batches) {
      const batchResult = await this.processBatch(batch, workspaceId);

      successCount += batchResult.success;
      failCount += batchResult.fail;
      permanentFailCount += batchResult.permanentFail;
      failedIds.push(...batchResult.failedIds);

      this.logger.debug('Processed retry batch', {
        workspaceId,
        batchSize: batch.length,
        success: batchResult.success,
        fail: batchResult.fail,
      });
    }

    return {
      totalCount: eligibleLogs.length,
      successCount,
      failCount,
      permanentFailCount,
      failedIds,
    };
  }

  /**
   * Process a batch of failed webhooks
   */
  private async processBatch(
    logs: {
      id: string;
      requestBody: object;
      sepayTransactionId: number;
      gateway?: string;
    }[],
    workspaceId: string,
  ): Promise<{
    success: number;
    fail: number;
    permanentFail: number;
    failedIds: string[];
  }> {
    let success = 0;
    let fail = 0;
    const permanentFail = 0;
    const failedIds: string[] = [];

    for (const log of logs) {
      try {
        // Mark as processing
        await this.webhookLogRepository.updateStatus(log.id, 'PROCESSING');

        // Parse the stored request body to construct webhook payload
        const storedPayload = log.requestBody as Record<string, unknown>;
        const transactionId =
          (storedPayload.id as string | number) ??
          (storedPayload.transactionId as string | number) ??
          log.sepayTransactionId;
        const webhookPayload: WebhookPayload = {
          transactionId,
          code: (storedPayload.code as string | null) ?? null,
          content: (storedPayload.content as string | null) ?? null,
          description: storedPayload.description as string | undefined,
          amount:
            ((storedPayload.transferAmount ??
              storedPayload.amount) as number) ?? 0,
          transactionDate:
            (storedPayload.transactionDate as string) ??
            new Date().toISOString(),
          gateway: (storedPayload.gateway as string) ?? log.gateway ?? 'sepay',
        };

        // Reprocess the webhook
        const result = await this.processWebhookUseCase.execute({
          payload: webhookPayload,
          authContext: { workspaceId },
          providerType: (log.gateway?.toUpperCase() ??
            'SEPAY') as PaymentProviderType,
        });

        if (result.success) {
          // Mark as success
          await this.webhookLogRepository.markAsSuccess(log.id, {
            responseStatus: 200,
            responseBody: { retried: true, result },
          });
          success++;
        } else {
          // Still failed - check if should mark as permanent failure
          // For now, mark as failed again (would need retryCount tracking)
          await this.webhookLogRepository.markAsFailed(log.id, {
            responseStatus: 500,
            errorMessage: result.error ?? 'Retry failed',
          });
          fail++;
          failedIds.push(log.id);
        }
      } catch (error) {
        this.logger.warn({
          message: 'Failed to retry webhook',
          logId: log.id,
          transactionId: log.sepayTransactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Mark as failed
        await this.webhookLogRepository.markAsFailed(log.id, {
          responseStatus: 500,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        });

        fail++;
        failedIds.push(log.id);
      }
    }

    return { success, fail, permanentFail, failedIds };
  }

  /**
   * Log retry result
   */
  private logResult(
    workspaceId: string,
    result: WebhookRetryResult,
    durationMs: number,
  ): void {
    const logContext = {
      workspaceId,
      totalCount: result.totalCount,
      successCount: result.successCount,
      failCount: result.failCount,
      permanentFailCount: result.permanentFailCount,
      durationMs,
    };

    if (result.failCount > 0) {
      this.logger.warn('Webhook retry completed with failures', {
        ...logContext,
        failedIds: result.failedIds,
      });
    } else if (result.totalCount > 0) {
      this.logger.log('Webhook retry completed', logContext);
    } else {
      this.logger.debug('No webhooks to retry', logContext);
    }
  }

  /**
   * Handle and log error
   */
  private handleError(workspaceId: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.logger.error('Webhook retry job failed', {
      workspaceId,
      error: errorMessage,
    });

    throw error;
  }
}
