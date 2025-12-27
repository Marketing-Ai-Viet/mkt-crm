import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MKT_EVENT_TYPE, MktCustomEventName } from 'src/mkt-core/order/types';
import { PAYMENT_HISTORY_TYPE } from 'src/mkt-core/payment/constants/payment.type';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { MktPaymentHistoryRepository } from 'src/mkt-core/payment/repositories';

export interface MktPaymentCustomEventData {
  eventType: MktCustomEventName;
  orderId: string;
  workspaceId: string;
  orderData: {
    id: string;
    note?: string;
  };
  timestamp: string;
}

export interface MktPaymentCustomEventPayload {
  name: MktCustomEventName;
  workspaceId: string;
  events: MktPaymentCustomEventData[];
}

@Injectable()
export class MktPaymentListenerService {
  private readonly logger = new Logger(MktPaymentListenerService.name);

  constructor(
    private readonly mktOrderRepository: MktOrderRepository,
    private readonly mktPaymentHistoryRepository: MktPaymentHistoryRepository,
  ) {}

  @OnEvent(MKT_EVENT_TYPE.MKT_PAYMENT)
  async handleMktPaymentEvent(payload: MktPaymentCustomEventPayload) {
    for (const event of payload.events) {
      try {
        const updatedOrder = await this.mktOrderRepository.findById(
          payload.workspaceId,
          event.orderId,
          { relations: { mktPayments: true } },
        );

        const paymentType = event.eventType as PAYMENT_HISTORY_TYPE;

        await this.pushLicenseHistory(
          payload.workspaceId,
          updatedOrder,
          paymentType,
        );
        this.logger.log(
          `Successfully processed order custom event: ${event.orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process order custom event: ${event.orderId}`,
          error,
        );
      }
    }
  }

  private async pushLicenseHistory(
    workspaceId: string,
    order: MktOrderWorkspaceEntity | null,
    paymentType: PAYMENT_HISTORY_TYPE,
  ): Promise<void> {
    if (!order) {
      this.logger.error('Order not found, skipping payment history update.');

      return;
    }

    const payment = order?.mktPayments?.[0] as MktPaymentWorkspaceEntity;

    if (!payment) {
      this.logger.error(
        `Order ${order.id} has no associated payment, skipping payment history entry.`,
      );

      return;
    }

    let note = '';

    if (payment.description) {
      note += `Ghi chú thanh toán: ${payment.description}; `;
    }
    if (order.note) {
      note += `Ghi chú đơn hàng: ${order.note}`;
    }

    await this.mktPaymentHistoryRepository.create(workspaceId, {
      name: `Payment ${paymentType} recorded for order ${order.orderCode}`,
      paymentType,
      amount: payment.amount ?? order.totalAmount ?? 0,
      note,
      mktOrderId: order.id,
      mktPaymentId: payment.id,
    });

    this.logger.log(`Created payment history entry for order ${order.id}.`);
  }
}
