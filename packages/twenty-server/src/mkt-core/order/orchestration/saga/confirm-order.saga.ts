import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { TransactionScopeService } from 'src/mkt-core/common/transaction';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';
import {
  ConfirmOrderSagaContext,
  createConfirmOrderContext,
} from 'src/mkt-core/order/orchestration/context';
import {
  ValidateOrderStep,
  ValidateTransitionStep,
  UpdateStatusStep,
  EnqueueLicensesOnConfirmStep,
  CreateContractOnConfirmStep,
  CompleteOrderAfterLicenseStep,
  // New Payment Flow Steps
  CalculatePaymentDeadlineStep,
  SchedulePaymentRemindersStep,
} from 'src/mkt-core/order/orchestration/steps/confirm-order';
import {
  MKT_ORDER_EVENT_TYPES,
  ConfirmOrderInput,
  ConfirmOrderResponse,
  SagaContext,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { DASHBOARD_INVALIDATION_EVENTS } from 'src/mkt-core/mkt-dashboard/listeners/dashboard-cache-invalidation.listener';

import { BaseSaga } from './base/base-saga';

/**
 * ConfirmOrderSaga - Saga for confirming/updating order status
 *
 * Extends BaseSaga for unified step execution pattern.
 *
 * Registered Steps:
 * 1. ValidateOrderStep - Validate order exists and load state
 * 2. ValidateTransitionStep - Validate status transition is allowed
 * 3. CalculatePaymentDeadlineStep - Calculate deadline (CONFIRM_ORDER only)
 * 4. UpdateStatusStep - Update order status and payment fields
 * 5. EnqueueLicensesOnConfirmStep - Enqueue license jobs (async via BullMQ)
 * 6. CreateContractOnConfirmStep - Create contract when order is confirmed
 * 7. SchedulePaymentRemindersStep - Schedule reminders (CONFIRM_ORDER only)
 * 8. CompleteOrderAfterLicenseStep - Always skips (async completion via MktLicenseStatusService)
 *
 * Supports actions:
 * - CONFIRM_ORDER: Create licenses with PENDING_PAYMENT, schedule deadline
 * - PAYMENT_CONFIRMED: Activate licenses, complete order
 * - COMPLETE: Complete the order
 * - CANCEL: Cancel the order
 * - BLOCK: Block the order
 * - And other status transitions
 */
@Injectable()
export class ConfirmOrderSaga
  extends BaseSaga<ConfirmOrderInput, ConfirmOrderResponse>
  implements OnModuleInit
{
  protected readonly logger = new Logger(ConfirmOrderSaga.name);
  protected readonly sagaName = 'ConfirmOrderSaga';

  constructor(
    transactionScopeService: TransactionScopeService,
    eventEmitter: EventEmitter2,
    // Inject steps directly
    private readonly validateOrderStep: ValidateOrderStep,
    private readonly validateTransitionStep: ValidateTransitionStep,
    private readonly calculatePaymentDeadlineStep: CalculatePaymentDeadlineStep,
    private readonly updateStatusStep: UpdateStatusStep,
    private readonly enqueueLicensesOnConfirmStep: EnqueueLicensesOnConfirmStep,
    private readonly createContractOnConfirmStep: CreateContractOnConfirmStep,
    private readonly schedulePaymentRemindersStep: SchedulePaymentRemindersStep,
    private readonly completeOrderAfterLicenseStep: CompleteOrderAfterLicenseStep,
  ) {
    super(transactionScopeService, eventEmitter);
    // Register steps immediately in constructor
    // (onModuleInit may not be called for lazy-loaded providers)
    this.initializeSteps();
  }

  /**
   * Initialize and register steps
   */
  private initializeSteps(): void {
    this.registerSteps([
      this.validateOrderStep,
      this.validateTransitionStep,
      this.calculatePaymentDeadlineStep,
      this.updateStatusStep,
      this.enqueueLicensesOnConfirmStep,
      this.createContractOnConfirmStep,
      this.schedulePaymentRemindersStep,
      this.completeOrderAfterLicenseStep,
    ]);
  }

  /**
   * OnModuleInit - fallback if constructor initialization didn't run
   */
  onModuleInit(): void {
    if (this.steps.length === 0) {
      this.initializeSteps();
    }
  }

  /**
   * Create typed context for ConfirmOrderSaga
   */
  protected createContext(
    workspaceId: string,
    workspaceMemberId?: string,
  ): ConfirmOrderSagaContext {
    return createConfirmOrderContext(workspaceId, workspaceMemberId);
  }

  /**
   * Build success response from context
   */
  protected buildSuccessResponse(context: SagaContext): ConfirmOrderResponse {
    const typedContext = context as ConfirmOrderSagaContext;

    return {
      success: true,
      orderId: typedContext.orderId,
      newStatus: typedContext.targetStatus,
    };
  }

  /**
   * Emit success event after saga completion
   *
   * Event types based on action:
   * - CONFIRM_ORDER → ORDER_CONFIRMED
   * - PAYMENT_CONFIRMED → PAYMENT_CONFIRMED
   * - Others → ORDER_UPDATED
   */
  protected emitSuccessEvent(
    context: SagaContext,
    input: ConfirmOrderInput,
  ): void {
    const typedContext = context as ConfirmOrderSagaContext;

    if (!typedContext.orderId) {
      return;
    }

    // Determine event type based on action
    const eventType = this.getEventTypeForAction(input.action);

    this.eventEmitter.emit(eventType, {
      name: eventType,
      workspaceId: typedContext.workspaceId,
      events: [
        {
          eventType,
          orderId: typedContext.orderId,
          workspaceId: typedContext.workspaceId,
          orderData: {
            id: typedContext.orderId,
            orderCode: typedContext.orderCode,
            previousStatus: typedContext.previousStatus,
            newStatus: typedContext.targetStatus,
            action: typedContext.action,
          },
          timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
        },
      ],
    });

    // Invalidate dashboard caches (order revenue affected)
    this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.ORDER_CHANGED, {
      workspaceId: typedContext.workspaceId,
      entityId: typedContext.orderId,
    });

    this.logger.log(`Emitted ${eventType} for order: ${typedContext.orderId}`);
  }

  /**
   * Map action to event type
   */
  private getEventTypeForAction(action: ORDER_ACTION): MKT_ORDER_EVENT_TYPES {
    switch (action) {
      case ORDER_ACTION.CONFIRM_ORDER:
        return MKT_ORDER_EVENT_TYPES.ORDER_CONFIRMED;
      case ORDER_ACTION.PAYMENT_CONFIRMED:
        return MKT_ORDER_EVENT_TYPES.PAYMENT_CONFIRMED;
      default:
        return MKT_ORDER_EVENT_TYPES.ORDER_UPDATED;
    }
  }
}
