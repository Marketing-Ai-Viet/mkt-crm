import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  OrderConfirmedEvent,
  PAYMENT_EVENTS,
  PaymentCompletedEvent,
  PaymentConfirmedEvent,
  PaymentFailedEvent,
  PaymentOverpaidEvent,
  PaymentPartialEvent,
  PaymentRefundedEvent,
  PaymentRejectedEvent,
} from 'src/mkt-core/payment/events';

/**
 * PaymentNotificationListener - Handles payment events for notifications
 *
 * This listener receives payment events and triggers appropriate notifications.
 * Currently logs events; extend to integrate with email, push notifications, etc.
 *
 * @example
 * Events handled:
 * - payment.completed → Send confirmation email
 * - payment.partial → Send reminder for remaining amount
 * - payment.overpaid → Create refund ticket
 * - payment.failed → Alert support team
 * - order.confirmed → Trigger fulfillment process
 */
@Injectable()
export class PaymentNotificationListener {
  private readonly logger = new Logger(PaymentNotificationListener.name);

  /**
   * Handle payment completed event
   *
   * Actions:
   * - Send confirmation email to customer
   * - Send push notification
   * - Create CRM activity record
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_COMPLETED)
  async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    this.logger.log({
      message: 'Processing payment completed notification',
      orderCode: event.orderCode,
      amount: event.amount,
      totalPaidAmount: event.totalPaidAmount,
      customerId: event.customerId,
    });

    // TODO: Implement notification sending
    // - Send email notification via MktEmailModule
    // - Send push notification
    // - Create CRM activity record
  }

  /**
   * Handle partial payment event
   *
   * Actions:
   * - Send reminder email for remaining amount
   * - Create follow-up task for sales team
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_PARTIAL)
  async handlePaymentPartial(event: PaymentPartialEvent): Promise<void> {
    this.logger.log({
      message: 'Processing partial payment notification',
      orderCode: event.orderCode,
      amount: event.amount,
      remainingAmount: event.remainingAmount,
      percentagePaid: event.percentagePaid,
    });

    // TODO: Implement partial payment handling
    // - Send reminder email for remaining amount
    // - Create follow-up task for sales team
    // - Schedule reminder notification
  }

  /**
   * Handle overpayment event
   *
   * Actions:
   * - Create refund ticket
   * - Notify finance team
   * - Send overpayment confirmation to customer
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_OVERPAID)
  async handlePaymentOverpaid(event: PaymentOverpaidEvent): Promise<void> {
    this.logger.warn({
      message: 'Processing overpayment notification',
      orderCode: event.orderCode,
      expectedAmount: event.expectedAmount,
      totalPaidAmount: event.totalPaidAmount,
      overpaidAmount: event.overpaidAmount,
    });

    // TODO: Implement overpayment handling
    // - Create refund ticket in ticket system
    // - Notify finance team via email/Slack
    // - Send confirmation to customer about pending refund
  }

  /**
   * Handle payment failed event
   *
   * Actions:
   * - Log error for investigation
   * - Alert support team
   * - Notify customer if appropriate
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_FAILED)
  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    this.logger.error({
      message: 'Processing payment failed notification',
      orderCode: event.orderCode,
      transactionId: event.transactionId,
      errorMessage: event.errorMessage,
      errorCode: event.errorCode,
    });

    // TODO: Implement failure handling
    // - Send alert to support team
    // - Create incident ticket
    // - Log for analysis
  }

  /**
   * Handle order confirmed event
   *
   * Actions:
   * - Trigger fulfillment process
   * - Send order confirmation email
   * - Update inventory (if applicable)
   */
  @OnEvent(PAYMENT_EVENTS.ORDER_CONFIRMED)
  async handleOrderConfirmed(event: OrderConfirmedEvent): Promise<void> {
    this.logger.log({
      message: 'Processing order confirmed notification',
      orderCode: event.orderCode,
      orderId: event.orderId,
      totalAmount: event.totalAmount,
      confirmedAt: event.confirmedAt,
    });

    // TODO: Implement order confirmation handling
    // - Trigger fulfillment workflow
    // - Send order confirmation email
    // - Update CRM opportunity status
    // - Trigger license activation (handled by LicenseActivationListener)
  }

  // ============================================
  // PHASE 2: MULTI-PAYMENT EVENT HANDLERS
  // ============================================

  /**
   * Handle payment confirmed manually event
   *
   * Actions:
   * - Send confirmation email to customer
   * - Log manual confirmation for audit
   * - Trigger license creation if applicable
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_CONFIRMED)
  async handlePaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
    this.logger.log({
      message: 'Processing manual payment confirmation',
      paymentId: event.paymentId,
      orderId: event.orderId,
      orderCode: event.orderCode,
      amount: event.amount,
      totalPaidAmount: event.totalPaidAmount,
      confirmedById: event.confirmedById,
      newOrderPaymentStatus: event.newOrderPaymentStatus,
    });

    // TODO: Implement manual confirmation handling
    // - Send confirmation email to customer
    // - Record audit log for compliance
    // - Notify relevant team members
  }

  /**
   * Handle payment rejected event
   *
   * Actions:
   * - Send rejection notification to customer
   * - Log rejection reason for audit
   * - Create follow-up task
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_REJECTED)
  async handlePaymentRejected(event: PaymentRejectedEvent): Promise<void> {
    this.logger.warn({
      message: 'Processing payment rejection',
      paymentId: event.paymentId,
      orderId: event.orderId,
      rejectedById: event.rejectedById,
      rejectionReason: event.rejectionReason,
    });

    // TODO: Implement rejection handling
    // - Send rejection notification to customer (with reason if appropriate)
    // - Create follow-up task for sales team
    // - Record audit log
  }

  /**
   * Handle payment refunded event
   *
   * Actions:
   * - Send refund confirmation email
   * - Update accounting records
   * - Handle license revocation if full refund
   */
  @OnEvent(PAYMENT_EVENTS.PAYMENT_REFUNDED)
  async handlePaymentRefunded(event: PaymentRefundedEvent): Promise<void> {
    this.logger.log({
      message: event.isFullRefund
        ? 'Processing full refund'
        : 'Processing partial refund',
      paymentId: event.paymentId,
      orderId: event.orderId,
      orderCode: event.orderCode,
      refundAmount: event.refundAmount,
      totalRefunded: event.totalRefunded,
      isFullRefund: event.isFullRefund,
      refundedById: event.refundedById,
      newOrderPaymentStatus: event.newOrderPaymentStatus,
    });

    // TODO: Implement refund handling
    // - Send refund confirmation email to customer
    // - Update accounting records
    // - If full refund, trigger license revocation
    // - Create audit trail for compliance
  }
}
