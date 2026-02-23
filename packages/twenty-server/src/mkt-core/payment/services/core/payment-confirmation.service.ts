import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MktPaymentRepository } from 'src/mkt-core/payment/repositories/mkt-payment.repository';
import { MktPaymentHistoryRepository } from 'src/mkt-core/payment/repositories/mkt-payment-history.repository';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { OrderPaymentCalculationService } from 'src/mkt-core/order/services/core/order-payment-calculation.service';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import {
  PAYMENT_TRANSACTION_STATUS,
  PaymentTransactionStatus,
} from 'src/mkt-core/payment/constants/payment-status.constants';
import {
  PAYMENT_ACTION,
  PaymentAction,
} from 'src/mkt-core/payment/constants/payment-action.constants';
import { PAYMENT_EVENTS } from 'src/mkt-core/payment/events';
import { PAYMENT_HISTORY_TYPE } from 'src/mkt-core/payment/types/payment.type';
import { DASHBOARD_INVALIDATION_EVENTS } from 'src/mkt-core/mkt-dashboard/listeners/dashboard-cache-invalidation.listener';

// ============================================
// TYPES
// ============================================

export type ConfirmPaymentInput = {
  paymentId: string;
  note?: string;
};

export type RejectPaymentInput = {
  paymentId: string;
  rejectionReason: string;
  note?: string;
};

export type PaymentResult = {
  id: string;
  status: string;
  confirmedAt?: string;
  confirmedById?: string;
  rejectedAt?: string;
  rejectedById?: string;
  rejectionReason?: string;
};

export type OrderResult = {
  orderId: string;
  orderCode?: string;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: string;
  paidPercent: number;
};

export type ConfirmPaymentResult = {
  success: boolean;
  payment?: PaymentResult;
  order?: OrderResult | null;
  licensesCreated?: boolean;
  error?: string;
};

/**
 * PaymentConfirmationService
 *
 * Handles payment confirmation and rejection workflow:
 * - Validate payment status
 * - Update payment status (CONFIRMED/REJECTED)
 * - Record payment history
 * - Recalculate order payment totals
 * - Trigger license creation if eligible
 * - Emit events for downstream processing
 */
@Injectable()
export class PaymentConfirmationService {
  private readonly logger = new Logger(PaymentConfirmationService.name);

  constructor(
    private readonly mktPaymentRepository: MktPaymentRepository,
    private readonly mktPaymentHistoryRepository: MktPaymentHistoryRepository,
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly orderPaymentCalculationService: OrderPaymentCalculationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Confirm a payment
   */
  async confirmPayment(
    input: ConfirmPaymentInput,
    confirmedById: string,
    workspaceId: string,
  ): Promise<ConfirmPaymentResult> {
    const { paymentId, note } = input;

    // Step 1: Get and validate payment (pass workspaceId explicitly)
    const payment = await this.mktPaymentRepository.findByIdWithRelations(
      paymentId,
      workspaceId,
    );

    if (!payment) {
      return {
        success: false,
        error: `Payment not found: ${paymentId}`,
      };
    }

    if (payment.status !== PAYMENT_TRANSACTION_STATUS.PENDING) {
      return {
        success: false,
        error: `Payment already ${payment.status}, cannot confirm`,
      };
    }

    const previousStatus = payment.status as PaymentTransactionStatus;
    const newStatus = PAYMENT_TRANSACTION_STATUS.CONFIRMED;
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    // Step 2: Update payment status (pass workspaceId explicitly)
    await this.mktPaymentRepository.updatePayment(
      paymentId,
      {
        status: newStatus,
        confirmedAt: nowISO,
        confirmedById,
        paymentDate: nowISO,
      },
      workspaceId,
    );

    // Step 3: Record history
    await this.recordHistory({
      paymentId,
      orderId: payment.mktOrderId,
      action: PAYMENT_ACTION.CONFIRMED,
      previousStatus,
      newStatus,
      performedById: confirmedById,
      note,
      amount: payment.amount ?? 0,
    });

    // Step 4: Recalculate order payment totals (pass workspaceId)
    const orderResult = payment.mktOrderId
      ? await this.recalculateOrderPayment(payment.mktOrderId, workspaceId)
      : null;

    // Step 5: Check license creation eligibility
    let licensesCreated = false;

    if (orderResult && this.shouldCreateLicenses(orderResult.paymentStatus)) {
      // Trigger license creation via event
      this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
        paymentId,
        orderId: payment.mktOrderId,
        orderCode: orderResult.orderCode,
        amount: payment.amount,
        totalPaidAmount: orderResult.paidAmount,
        workspaceId,
      });
      licensesCreated = true;
    }

