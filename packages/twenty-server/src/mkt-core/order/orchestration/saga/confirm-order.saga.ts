import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import {
  ConfirmOrderSagaContext,
  createConfirmOrderContext,
} from 'src/mkt-core/order/orchestration/context';
import {
  ValidateOrderStep,
  ValidateTransitionStep,
  UpdateStatusStep,
  CreateLicensesOnConfirmStep,
  CompleteOrderAfterLicenseStep,
} from 'src/mkt-core/order/orchestration/steps/confirm-order';
import { OrderOverdueSchedulerService } from 'src/mkt-core/order/services/core/order-overdue-scheduler.service';
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
 * 3. UpdateStatusStep - Update order status and payment fields
 * 4. CreateLicensesOnConfirmStep - Create licenses when accounting confirms
 * 5. CompleteOrderAfterLicenseStep - Auto-complete order after licenses created
 *
 * ACCOUNTING_CONFIRMED Flow:
 * 1. Validate order exists
 * 2. Validate status transition is allowed
 * 3. Update: status = CONFIRMED, paymentStatus = PAID, paidAmount = totalAmount
 * 4. Create licenses on MKT Server
 * 5. Auto-update: status = COMPLETED (if licenses created)
 * 6. Emit success events
 *
 * Supports actions:
 * - ACCOUNTING_CONFIRMED: Confirm payment, create licenses, auto-complete
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
    twentyORMGlobalManager: TwentyORMGlobalManager,
    eventEmitter: EventEmitter2,
    private readonly orderOverdueSchedulerService: OrderOverdueSchedulerService,
    // Inject steps directly
    private readonly validateOrderStep: ValidateOrderStep,
    private readonly validateTransitionStep: ValidateTransitionStep,
    private readonly updateStatusStep: UpdateStatusStep,
    private readonly createLicensesOnConfirmStep: CreateLicensesOnConfirmStep,
    private readonly completeOrderAfterLicenseStep: CompleteOrderAfterLicenseStep,
  ) {
    super(twentyORMGlobalManager, eventEmitter);
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
      this.updateStatusStep,
      this.createLicensesOnConfirmStep,
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

    // Cancel overdue check nếu order chuyển từ PENDING_PAYMENT sang status khác
    this.cancelOverdueCheckIfNeeded(typedContext);

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

  /**
   * Cancel overdue check nếu order chuyển từ PENDING_PAYMENT sang status khác
   *
   * Khi order được thanh toán (ACCOUNTING_CONFIRMED) hoặc huỷ (CANCEL),
   * cần cancel delayed job để tránh mark OVERDUE sai.
   */
  private cancelOverdueCheckIfNeeded(context: ConfirmOrderSagaContext): void {
    // Chỉ cancel nếu previous status là PENDING_PAYMENT
    if (context.previousStatus !== ORDER_STATUS.PENDING_PAYMENT) {
      return;
    }

    if (!context.orderId) {
      return;
    }

    // Fire and forget - không block saga completion
    this.orderOverdueSchedulerService
      .cancelOverdueCheck(context.orderId)
      .catch((error) => {
        // Log nhưng không fail - job sẽ tự skip khi execute do idempotent check
        this.logger.warn(
          `Failed to cancel overdue check for order ${context.orderId}: ${error.message}`,
        );
      });
  }
}
