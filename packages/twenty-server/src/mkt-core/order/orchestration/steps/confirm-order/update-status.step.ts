import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import { ConfirmOrderInput } from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/orchestration/saga';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';

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

  constructor(private readonly orderRepository: MktOrderRepository) {
    super();
  }

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

      const updateData: Record<string, unknown> = {
        status: typedContext.targetStatus,
        updatedAt: nowISO,
      };

      // Handle accounting confirmation
      if (input.accountingConfirmed !== undefined) {
        updateData.accountingConfirmed = input.accountingConfirmed;

        // When ACCOUNTING_CONFIRMED, update payment fields
        // Accounting confirms = payment is complete
        if (input.accountingConfirmed === true) {
          const totalAmount = typedContext.currentOrder?.totalAmount ?? 0;

          updateData.paymentStatus = PAYMENT_STATUS.PAID;
          updateData.paidAmount = totalAmount;
          updateData.remainingAmount = 0;

          this.logger.log(
            `Payment confirmed for order ${typedContext.orderId}: ` +
              `paymentStatus=PAID, paidAmount=${totalAmount}`,
          );
        }
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
      });

      // Use repository - queryRunner.manager doesn't have workspace entity metadata
      await this.orderRepository.update(
        context.workspaceId,
        typedContext.orderId,
        updateData,
        queryRunner,
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

      // Use repository - queryRunner.manager doesn't have workspace entity metadata
      await this.orderRepository.update(
        context.workspaceId,
        typedContext.orderId,
        {
          status: typedContext.rollbackOrder.status,
          accountingConfirmed: typedContext.rollbackOrder.accountingConfirmed,
          note: typedContext.rollbackOrder.note,
          // Restore payment fields
          paymentStatus: typedContext.rollbackOrder.paymentStatus,
          paidAmount: typedContext.rollbackOrder.paidAmount,
          remainingAmount: typedContext.rollbackOrder.remainingAmount,
          updatedAt: nowISO,
          metadata: safeJsonStringify({
            rolledBackAt: nowISO,
            rolledBackFrom: typedContext.targetStatus,
          }) as unknown as JSON,
        },
        queryRunner,
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
