import { Injectable, Logger } from '@nestjs/common';

import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import {
  MKT_EVENT_TYPE,
  MKT_ORDER_EVENT_TYPES,
  PAYMENT_HISTORY_TYPE,
} from 'src/mkt-core/common/common.type';
import { ORDER_ACTION } from 'src/mkt-core/order/constants/order-status.constants';

/**
 * Order event payload structure
 */
export type OrderEventPayload = {
  eventType: MKT_ORDER_EVENT_TYPES;
  orderId: string;
  workspaceId: string;
  orderData: {
    id: string;
    note?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

/**
 * Payment event payload structure
 */
export type PaymentEventPayload = {
  eventType: PAYMENT_HISTORY_TYPE;
  orderId: string;
  workspaceId: string;
  orderData: {
    id: string;
    note?: string;
    [key: string]: unknown;
  };
  timestamp: string;
};

/**
 * Mapping from ORDER_ACTION to MKT_ORDER_EVENT_TYPES
 */
const ACTION_TO_EVENT_TYPE: Partial<
  Record<ORDER_ACTION, MKT_ORDER_EVENT_TYPES>
> = {
  [ORDER_ACTION.REFUND]: MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
  [ORDER_ACTION.REFUND_PARTIAL]: MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
  [ORDER_ACTION.LICENSE]: MKT_ORDER_EVENT_TYPES.FROM_LICENSE,
  [ORDER_ACTION.LICENSE_RENEWING]: MKT_ORDER_EVENT_TYPES.FROM_LICENSE,
};

/**
 * Mapping from ORDER_ACTION to PAYMENT_HISTORY_TYPE
 */
const ACTION_TO_PAYMENT_TYPE: Partial<
  Record<ORDER_ACTION, PAYMENT_HISTORY_TYPE>
> = {
  [ORDER_ACTION.REFUND]: PAYMENT_HISTORY_TYPE.REFUND,
  [ORDER_ACTION.REFUND_PARTIAL]: PAYMENT_HISTORY_TYPE.REFUND,
  [ORDER_ACTION.CHANGE_VARIANT]: PAYMENT_HISTORY_TYPE.CHANGE_VARIANT,
  [ORDER_ACTION.LICENSE_RENEWING]: PAYMENT_HISTORY_TYPE.RENEW,
};

/**
 * OrderEventService - Centralized service for emitting order-related events
 *
 * Responsibilities:
 * - Emit order lifecycle events (created, updated, refunded, etc.)
 * - Emit payment-related events
 * - Map actions to appropriate event types
 * - Provide consistent event payloads
 *
 * Replaces event emission logic from:
 * - MktOrderCreateOnePostQueryHook
 * - MktOrderUpdateOnePostQueryHook
 * - MktCommonOrderService (partial)
 */
@Injectable()
export class OrderEventService {
  private readonly logger = new Logger(OrderEventService.name);

  constructor(private readonly workspaceEventEmitter: WorkspaceEventEmitter) {}

  /**
   * Emit order created event
   */
  async emitOrderCreated(
    orderId: string,
    workspaceId: string,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    await this.emitOrderEvent(
      orderId,
      workspaceId,
      MKT_ORDER_EVENT_TYPES.ORDER_CREATED,
      additionalData,
    );
  }

  /**
   * Emit order updated event
   */
  async emitOrderUpdated(
    orderId: string,
    workspaceId: string,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    await this.emitOrderEvent(
      orderId,
      workspaceId,
      MKT_ORDER_EVENT_TYPES.ORDER_UPDATED,
      additionalData,
    );
  }

  /**
   * Emit order refunded event
   */
  async emitOrderRefunded(
    orderId: string,
    workspaceId: string,
    refundAmount?: number,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    await this.emitOrderEvent(
      orderId,
      workspaceId,
      MKT_ORDER_EVENT_TYPES.ORDER_REFUNDED,
      { refundAmount, ...additionalData },
    );
  }

  /**
   * Emit accounting confirmed event
   */
  async emitAccountingConfirmed(
    orderId: string,
    workspaceId: string,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    await this.emitOrderEvent(
      orderId,
      workspaceId,
      MKT_ORDER_EVENT_TYPES.ACCOUNTING_CONFIRMED,
      additionalData,
    );
  }

  /**
   * Emit order event based on action
   * Determines the appropriate event type from the action
   */
  async emitEventForAction(
    orderId: string,
    workspaceId: string,
    action: ORDER_ACTION,
    accountingConfirmed?: boolean,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    let eventType: MKT_ORDER_EVENT_TYPES = MKT_ORDER_EVENT_TYPES.ORDER_UPDATED;

    // Check accounting confirmed first
    if (accountingConfirmed) {
      eventType = MKT_ORDER_EVENT_TYPES.ACCOUNTING_CONFIRMED;
    } else {
      const mappedEventType = ACTION_TO_EVENT_TYPE[action];

      if (mappedEventType) {
        eventType = mappedEventType;
      }
    }

    await this.emitOrderEvent(orderId, workspaceId, eventType, additionalData);
  }

  /**
   * Emit generic order event
   */
  async emitOrderEvent(
    orderId: string,
    workspaceId: string,
    eventType: MKT_ORDER_EVENT_TYPES,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    if (!orderId || !workspaceId) {
      this.logger.warn(
        'Cannot emit order event: missing orderId or workspaceId',
      );

      return;
    }

    try {
      const eventPayload: OrderEventPayload = {
        eventType,
        orderId,
        workspaceId,
        orderData: {
          id: orderId,
          ...additionalData,
        },
        timestamp: new Date().toISOString(),
      };

      this.workspaceEventEmitter.emitCustomBatchEvent(
        MKT_EVENT_TYPE.MKT_ORDER,
        [eventPayload],
        workspaceId,
      );

      this.logger.log(`Emitted ${eventType} event for order: ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit ${eventType} event for order: ${orderId}`,
        error,
      );
      // Don't throw to prevent disrupting main flow
    }
  }

  /**
   * Emit payment event
   */
  async emitPaymentEvent(
    orderId: string,
    workspaceId: string,
    paymentType: PAYMENT_HISTORY_TYPE,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    if (!orderId || !workspaceId) {
      this.logger.warn(
        'Cannot emit payment event: missing orderId or workspaceId',
      );

      return;
    }

    try {
      const eventPayload: PaymentEventPayload = {
        eventType: paymentType,
        orderId,
        workspaceId,
        orderData: {
          id: orderId,
          ...additionalData,
        },
        timestamp: new Date().toISOString(),
      };

      this.workspaceEventEmitter.emitCustomBatchEvent(
        MKT_EVENT_TYPE.MKT_PAYMENT,
        [eventPayload],
        workspaceId,
      );

      this.logger.log(
        `Emitted ${paymentType} payment event for order: ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit ${paymentType} payment event for order: ${orderId}`,
        error,
      );
      // Don't throw to prevent disrupting main flow
    }
  }

  /**
   * Emit payment event based on action
   */
  async emitPaymentEventForAction(
    orderId: string,
    workspaceId: string,
    action: ORDER_ACTION,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    const paymentType = ACTION_TO_PAYMENT_TYPE[action];

    if (!paymentType) {
      // Default to PAYMENT for actions that don't have a specific mapping
      await this.emitPaymentEvent(
        orderId,
        workspaceId,
        PAYMENT_HISTORY_TYPE.PAYMENT,
        additionalData,
      );

      return;
    }

    await this.emitPaymentEvent(
      orderId,
      workspaceId,
      paymentType,
      additionalData,
    );
  }

  /**
   * Emit both order and payment events for order creation
   */
  async emitOrderCreatedWithPayment(
    orderId: string,
    workspaceId: string,
    isTrial: boolean,
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    // Always emit order created event
    await this.emitOrderCreated(orderId, workspaceId, additionalData);

    // Emit payment event if not trial
    if (!isTrial) {
      await this.emitPaymentEvent(
        orderId,
        workspaceId,
        PAYMENT_HISTORY_TYPE.PAYMENT,
        additionalData,
      );
    }
  }

  /**
   * Emit events for order update based on action
   */
  async emitOrderUpdateEvents(
    orderId: string,
    workspaceId: string,
    action: ORDER_ACTION,
    options?: {
      accountingConfirmed?: boolean;
      emitPaymentEvent?: boolean;
      additionalData?: Record<string, unknown>;
    },
  ): Promise<void> {
    const { accountingConfirmed, emitPaymentEvent, additionalData } =
      options ?? {};

    // Emit order event
    await this.emitEventForAction(
      orderId,
      workspaceId,
      action,
      accountingConfirmed,
      additionalData,
    );

    // Emit payment event if requested
    if (emitPaymentEvent) {
      await this.emitPaymentEventForAction(
        orderId,
        workspaceId,
        action,
        additionalData,
      );
    }
  }
}
