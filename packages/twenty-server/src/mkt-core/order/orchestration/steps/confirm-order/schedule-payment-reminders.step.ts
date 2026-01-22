import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import {
  DelayedJobService,
  MKT_DELAYED_JOB_QUEUES,
} from 'src/mkt-core/infrastructure/delayed-job';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import {
  PAYMENT_DEADLINE_CONFIG,
  PAYMENT_DEADLINE_JOB,
  PAYMENT_REMINDER_TYPE,
  REMINDER_TYPE_THRESHOLDS,
  GET_DEADLINE_CHECK_JOB_ID,
  GET_REMINDER_JOB_ID,
  PaymentReminderTypeValue,
} from 'src/mkt-core/order/constants/payment-deadline.constants';
import { ConfirmOrderSagaContext } from 'src/mkt-core/order/orchestration/context';
import {
  ConfirmOrderInput,
  SagaContext,
  SagaStep,
  SagaStepResult,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * Payload for payment reminder job
 */
type PaymentReminderPayload = {
  orderId: string;
  workspaceId: string;
  orderCode?: string;
  reminderType: PaymentReminderTypeValue;
  hoursBeforeDeadline: number;
};

/**
 * Payload for payment deadline check job
 */
type PaymentDeadlineCheckPayload = {
  orderId: string;
  workspaceId: string;
  orderCode?: string;
};

/**
 * Result of schedule operation
 */
type ScheduleResult = {
  scheduledReminderJobIds: string[];
  deadlineCheckJobId: string;
};

/**
 * SchedulePaymentRemindersStep - Schedule payment reminders and deadline check
 *
 * This step is triggered when:
 * - Action is CONFIRM_ORDER (new payment flow)
 * - Payment deadline has been calculated (by CalculatePaymentDeadlineStep)
 *
 * Schedules:
 * 1. Payment reminders at 6h, 2h, 30min before deadline
 * 2. Deadline check job at the exact deadline time
 *
 * Uses BullMQ delayed jobs via DelayedJobService
 */
@Injectable()
export class SchedulePaymentRemindersStep extends SagaStep<
  ConfirmOrderInput,
  ScheduleResult
> {
  readonly name = 'schedule_payment_reminders';
  readonly description = 'Schedule payment reminders and deadline check jobs';

  private readonly logger = new Logger(SchedulePaymentRemindersStep.name);

  constructor(private readonly delayedJobService: DelayedJobService) {
    super();
  }

  /**
   * Skip this step if action is not CONFIRM_ORDER
   */
  shouldSkip(context: SagaContext, input: ConfirmOrderInput): boolean {
    const typedContext = context as ConfirmOrderSagaContext;

    // Chỉ schedule khi action là CONFIRM_ORDER (luồng mới)
    if (input.action !== ORDER_ACTION.CONFIRM_ORDER) {
      this.logger.debug(
        `Skipping: Action "${input.action}" does not require payment reminders`,
      );

      return true;
    }

    // Skip nếu không có payment deadline
    if (!typedContext.paymentDeadline) {
      this.logger.debug('Skipping: No payment deadline in context');

      return true;
    }

    return false;
  }

  async execute(
    context: SagaContext,
    _input: ConfirmOrderInput,
    _queryRunner: QueryRunner,
  ): Promise<SagaStepResult<ScheduleResult>> {
    const typedContext = context as ConfirmOrderSagaContext;

    try {
      const order = typedContext.currentOrder;
      const paymentDeadline = typedContext.paymentDeadline;

      if (!order) {
        return {
          success: false,
          error: new Error('Order not found in context'),
        };
      }

      if (!paymentDeadline) {
        return {
          success: false,
          error: new Error('Payment deadline not found in context'),
        };
      }

      const now = DateTimeUtils.now();
      const deadlineTime = DateTimeUtils.fromDate(paymentDeadline);
      const scheduledReminderJobIds: string[] = [];

      this.logger.debug(`Scheduling payment reminders for order ${order.id}`, {
        deadline: paymentDeadline,
        reminderSchedule: PAYMENT_DEADLINE_CONFIG.REMINDER_SCHEDULE,
      });

      // Schedule reminders
      for (const hoursBeforeDeadline of PAYMENT_DEADLINE_CONFIG.REMINDER_SCHEDULE) {
        const reminderTime = DateTimeUtils.subtract(deadlineTime, {
          hours: hoursBeforeDeadline,
        });

        // Chỉ schedule nếu reminder time còn trong tương lai
        // Compare milliseconds: reminderTime > now
        if (
          DateTimeUtils.toMillis(reminderTime) > DateTimeUtils.toMillis(now)
        ) {
          const delayMs =
            DateTimeUtils.toMillis(reminderTime) - DateTimeUtils.toMillis(now);
          const jobId = GET_REMINDER_JOB_ID(order.id, hoursBeforeDeadline);

          const payload: PaymentReminderPayload = {
            orderId: order.id,
            workspaceId: typedContext.workspaceId,
            orderCode: order.orderCode,
            reminderType: this.getReminderType(hoursBeforeDeadline),
            hoursBeforeDeadline,
          };

          const scheduled = await this.delayedJobService.scheduleJob(
            MKT_DELAYED_JOB_QUEUES.PAYMENT_REMINDER,
            PAYMENT_DEADLINE_JOB.REMINDER,
            payload,
            {
              jobId,
              delayMs,
              retryAttempts: 2,
            },
          );

          if (scheduled) {
            scheduledReminderJobIds.push(jobId);
            this.logger.debug(`Scheduled reminder ${jobId}`, {
              delayMs,
              hoursBeforeDeadline,
            });
          }
        } else {
          this.logger.debug(
            `Skipping reminder ${hoursBeforeDeadline}h before deadline - already past`,
          );
        }
      }

      // Schedule deadline check job
      const deadlineCheckDelay =
        DateTimeUtils.toMillis(deadlineTime) - DateTimeUtils.toMillis(now);
      const deadlineCheckJobId = GET_DEADLINE_CHECK_JOB_ID(order.id);

      // Chỉ schedule nếu deadline còn trong tương lai
      if (deadlineCheckDelay > 0) {
        const deadlinePayload: PaymentDeadlineCheckPayload = {
          orderId: order.id,
          workspaceId: typedContext.workspaceId,
          orderCode: order.orderCode,
        };

        await this.delayedJobService.scheduleJob(
          MKT_DELAYED_JOB_QUEUES.PAYMENT_DEADLINE,
          PAYMENT_DEADLINE_JOB.DEADLINE_CHECK,
          deadlinePayload,
          {
            jobId: deadlineCheckJobId,
            delayMs: deadlineCheckDelay,
            retryAttempts: 3,
          },
        );

        this.logger.debug(`Scheduled deadline check ${deadlineCheckJobId}`, {
          delayMs: deadlineCheckDelay,
        });
      }

      // Lưu vào context để compensate có thể cancel
      typedContext.scheduledReminderJobIds = scheduledReminderJobIds;

      this.logger.log(
        `Scheduled ${scheduledReminderJobIds.length} reminders and deadline check for order ${order.id}`,
      );

      return {
        success: true,
        data: {
          scheduledReminderJobIds,
          deadlineCheckJobId,
        },
      };
    } catch (error) {
      this.logger.error('Failed to schedule payment reminders', error);

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Compensate - cancel scheduled jobs
   */
  async compensate(
    context: SagaContext,
    _queryRunner: QueryRunner,
  ): Promise<void> {
    const typedContext = context as ConfirmOrderSagaContext;
    const order = typedContext.currentOrder;

    if (!order) {
      return;
    }

    // Cancel reminder jobs
    const reminderJobIds = typedContext.scheduledReminderJobIds ?? [];

    for (const jobId of reminderJobIds) {
      try {
        await this.delayedJobService.cancelJob(
          MKT_DELAYED_JOB_QUEUES.PAYMENT_REMINDER,
          jobId,
        );
        this.logger.debug(`Cancelled reminder job ${jobId}`);
      } catch (error) {
        this.logger.warn(`Failed to cancel reminder job ${jobId}`, error);
      }
    }

    // Cancel deadline check job
    const deadlineCheckJobId = GET_DEADLINE_CHECK_JOB_ID(order.id);

    try {
      await this.delayedJobService.cancelJob(
        MKT_DELAYED_JOB_QUEUES.PAYMENT_DEADLINE,
        deadlineCheckJobId,
      );
      this.logger.debug(`Cancelled deadline check job ${deadlineCheckJobId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to cancel deadline check job ${deadlineCheckJobId}`,
        error,
      );
    }

    // Clear context
    typedContext.scheduledReminderJobIds = undefined;

    this.logger.log('Payment reminders compensated (jobs cancelled)');
  }

  /**
   * Get reminder type based on hours before deadline
   */
  private getReminderType(
    hoursBeforeDeadline: number,
  ): PaymentReminderTypeValue {
    if (hoursBeforeDeadline >= REMINDER_TYPE_THRESHOLDS.FIRST) {
      return PAYMENT_REMINDER_TYPE.FIRST_REMINDER;
    }

    if (hoursBeforeDeadline >= REMINDER_TYPE_THRESHOLDS.SECOND) {
      return PAYMENT_REMINDER_TYPE.SECOND_REMINDER;
    }

    return PAYMENT_REMINDER_TYPE.URGENT_REMINDER;
  }
}
