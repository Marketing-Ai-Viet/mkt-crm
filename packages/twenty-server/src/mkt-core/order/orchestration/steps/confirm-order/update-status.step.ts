import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { ConfirmOrderInput } from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga';

/**
 * UpdateStatusStep - Step 3: Update order status in database
 *
 * Responsibilities:
 * - Update order status to target status
 * - Update accounting confirmation if provided
 * - Update note if provided
 * - Store metadata with action and timestamp
 *
 * Compensate:
 * - Restore previous order state from rollbackOrder
 */
@Injectable()
export class UpdateStatusStep extends SagaStep<ConfirmOrderInput, void> {
  readonly name = 'update_status';
  readonly description = 'Update order status in database';

  private readonly logger = new Logger(UpdateStatusStep.name);

  async execute(
    context: SagaContext,
    input: ConfirmOrderInput,
    queryRunner: QueryRunner,
  ): Promise<SagaStepResult<void>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      if (!typedContext.targetStatus || !typedContext.action) {
        return {
          success: false,
          error: new Error(
            'Target status or action not set from previous step',
          ),
        };
      }

      if (!typedContext.orderId) {
        return {
          success: false,
          error: new Error('Order ID not set in context'),
        };
      }

      this.logger.log(
        `Updating order ${typedContext.orderId}: ${typedContext.previousStatus} -> ${typedContext.targetStatus}`,
      );

      const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

      const updateData: Partial<MktOrderWorkspaceEntity> = {
        status: typedContext.targetStatus,
        updatedAt: nowISO,
      };

      // Handle accounting confirmation
      if (input.accountingConfirmed !== undefined) {
        updateData.accountingConfirmed = input.accountingConfirmed;
      }

      // Handle note
      if (input.note) {
        updateData.note = input.note;
      }

      // Store metadata with action details
      updateData.metadata = safeJsonStringify({
        orderAction: typedContext.action,
        confirmedAt: nowISO,
        previousStatus: typedContext.previousStatus,
        confirmedBy: typedContext.workspaceMemberId,
      }) as unknown as JSON;

      await queryRunner.manager.update(
        MktOrderWorkspaceEntity,
        { id: typedContext.orderId },
        updateData,
      );

      this.logger.log(
        `Order ${typedContext.orderId} updated: ${typedContext.previousStatus} -> ${typedContext.targetStatus}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to update order status: ${typedContext.orderId}`,
        error,
      );

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Update failed'),
      };
    }
  }

  async compensate(
    context: SagaContext,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const typedContext = context as ConfirmOrderSagaContext;

    if (!typedContext.orderId || !typedContext.rollbackOrder) {
      this.logger.warn('No rollback data for UpdateStatusStep');

      return;
    }

    try {
      this.logger.warn(
        `Rolling back order ${typedContext.orderId} to status: ${typedContext.rollbackOrder.status}`,
      );

      const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

      await queryRunner.manager.update(
        MktOrderWorkspaceEntity,
        { id: typedContext.orderId },
        {
          status: typedContext.rollbackOrder.status,
          accountingConfirmed: typedContext.rollbackOrder.accountingConfirmed,
          note: typedContext.rollbackOrder.note,
          updatedAt: nowISO,
          metadata: safeJsonStringify({
            rolledBackAt: nowISO,
            rolledBackFrom: typedContext.targetStatus,
          }) as unknown as JSON,
        },
      );

      this.logger.log(
        `Order ${typedContext.orderId} rolled back to: ${typedContext.rollbackOrder.status}`,
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
