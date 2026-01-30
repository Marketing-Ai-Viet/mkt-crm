import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { TransactionScopeService } from 'src/mkt-core/common/transaction';
import {
  ConfirmOrderSagaContext,
  createConfirmOrderContext,
} from 'src/mkt-core/order/orchestration/context';
import {
  ValidateOrderStep,
  ValidateTransitionStep,
  UpdateStatusStep,
  CreateLicensesOnConfirmStep,
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
 * 5. CreateLicensesOnConfirmStep - Create licenses when accounting confirms
 * 6. CreateContractOnConfirmStep - Create contract when accounting confirms
 * 7. SchedulePaymentRemindersStep - Schedule reminders (CONFIRM_ORDER only)
 * 8. CompleteOrderAfterLicenseStep - Auto-complete order after licenses created
 *
 * CONFIRM_ORDER Flow (New Payment Flow):
 * 1. Validate order exists
 * 2. Validate status transition (DRAFT → PROCESSING)
 * 3. Calculate payment deadline based on priority rules
 * 4. Update: status = PROCESSING, paymentDeadline, paymentStatus = PENDING
 * 5. Create licenses on MKT Server with PENDING_PAYMENT status
 * 6. Schedule payment reminders and deadline check jobs
 * 7. Emit success events
 *
 * ACCOUNTING_CONFIRMED Flow (Legacy):
 * 1. Validate order exists
 * 2. Validate status transition is allowed
 * 3. Update: status = CONFIRMED, paymentStatus = PAID, paidAmount = totalAmount
 * 4. Create licenses on MKT Server
 * 5. Create contract and link to order
 * 6. Auto-update: status = COMPLETED (if licenses created)
 * 7. Emit success events
 *
 * Supports actions:
 * - CONFIRM_ORDER: New flow - create licenses immediately, schedule deadline
 * - ACCOUNTING_CONFIRMED: Confirm payment, create licenses, create contract, auto-complete
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
    private readonly createLicensesOnConfirmStep: CreateLicensesOnConfirmStep,
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
   *
   * Step order:
   * 1. ValidateOrderStep - Load and validate order
   * 2. ValidateTransitionStep - Validate status transition
   * 3. CalculatePaymentDeadlineStep - Calculate deadline (CONFIRM_ORDER only)
   * 4. UpdateStatusStep - Update order status
   * 5. CreateLicensesOnConfirmStep - Create licenses
   * 6. CreateContractOnConfirmStep - Create contract (ACCOUNTING_CONFIRMED only)
   * 7. SchedulePaymentRemindersStep - Schedule reminders (CONFIRM_ORDER only)
   * 8. CompleteOrderAfterLicenseStep - Auto-complete (skipped for CONFIRM_ORDER)
   */
  private initializeSteps(): void {
    this.registerSteps([
      this.validateOrderStep,
      this.validateTransitionStep,
      this.calculatePaymentDeadlineStep,
      this.updateStatusStep,
      this.createLicensesOnConfirmStep,
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
   */
  protected emitSuccessEvent(
    context: SagaContext,
    input: ConfirmOrderInput,
  ): void {
    const typedContext = context as ConfirmOrderSagaContext;

    if (!typedContext.orderId) {
      return;
    }

    const eventType = input.accountingConfirmed
      ? MKT_ORDER_EVENT_TYPES.ACCOUNTING_CONFIRMED
      : MKT_ORDER_EVENT_TYPES.ORDER_UPDATED;

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
            accountingConfirmed: input.accountingConfirmed,
          },
          timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
        },
      ],
    });

    this.logger.log(`Emitted ${eventType} for order: ${typedContext.orderId}`);
  }
}
