import { Injectable, Logger } from '@nestjs/common';

import { MktPaymentHistoryRepository } from 'src/mkt-core/payment/repositories/mkt-payment-history.repository';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { PaymentAction } from 'src/mkt-core/payment/constants/payment-action.constants';
import { PAYMENT_HISTORY_TYPE } from 'src/mkt-core/payment/types/payment.type';
import { MktPaymentHistoryWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment-history.workspace-entity';

type RecordHistoryInput = {
  paymentId: string;
  orderId?: string | null;
  action: PaymentAction;
  previousStatus?: string;
  newStatus?: string;
  performedById: string;
  note?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
};

type PaymentHistoryOutput = {
  id: string;
  name: string;
  action?: string;
  previousStatus?: string;
  newStatus?: string;
  amount?: number;
  performedAt?: string;
  performedById?: string | null;
  note?: string;
  createdAt?: string;
};

/**
 * PaymentHistoryService
 *
 * Manages payment history audit trail.
 * All payment status changes should be recorded via this service.
 */
@Injectable()
export class PaymentHistoryService {
  private readonly logger = new Logger(PaymentHistoryService.name);

  constructor(
    private readonly mktPaymentHistoryRepository: MktPaymentHistoryRepository,
  ) {}

  /**
   * Record a payment history entry
   */
  async record(input: RecordHistoryInput): Promise<void> {
    const nowISO = DateTimeUtils.toISO(DateTimeUtils.now());

    await this.mktPaymentHistoryRepository.createPaymentHistory({
      name: this.buildHistoryName(input),
      mktPaymentId: input.paymentId,
      mktOrderId: input.orderId ?? undefined,
      paymentType: this.mapActionToPaymentType(input.action),
      note: input.note,
      amount: input.amount ?? 0,
    });

    this.logger.debug({
      message: 'Payment history recorded',
      paymentId: input.paymentId,
      action: input.action,
    });
  }

  /**
   * Get history for a payment
   */
  async getByPaymentId(
    paymentId: string,
  ): Promise<MktPaymentHistoryWorkspaceEntity[]> {
    return this.mktPaymentHistoryRepository.findByPaymentId(paymentId);
  }

  /**
   * Get history for an order
   */
  async getByOrderId(
    orderId: string,
  ): Promise<MktPaymentHistoryWorkspaceEntity[]> {
    return this.mktPaymentHistoryRepository.findByOrderId(orderId);
  }

  /**
   * Get formatted history for GraphQL response
   */
  async getFormattedHistoryByPaymentId(
    paymentId: string,
  ): Promise<PaymentHistoryOutput[]> {
    const histories = await this.getByPaymentId(paymentId);

    return histories.map((h) => ({
      id: h.id,
      name: h.name,
      action: h.action,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      amount: h.amount,
      performedAt: h.performedAt,
      performedById: h.performedById,
      note: h.note,
      createdAt: h.createdAt,
    }));
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private buildHistoryName(input: RecordHistoryInput): string {
    const parts: string[] = [input.action];

    if (input.newStatus) {
      parts.push(`→ ${input.newStatus}`);
    }

    if (input.amount) {
      parts.push(`(${input.amount.toLocaleString()} VND)`);
    }

    return parts.join(' ');
  }

  private mapActionToPaymentType(action: PaymentAction): PAYMENT_HISTORY_TYPE {
    switch (action) {
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return PAYMENT_HISTORY_TYPE.REFUND;
      default:
        return PAYMENT_HISTORY_TYPE.PAYMENT;
    }
  }
}