    // Invalidate dashboard caches (revenue depends on payment confirmation)
    this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.PAYMENT_CHANGED, {
      workspaceId,
      entityId: paymentId,
    });

    this.logger.log({
      message: 'Payment confirmed',
      paymentId,
      orderId: payment.mktOrderId,
      previousStatus,
      newStatus,
      licensesCreated,
    });

    return {
      success: true,
      payment: {
        id: paymentId,
        status: newStatus,
        confirmedAt: nowISO,
        confirmedById,
      },
      order: orderResult,
      licensesCreated,
    };
  }

  /**
   * Reject a payment
   */
  async rejectPayment(
    input: RejectPaymentInput,
    rejectedById: string,
    workspaceId: string,
  ): Promise<ConfirmPaymentResult> {
    const { paymentId, rejectionReason, note } = input;

    // Step 1: Get and validate payment (pass workspaceId explicitly)
    const payment = await this.mktPaymentRepository.findByIdWithRelations(
      paymentId,
      workspaceId,
    );

    if (!payment) {
      return {
        success: false,
        error: `Payment not found: ${paymentId}`,
      };
    }

    if (payment.status !== PAYMENT_TRANSACTION_STATUS.PENDING) {
      return {
        success: false,
        error: `Payment already ${payment.status}, cannot reject`,
      };
    }

    const previousStatus = payment.status as PaymentTransactionStatus;
    const newStatus = PAYMENT_TRANSACTION_STATUS.REJECTED;
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    // Step 2: Update payment status (pass workspaceId explicitly)
    await this.mktPaymentRepository.updatePayment(
      paymentId,
      {
        status: newStatus,
        rejectedAt: nowISO,
        rejectedById,
        rejectionReason,
      },
      workspaceId,
    );

    // Step 3: Record history
    await this.recordHistory({
      paymentId,
      orderId: payment.mktOrderId,
      action: PAYMENT_ACTION.REJECTED,
      previousStatus,
      newStatus,
      performedById: rejectedById,
      note: note ?? rejectionReason,
      amount: payment.amount ?? 0,
      metadata: { rejectionReason },
    });

    // Step 4: Emit rejected event
    this.eventEmitter.emit(PAYMENT_EVENTS.PAYMENT_REJECTED, {
      paymentId,
      orderId: payment.mktOrderId,
      rejectedById,
      rejectionReason,
      workspaceId,
    });

    // Invalidate dashboard caches
    this.eventEmitter.emit(DASHBOARD_INVALIDATION_EVENTS.PAYMENT_CHANGED, {
      workspaceId,
      entityId: paymentId,
    });

    this.logger.log({
      message: 'Payment rejected',
      paymentId,
      rejectionReason,
    });

    return {
      success: true,
      payment: {
        id: paymentId,
        status: newStatus,
        rejectedAt: nowISO,
        rejectedById,
        rejectionReason,
      },
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async recalculateOrderPayment(
    orderId: string,
    workspaceId: string,
  ): Promise<OrderResult | null> {
    const order = await this.mktOrderRepository.findByIdWithOptions(
      orderId,
      { relations: { mktPayments: true } },
      workspaceId,
    );

    if (!order) {
      return null;
    }

    const confirmedPayments = (order.mktPayments ?? [])
      .filter((p) => p.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED)
      .map((p) => ({
        amount: p.amount ?? 0,
        refundedAmount: p.refundedAmount ?? 0,
      }));

    const summary = this.orderPaymentCalculationService.calculatePaymentSummary(
      order.totalAmount ?? 0,
      confirmedPayments,
    );

    // Update order (pass workspaceId explicitly)
    await this.mktOrderRepository.updateOrder(
      orderId,
      {
        paidAmount: summary.paidAmount,
        remainingAmount: summary.remainingAmount,
        paymentStatus: summary.paymentStatus,
      },
      workspaceId,
    );

    return {
      orderId,
      orderCode: order.orderCode,
      ...summary,
    };
  }

  private shouldCreateLicenses(paymentStatus: string): boolean {
    return paymentStatus === 'PAID' || paymentStatus === 'OVERPAID';
  }

  private async recordHistory(data: {
    paymentId: string;
    orderId: string | null | undefined;
    action: PaymentAction;
    previousStatus: PaymentTransactionStatus;
    newStatus: PaymentTransactionStatus;
    performedById: string;
    note?: string;
    amount: number;
    metadata?: Record<string, unknown>;
  }) {
    await this.mktPaymentHistoryRepository.createPaymentHistory({
      name: `${data.action} - ${data.newStatus}`,
      mktPaymentId: data.paymentId,
      mktOrderId: data.orderId ?? undefined,
      paymentType: PAYMENT_HISTORY_TYPE.PAYMENT,
      note: data.note,
      amount: data.amount,
    });
  }
}
