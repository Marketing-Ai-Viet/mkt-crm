import { Injectable, Logger } from '@nestjs/common';

import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import {
  ConfirmOrderInput,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';

/**
 * UpdateStatusStep - Step 3: Update order status in database
 *
 * Responsibilities:
 * - Update order status to target status
 * - Update payment fields based on action (CONFIRM_ORDER or PAYMENT_CONFIRMED)
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

      // Handle payment fields based on action
      if (input.action === ORDER_ACTION.CONFIRM_ORDER) {
        // CONFIRM_ORDER: Set payment to PENDING, license created with PENDING_PAYMENT
        updateData.paymentStatus = PAYMENT_STATUS.PENDING;

        // Set payment deadline if calculated
        if (typedContext.paymentDeadline) {
          updateData.paymentDeadline = typedContext.paymentDeadline;
        }

        this.logger.log(
          `Order ${typedContext.orderId} confirmed: paymentStatus=PENDING`,
        );
      } else if (input.action === ORDER_ACTION.PAYMENT_CONFIRMED) {
        // PAYMENT_CONFIRMED: Payment complete, license activated
        const totalAmount = typedContext.currentOrder?.totalAmount ?? 0;

        updateData.paymentStatus = PAYMENT_STATUS.PAID;
        updateData.paidAmount = totalAmount;
        updateData.remainingAmount = 0;

        this.logger.log(
          `Payment confirmed for order ${typedContext.orderId}: ` +
            `paymentStatus=PAID, paidAmount=${totalAmount}`,
        );
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
      await this.orderRepository.update(typedContext.orderId, updateData);

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

  async compensate(context: SagaContext): Promise<void> {
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
      await this.orderRepository.update(typedContext.orderId, {
        status: typedContext.rollbackOrder.status,
        note: typedContext.rollbackOrder.note,
        // Restore payment fields
        paymentStatus: typedContext.rollbackOrder.paymentStatus,
        paidAmount: typedContext.rollbackOrder.paidAmount,
        remainingAmount: typedContext.rollbackOrder.remainingAmount,
        paymentDeadline: typedContext.rollbackOrder.paymentDeadline,
        updatedAt: nowISO,
        metadata: safeJsonStringify({
          rolledBackAt: nowISO,
          rolledBackFrom: typedContext.targetStatus,
        }) as unknown as JSON,
      });

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
