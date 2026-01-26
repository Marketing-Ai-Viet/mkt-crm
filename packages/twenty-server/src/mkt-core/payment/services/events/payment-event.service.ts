import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  OrderConfirmedEvent,
  PAYMENT_EVENTS,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PaymentOverpaidEvent,
  PaymentPartialEvent,
  PaymentReceivedEvent,
} from 'src/mkt-core/payment/events';

/**
 * PaymentEventService - Centralized payment event emission
 *
 * Provides type-safe event emission for payment-related events.
 * Uses NestJS EventEmitter2 for decoupled event handling.
 *
 * @example
 * ```typescript
 * // Emit payment completed event
 * this.paymentEventService.emitPaymentCompleted({
 *   paymentId: '123',
 *   orderId: '456',
 *   orderCode: 'ORD20260122001',
 *   amount: 100000,
 *   transactionId: '789',
 *   gateway: 'MBBank',
 *   transactionDate: '2026-01-22 10:30:00',
 *   workspaceId: 'workspace-id',
 *   totalPaidAmount: 100000,
 *   customerId: 'customer-id',
 * });
 * ```
 */
@Injectable()
export class PaymentEventService {
  private readonly logger = new Logger(PaymentEventService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit payment received event
   */
  emitPaymentReceived(event: PaymentReceivedEvent): void {
    this.logger.log({
      message: `Emitting ${PAYMENT_EVENTS.PAYMENT_RECEIVED}`,
      orderCode: event.orderCode,
      transactionId: event.transactionId,
    });
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_RECEIVED, event);
  }

  /**
   * Emit payment completed (full payment) event
   */
  emitPaymentCompleted(event: PaymentCompletedEvent): void {
    this.logger.log({
      message: `Emitting ${PAYMENT_EVENTS.PAYMENT_COMPLETED}`,
      orderCode: event.orderCode,
      transactionId: event.transactionId,
      totalPaidAmount: event.totalPaidAmount,
    });
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, event);
  }

  /**
   * Emit partial payment event
   */
  emitPaymentPartial(event: PaymentPartialEvent): void {
    this.logger.log({
      message: `Emitting ${PAYMENT_EVENTS.PAYMENT_PARTIAL}`,
      orderCode: event.orderCode,
      transactionId: event.transactionId,
      percentagePaid: event.percentagePaid,
      remainingAmount: event.remainingAmount,
    });
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_PARTIAL, event);
  }

  /**
   * Emit overpayment event
   */
  emitPaymentOverpaid(event: PaymentOverpaidEvent): void {
    this.logger.log({
      message: `Emitting ${PAYMENT_EVENTS.PAYMENT_OVERPAID}`,
      orderCode: event.orderCode,
      transactionId: event.transactionId,
      overpaidAmount: event.overpaidAmount,
    });
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_OVERPAID, event);
  }

  /**
   * Emit payment failed event
   */
  emitPaymentFailed(event: PaymentFailedEvent): void {
    this.logger.error({
      message: `Emitting ${PAYMENT_EVENTS.PAYMENT_FAILED}`,
      orderCode: event.orderCode,
      transactionId: event.transactionId,
      errorMessage: event.errorMessage,
    });
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_FAILED, event);
  }

  /**
   * Emit order confirmed event
   */
  emitOrderConfirmed(event: OrderConfirmedEvent): void {
    this.logger.log({
      message: `Emitting ${PAYMENT_EVENTS.ORDER_CONFIRMED}`,
      orderCode: event.orderCode,
      orderId: event.orderId,
      totalAmount: event.totalAmount,
    });
    this.eventEmitter.emit(PAYMENT_EVENTS.ORDER_CONFIRMED, event);
  }
}
