import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import {
  ORDER_ACTION,
  ORDER_STATUS,
} from 'src/mkt-core/order/constants/order-status.constants';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  ConfirmOrderInput,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';

/**
 * CompleteOrderAfterLicenseStep - DEPRECATED (Phase 3)
 *
 * Previously: Updated order status to COMPLETED after synchronous license creation.
 *
 * Now: Always skips. Order completion is handled asynchronously by
 * MktLicenseStatusService when all license items reach terminal status
 * (PROCESSING → COMPLETED when all licenses activated).
 *
 * Kept in codebase for safe rollback if needed.
 */
@Injectable()
export class CompleteOrderAfterLicenseStep extends SagaStep<
  ConfirmOrderInput,
  void
> {
  readonly name = 'complete_order_after_license';
  readonly description =
    'Update order status to COMPLETED after license creation';

  private readonly logger = new Logger(CompleteOrderAfterLicenseStep.name);

  constructor(private readonly orderRepository: MktOrderRepository) {
    super();
  }

  /**
   * Always skip - order completion is now handled asynchronously
   * by MktLicenseStatusService when all license items are activated.
   */
  shouldSkip(_context: SagaContext, _input: ConfirmOrderInput): boolean {
    this.logger.debug(
      'Skipping: Order completion delegated to MktLicenseStatusService (async flow)',
    );

    return true;
  }

  async execute(context: SagaContext): Promise<SagaStepResult<void>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      if (!typedContext.orderId) {
        return {
          success: false,
          error: new Error('Order ID not set in context'),
        };
      }

      const licenseData = context.rollbackData.get(
        'create_licenses_on_confirm',
      ) as {
        licenseIds: string[];
      };

      this.logger.log(
        `Completing order ${typedContext.orderId} after ${licenseData.licenseIds.length} licenses created`,
      );

      const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

      // Store previous status for rollback
      context.rollbackData.set(this.name, {
        previousStatus: typedContext.targetStatus,
      });

      // Update order status to COMPLETED
      await this.orderRepository.update(typedContext.orderId, {
        status: ORDER_STATUS.COMPLETED,
        updatedAt: nowISO,
        metadata: safeJsonStringify({
          orderAction: ORDER_ACTION.COMPLETE,
          autoCompletedAt: nowISO,
          licensesCreated: licenseData.licenseIds.length,
          previousStatus: typedContext.targetStatus,
          completedBy: 'system',
        }) as unknown as JSON,
      });

      // Update context with new status
      typedContext.targetStatus = ORDER_STATUS.COMPLETED;

      this.logger.log(
        `Order ${typedContext.orderId} completed: CONFIRMED -> COMPLETED`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to complete order ${typedContext.orderId}`,
        error,
      );

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Complete failed'),
      };
    }
  }

  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const typedContext = context as ConfirmOrderSagaContext;

    const data = context.rollbackData.get(this.name) as {
      previousStatus: ORDER_STATUS;
    } | null;

    if (!typedContext.orderId || !data) {
      this.logger.warn('No rollback data for CompleteOrderAfterLicenseStep');

      return;
    }

    try {
      this.logger.warn(
        `Rolling back order ${typedContext.orderId} from COMPLETED to ${data.previousStatus}`,
      );

      const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

      await this.orderRepository.update(typedContext.orderId, {
        status: data.previousStatus,
        updatedAt: nowISO,
        metadata: safeJsonStringify({
          rolledBackAt: nowISO,
          rolledBackFrom: ORDER_STATUS.COMPLETED,
        }) as unknown as JSON,
      });

      this.logger.log(
        `Order ${typedContext.orderId} rolled back to: ${data.previousStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to rollback order ${typedContext.orderId}`,
        error,
      );
      throw error;
    }
  }
}
