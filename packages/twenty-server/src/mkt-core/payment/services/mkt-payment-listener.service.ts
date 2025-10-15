import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { CustomEventName } from 'src/engine/workspace-event-emitter/types/custom-event-name.type';
import {
  MKT_EVENT_TYPE,
  PAYMENT_HISTORY_TYPE,
} from 'src/mkt-core/common/common.type';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import { MktVariantWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant.workspace-entity';

export interface MktPaymentCustomEventData {
  eventType: CustomEventName;
  orderId: string;
  workspaceId: string;
  orderData: {
    id: string;
    note?: string;
  };
  timestamp: string;
}

export interface MktPaymentCustomEventPayload {
  name: CustomEventName;
  workspaceId: string;
  events: MktPaymentCustomEventData[];
}

@Injectable()
export class MktPaymentListenerService {
  private readonly logger = new Logger(MktPaymentListenerService.name);
  constructor(private mktRepo: MktRepositoryService) {}

  @OnEvent(MKT_EVENT_TYPE.MKT_PAYMENT)
  async handleMktPaymentEvent(payload: MktPaymentCustomEventPayload) {
    for (const event of payload.events) {
      try {
        this.mktRepo.workspaceId = payload.workspaceId;
        // Lấy order mới nhất
        const orderRepo = await this.mktRepo.getRepository(
          MktOrderWorkspaceEntity,
        );
        const updatedOrder = await orderRepo.findOne({
          where: { id: event.orderId },
          relations: ['mktLicense', 'mktPayments', 'mktLicense.mktVariant'],
        });

        const paymentType = event.eventType as PAYMENT_HISTORY_TYPE;

        await this.pushLicenseHistory(updatedOrder, paymentType);
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
    order: MktOrderWorkspaceEntity | null,
    paymentType: PAYMENT_HISTORY_TYPE,
  ): Promise<void> {
    if (!order || !order?.mktLicense) {
      this.logger.error(
        'Order, license not found, skipping license history update.',
      );

      return;
    }
    const paymentHistoryRepo = await this.mktRepo.getPaymentHistoryRepository();
    const licenses = order.mktLicense;
    const payment = order?.mktPayments?.[0] as MktPaymentWorkspaceEntity;

    if (!payment) {
      this.logger.error(
        `Order ${order.id} has no associated payment, skipping payment history entry.`,
      );

      return;
    }
    for (const license of licenses) {
      const variant = license.mktVariant as MktVariantWorkspaceEntity;

      if (!variant) {
        this.logger.error(
          `License ${license.id} has no associated variant, skipping payment history entry.`,
        );
        continue;
      }
      let note = '';

      if (payment.description) {
        note += `Ghi chú thanh toán: ${payment.description}; `;
      }
      if (order.note) {
        note += `Ghi chú đơn hàng: ${order.note}`;
      }
      // Tạo entry trong payment history
      const paymentHistory = paymentHistoryRepo.create({
        name: `Payment ${paymentType} recorded for order ${order.orderCode}`,
        paymentType,
        amount: variant.price,
        note,
        mktLicenseId: license.id,
        mktOrderId: order.id,
        mktVariantId: variant.id,
        mktPaymentId: payment.id,
      });

      paymentHistory.createdBy = order.createdBy;
      await paymentHistoryRepo.save(paymentHistory);
      this.logger.log(
        `Created payment history entry for license ${license.id} and order ${order.id}.`,
      );
    }

    // Implement your custom business logic here
    // For example:
    // - Send notifications
    // - Update related records
    // - Trigger external integrations
    // - Log analytics events
  }
}
