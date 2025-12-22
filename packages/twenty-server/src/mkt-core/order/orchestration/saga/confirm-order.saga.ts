import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/common/common.type';
import {
  ConfirmOrderInput,
  ConfirmOrderResponse,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  ConfirmOrderSagaContext,
  createConfirmOrderContext,
} from 'src/mkt-core/order/orchestration/context';

import { SagaContext } from './order-saga.interface';

import { BaseSaga } from './base/base-saga';

/**
 * ConfirmOrderSaga - Saga for confirming/updating order status
 *
 * Extends BaseSaga for unified step execution pattern.
 *
 * Registered Steps:
 * 1. ValidateOrderStep - Validate order exists and load state
 * 2. ValidateTransitionStep - Validate status transition is allowed
 * 3. UpdateStatusStep - Update order status in database
 *
 * Handles order status transitions with validation:
 * - Validates order exists
 * - Validates status transition is allowed per state machine
 * - Updates order status
 * - Emits appropriate events
 *
 * Supports actions:
 * - COMPLETED: Complete the order
 * - CONFIRMED: Confirm payment received
 * - SINVOICE: Sync S-Invoice
 * - And other status transitions
 */
@Injectable()
export class ConfirmOrderSaga extends BaseSaga<
  ConfirmOrderInput,
  ConfirmOrderResponse
> {
  protected readonly logger = new Logger(ConfirmOrderSaga.name);
  protected readonly sagaName = 'ConfirmOrderSaga';

  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    eventEmitter: EventEmitter2,
  ) {
    super(twentyORMGlobalManager, eventEmitter);
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
