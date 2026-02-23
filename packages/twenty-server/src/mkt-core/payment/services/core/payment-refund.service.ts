import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MktPaymentRepository } from 'src/mkt-core/payment/repositories/mkt-payment.repository';
import { MktPaymentHistoryRepository } from 'src/mkt-core/payment/repositories/mkt-payment-history.repository';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { OrderPaymentCalculationService } from 'src/mkt-core/order/services/core/order-payment-calculation.service';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { PAYMENT_TRANSACTION_STATUS } from 'src/mkt-core/payment/constants/payment-status.constants';
import { PAYMENT_ACTION } from 'src/mkt-core/payment/constants/payment-action.constants';
import { PAYMENT_EVENTS } from 'src/mkt-core/payment/events';
import { PAYMENT_HISTORY_TYPE } from 'src/mkt-core/payment/types/payment.type';

// ============================================
// TYPES
// ============================================

export type RefundPaymentInput = {
  paymentId: string;
  amount?: number; // null = full refund
  reason: string;
};

export type RefundPaymentResult = {
  success: boolean;
  payment?: {
    id: string;
    status: string;
    refundedAmount: number;
  };
  order?: {
    orderId: string;
    orderCode?: string;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
    paidPercent: number;
  } | null;
  refundedAmount?: number;
  error?: string;
};

/**
 * PaymentRefundService
 *
 * Handles payment refund workflow:
 * - Full refund: Payment status → REFUNDED
 * - Partial refund: Payment status → PARTIALLY_REFUNDED
 * - Update refundedAmount tracking
 * - Recalculate order totals
 * - Handle license revocation (if applicable)
 */
@Injectable()
export class PaymentRefundService {
  private readonly logger = new Logger(PaymentRefundService.name);

  constructor(
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktPaymentHistoryRepository: MktPaymentHistoryRepository,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly orderPaymentCalculationService: OrderPaymentCalculationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Refund a payment (full or partial)
   */
  async refundPayment(
    input: RefundPaymentInput,
    refundedById: string,
    workspaceId: string,
  ): Promise<RefundPaymentResult> {
    const { paymentId, amount: refundAmount, reason } = input;

    // Step 1: Get and validate payment
    const payment =
      await this.mktPaymentRepository.findByIdWithRelations(paymentId);

    if (!payment) {
      return {
        success: false,
        error: `Payment not found: ${paymentId}`,
      };
    }

    // Only CONFIRMED payments can be refunded
    if (
      payment.status !== PAYMENT_TRANSACTION_STATUS.CONFIRMED &&
      payment.status !== PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED
    ) {
      return {
        success: false,
        error: `Can only refund CONFIRMED payments, current status: ${payment.status}`,
      };
    }

    const paymentAmount = payment.amount ?? 0;
    const previousRefunded = payment.refundedAmount ?? 0;
    const availableForRefund = MoneyUtils.subtract(
      paymentAmount,
      previousRefunded,
    ).toNumber();

    // Determine refund amount (null = full remaining)
    const actualRefundAmount = refundAmount ?? availableForRefund;

    if (actualRefundAmount > availableForRefund) {
      return {
        success: false,
        error: `Refund amount (${actualRefundAmount}) exceeds available amount (${availableForRefund})`,
      };
    }

    if (actualRefundAmount <= 0) {
      return {
        success: false,
        error: 'Refund amount must be greater than 0',
      };
    }

    const previousStatus = payment.status;
    const newRefundedAmount = MoneyUtils.add(
      previousRefunded,
      actualRefundAmount,
    ).toNumber();

    // Determine new status
    const isFullRefund = newRefundedAmount >= paymentAmount;
    const newStatus = isFullRefund
      ? PAYMENT_TRANSACTION_STATUS.REFUNDED
      : PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED;
    const action = isFullRefund
      ? PAYMENT_ACTION.REFUNDED
      : PAYMENT_ACTION.PARTIALLY_REFUNDED;

    // Step 2: Update payment
    await this.mktPaymentRepository.updatePayment(paymentId, {
      status: newStatus,
      refundedAmount: newRefundedAmount,
      refundedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    // Step 3: Record history
    await this.recordHistory({
      paymentId,
      orderId: payment.mktOrderId,
      action,
      previousStatus,
      newStatus,
      performedById: refundedById,
      note: reason,
      amount: actualRefundAmount,
      metadata: {
        refundAmount: actualRefundAmount,
        totalRefunded: newRefundedAmount,
        reason,
      },
    });

    // Step 4: Recalculate order
    const orderResult = payment.mktOrderId
      ? await this.recalculateOrderPayment(payment.mktOrderId)
      : null;

    // Step 5: Emit refund event for license revocation handling
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_REFUNDED, {
      paymentId,
      orderId: payment.mktOrderId,
      orderCode: orderResult?.orderCode,
      refundAmount: actualRefundAmount,
      totalRefunded: newRefundedAmount,
      isFullRefund,
      refundedById,
      workspaceId,
    });

    this.logger.log({
      message: isFullRefund
        ? 'Payment fully refunded'
        : 'Payment partially refunded',
      paymentId,
      refundAmount: actualRefundAmount,
      totalRefunded: newRefundedAmount,
    });

    return {
      success: true,
      payment: {
        id: paymentId,
        status: newStatus,
        refundedAmount: newRefundedAmount,
      },
      order: orderResult,
      refundedAmount: actualRefundAmount,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async recalculateOrderPayment(orderId: string) {
    const order =
      await this.mktOrderRepository.findByIdWithPaymentSummary(orderId);

    if (!order) {
      return null;
    }

    // Only count CONFIRMED payments, subtract refunded amounts
    const confirmedPayments = (order.mktPayments ?? [])
      .filter(
        (p) =>
          p.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED ||
          p.status === PAYMENT_TRANSACTION_STATUS.PARTIALLY_REFUNDED ||
          p.status === PAYMENT_TRANSACTION_STATUS.REFUNDED,
      )
      .map((p) => ({
        amount: p.amount ?? 0,
        refundedAmount: p.refundedAmount ?? 0,
      }));

    const summary = this.orderPaymentCalculationService.calculatePaymentSummary(
      order.totalAmount ?? 0,
      confirmedPayments,
    );

    const repository = await this.mktOrderRepository.getRepository();

    await repository.update(orderId, {
      paidAmount: summary.paidAmount,
      remainingAmount: summary.remainingAmount,
      paymentStatus: summary.paymentStatus,
    });

    return {
      orderId,
      orderCode: order.orderCode,
      ...summary,
    };
  }

  private async recordHistory(data: {
    paymentId: string;
    orderId: string | null | undefined;
    action: string;
    previousStatus: string;
    newStatus: string;
    performedById: string;
    note?: string;
    amount: number;
    metadata?: Record<string, unknown>;
  }) {
    await this.mktPaymentHistoryRepository.createPaymentHistory({
      name: `${data.action} - ${data.amount.toLocaleString()} VND`,
      mktPaymentId: data.paymentId,
      mktOrderId: data.orderId ?? undefined,
      paymentType: PAYMENT_HISTORY_TYPE.REFUND,
      note: data.note,
      amount: data.amount,
    });
  }
}
