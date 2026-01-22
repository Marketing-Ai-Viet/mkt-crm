import { Injectable, Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { SInvoiceIntegrationService } from 'src/mkt-core/invoice/integration/s-invoice.integration.service';

export interface SInvoiceIntegrationJobData {
  orderId: string;
  workspaceId: string;
}

@Injectable()
@Processor(MessageQueue.billingQueue)
export class SInvoiceIntegrationJob {
  private readonly logger = new Logger(SInvoiceIntegrationJob.name);

  constructor(
    private readonly sInvoiceIntegrationService: SInvoiceIntegrationService,
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  @Process(SInvoiceIntegrationJob.name)
  async handle(data: SInvoiceIntegrationJobData): Promise<void> {
    const { orderId, workspaceId } = data;
    const startTime = Date.now();

    this.logger.log('Starting S-Invoice integration job', {
      orderId,
      workspaceId,
    });

    try {
      await this.sInvoiceIntegrationService.syncSInvoice(orderId);

      const durationMs = Date.now() - startTime;

      this.logger.log('S-Invoice integration completed', {
        orderId,
        workspaceId,
        durationMs,
      });
    } catch (error) {
      this.handleError(orderId, workspaceId, error);
    }
  }

  /**
   * Handle và log error với structured format
   */
  private handleError(
    orderId: string,
    workspaceId: string,
    error: unknown,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error('Failed to process S-Invoice integration', {
      orderId,
      workspaceId,
      error: errorMessage,
      stack: errorStack,
    });

    throw error;
  }
}
