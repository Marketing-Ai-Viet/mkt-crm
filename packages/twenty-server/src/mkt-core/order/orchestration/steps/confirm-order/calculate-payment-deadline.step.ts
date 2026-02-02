import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  PaymentDeadlineService,
  PaymentDeadlineResult,
} from 'src/mkt-core/order/services/core/payment-deadline.service';
import {
  ConfirmOrderInput,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';

/**
 * CalculatePaymentDeadlineStep - Calculate payment deadline for order confirmation
 *
 * This step is triggered when:
 * - Action is CONFIRM_ORDER (new payment flow)
 *
 * Deadline calculation priority:
 * 1. Manual override (highest)
 * 2. Reseller tier
 * 3. Customer type
 * 4. Product config
 * 5. Global setting (lowest)
 *
 * The calculated deadline is stored in context for subsequent steps:
 * - CreateLicensesOnConfirmStep (uses deadline for license creation)
 * - SchedulePaymentRemindersStep (schedules reminders based on deadline)
 * - UpdateStatusStep (sets paymentDeadline on order)
 */
@Injectable()
export class CalculatePaymentDeadlineStep extends SagaStep<
  ConfirmOrderInput,
  PaymentDeadlineResult
> {
  readonly name = 'calculate_payment_deadline';
  readonly description = 'Calculate payment deadline based on priority rules';

  private readonly logger = new Logger(CalculatePaymentDeadlineStep.name);

  constructor(private readonly paymentDeadlineService: PaymentDeadlineService) {
    super();
  }

  /**
   * Skip this step if action is not CONFIRM_ORDER
   * Other actions (PAYMENT_CONFIRMED, COMPLETE, etc.) don't need deadline calculation
   */
  shouldSkip(context: SagaContext, input: ConfirmOrderInput): boolean {
    // Chỉ tính deadline khi action là CONFIRM_ORDER (luồng mới)
    if (input.action !== ORDER_ACTION.CONFIRM_ORDER) {
      this.logger.debug(
        `Skipping: Action "${input.action}" does not require payment deadline calculation`,
      );

      return true;
    }

    return false;
  }

  async execute(
    context: SagaContext,
    _input: ConfirmOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<PaymentDeadlineResult>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      const order = typedContext.currentOrder;

      if (!order) {
        return {
          success: false,
          error: new Error('Order not found in context'),
        };
      }

      this.logger.debug(`Calculating payment deadline for order ${order.id}`);

      // Lấy thông tin để tính deadline
      // Note: customerType và resellerTier cần lấy từ customer relation
      // Hiện tại sử dụng global setting làm default
      // TODO: Nếu cần, mở rộng context để load customer data với customerType/resellerTier
      const deadlineResult = this.paymentDeadlineService.calculateDeadline({
        // customerType: typedContext.customerType, // Future: load from customer
        // resellerTier: typedContext.resellerTier, // Future: load from customer
        // productDeadlineHours: typedContext.maxProductDeadlineHours, // Future: from order items
        // manualDeadlineHours: input.manualDeadlineHours, // Future: thêm vào input
      });

      // Lưu kết quả vào context để các steps sau sử dụng
      typedContext.paymentDeadline = deadlineResult.deadline;
      typedContext.paymentDeadlineSource = deadlineResult.source;
      typedContext.paymentDeadlineHours = deadlineResult.hours;

      this.logger.log(`Payment deadline calculated for order ${order.id}`, {
        deadline: deadlineResult.deadline,
        source: deadlineResult.source,
        hours: deadlineResult.hours,
      });

      return {
        success: true,
        data: deadlineResult,
      };
    } catch (error) {
      this.logger.error('Failed to calculate payment deadline', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Compensate - không cần rollback cho việc tính deadline
   * Deadline chỉ là calculation, không có side effect
   */
  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const typedContext = context as ConfirmOrderSagaContext;

    // Clear context fields
    typedContext.paymentDeadline = undefined;
    typedContext.paymentDeadlineSource = undefined;
    typedContext.paymentDeadlineHours = undefined;

    this.logger.debug(
      'Payment deadline calculation compensated (context cleared)',
    );
  }
}
