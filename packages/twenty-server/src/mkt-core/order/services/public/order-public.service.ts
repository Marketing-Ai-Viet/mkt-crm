import { Injectable, Logger } from '@nestjs/common';

import groupBy from 'lodash.groupby';
import { FindOptionsRelations } from 'typeorm';

import {
  ACTIVE_PAYMENT_TRANSACTION_STATUSES,
  ANTI_ENUMERATION,
  ORDER_CODE_PATTERN,
  ORDER_STATUS_ERROR_MAP,
  PAYABLE_ORDER_STATUSES,
  PAYABLE_PAYMENT_STATUSES,
  PAYMENT_STATUS_ERROR_MAP,
  PUBLIC_ORDER_DEFAULTS,
  PUBLIC_ORDER_ERROR_CODE,
  PUBLIC_ORDER_ERROR_MESSAGE,
  PUBLIC_ORDER_LOG_CONTEXT,
  PublicOrderErrorCode,
} from 'src/mkt-core/order/constants/public-order.constants';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { ORDER_PAYMENT_STATUS } from 'src/mkt-core/order/constants/payment-status.constants';
import {
  MktPublicOrderPaymentDataDto,
  MktPublicOrderPaymentResponseDto,
} from 'src/mkt-core/order/dto/public/order-payment-public.output';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { PublicOrderLogResult } from 'src/mkt-core/order/types';

// ============================================
// SERVICE
// ============================================

@Injectable()
export class OrderPublicService {
  private readonly logger = new Logger(PUBLIC_ORDER_LOG_CONTEXT);

  private readonly findRelations: FindOptionsRelations<MktOrderWorkspaceEntity> =
    {
      mktCustomer: true,
      orderItems: true,
      mktPayments: true,
    };

  constructor(private readonly mktOrderRepository: MktOrderRepository) {}

  // ============================================
  // HELPERS
  // ============================================

  private maskOrderCode(orderCode: string): string {
    if (orderCode.length < 10) return '***';

    const prefix = orderCode.slice(0, 4);
    const suffix = orderCode.slice(-3);

    return `${prefix}****-***${suffix}`;
  }

  private toInt(value: number | null | undefined): number {
    return Math.round(value ?? 0);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  async getOrderPaymentPublicInfo(
    orderCode: string,
    clientIp: string,
  ): Promise<MktPublicOrderPaymentResponseDto> {
    const startMs = DateTimeUtils.toMillis(DateTimeUtils.now());

    // 1. Validate format (same response as not found - anti-enumeration)
    if (!ORDER_CODE_PATTERN.test(orderCode)) {
      await this.antiEnumerationDelay();
      this.logQuery(orderCode, clientIp, 'NOT_FOUND', startMs);

      return this.notFoundResponse();
    }

    // 2. Find order with relations
    const order = await this.mktOrderRepository.findByOrderCode(orderCode, {
      relations: this.findRelations,
    });

    if (!order) {
      await this.antiEnumerationDelay();
      this.logQuery(orderCode, clientIp, 'NOT_FOUND', startMs);

      return this.notFoundResponse();
    }

    // 3. Validate order status
    const statusError = this.validateOrderStatus(order);

    if (statusError) {
      this.logQuery(orderCode, clientIp, 'BLOCKED', startMs);

      return statusError;
    }

    // 4. Validate payment status
    const paymentStatusError = this.validatePaymentStatus(order);

    if (paymentStatusError) {
      this.logQuery(orderCode, clientIp, 'BLOCKED', startMs);

      return paymentStatusError;
    }

    // 5. Find active payment
    const activePayment = this.getActivePayment(order.mktPayments);

    if (!activePayment) {
      this.logQuery(orderCode, clientIp, 'NO_PAYMENT', startMs);

      return this.errorResponse(
        PUBLIC_ORDER_ERROR_CODE.NO_ACTIVE_PAYMENT,
        PUBLIC_ORDER_ERROR_MESSAGE[PUBLIC_ORDER_ERROR_CODE.NO_ACTIVE_PAYMENT],
      );
    }

    // 6. Build response
    this.logQuery(orderCode, clientIp, 'SUCCESS', startMs);

    return {
      success: true,
      data: this.buildData(order, activePayment),
      error: null,
    };
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateOrderStatus(
    order: MktOrderWorkspaceEntity,
  ): MktPublicOrderPaymentResponseDto | null {
    const orderStatus = order.status as ORDER_STATUS | null;

    if (!orderStatus) {
      return this.errorResponse(
        PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_PAYABLE,
        PUBLIC_ORDER_ERROR_MESSAGE[PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_PAYABLE],
      );
    }

    if (PAYABLE_ORDER_STATUSES.has(orderStatus)) {
      return null;
    }

    const errorCode =
      ORDER_STATUS_ERROR_MAP[orderStatus] ??
      PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_PAYABLE;

    return this.errorResponse(errorCode, PUBLIC_ORDER_ERROR_MESSAGE[errorCode]);
  }

  private validatePaymentStatus(
    order: MktOrderWorkspaceEntity,
  ): MktPublicOrderPaymentResponseDto | null {
    const paymentStatus = order.paymentStatus as ORDER_PAYMENT_STATUS | null;

    if (!paymentStatus) {
      return null;
    }

    if (PAYABLE_PAYMENT_STATUSES.has(paymentStatus)) {
      return null;
    }

    const errorCode =
      PAYMENT_STATUS_ERROR_MAP[paymentStatus] ??
      PUBLIC_ORDER_ERROR_CODE.ORDER_ALREADY_PAID;

    return this.errorResponse(errorCode, PUBLIC_ORDER_ERROR_MESSAGE[errorCode]);
  }

  // ============================================
  // ACTIVE PAYMENT SELECTION
  // ============================================

  private getActivePayment(
    payments: MktPaymentWorkspaceEntity[] | undefined,
  ): MktPaymentWorkspaceEntity | null {
    if (!payments || payments.length === 0) {
      return null;
    }

    const grouped = groupBy(payments, (p: MktPaymentWorkspaceEntity) =>
      ACTIVE_PAYMENT_TRANSACTION_STATUSES.has(p.status ?? '')
        ? 'active'
        : 'inactive',
    );

    const actives = (grouped['active'] ?? []).sort((a, b) => {
      const dateA = DateTimeUtils.toMillis(DateTimeUtils.fromISO(a.createdAt));
      const dateB = DateTimeUtils.toMillis(DateTimeUtils.fromISO(b.createdAt));

      return dateB - dateA;
    });

    return actives[0] ?? null;
  }

  // ============================================
  // RESPONSE BUILDERS
  // ============================================

  private buildData(
    order: MktOrderWorkspaceEntity,
    payment: MktPaymentWorkspaceEntity,
  ): MktPublicOrderPaymentDataDto {
    return {
      order: {
        orderCode: order.orderCode,
        status: order.status ?? '',
        paymentStatus: order.paymentStatus ?? '',
        totalAmount: this.toInt(order.totalAmount),
        paidAmount: this.toInt(order.paidAmount),
        remainingAmount: this.toInt(order.remainingAmount),
        currency: order.currency ?? PUBLIC_ORDER_DEFAULTS.CURRENCY,
        paymentDeadline: order.paymentDeadline
          ? DateTimeUtils.toISO(DateTimeUtils.fromDate(order.paymentDeadline))
          : null,
        createdAt: order.createdAt,
      },
      customer: {
        name: order.mktCustomer?.name ?? PUBLIC_ORDER_DEFAULTS.CUSTOMER_NAME,
        email: order.mktCustomer?.email ?? null,
        phone: order.mktCustomer?.phone ?? null,
      },
      items: (order.orderItems ?? []).map((item) => ({
        name: item.name,
        quantity: item.quantity ?? 1,
        unitPrice: this.toInt(item.unitPrice),
        totalPrice: this.toInt(item.totalPrice),
        productName: item.snapshotProductName ?? null,
        packageName: item.snapshotPackageName ?? null,
      })),
      payment: {
        qrCodeUrl: payment.qrCodeUrl ?? '',
        amount: this.toInt(payment.amount),
        currency: payment.currency ?? PUBLIC_ORDER_DEFAULTS.CURRENCY,
      },
    };
  }

  private notFoundResponse(): MktPublicOrderPaymentResponseDto {
    return this.errorResponse(
      PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_FOUND,
      PUBLIC_ORDER_ERROR_MESSAGE[PUBLIC_ORDER_ERROR_CODE.ORDER_NOT_FOUND],
    );
  }

  private errorResponse(
    code: PublicOrderErrorCode,
    message: string,
  ): MktPublicOrderPaymentResponseDto {
    return {
      success: false,
      data: null,
      error: { code, message },
    };
  }

  // ============================================
  // ANTI-ENUMERATION
  // ============================================

  private async antiEnumerationDelay(): Promise<void> {
    const delayMs =
      ANTI_ENUMERATION.MIN_DELAY_MS +
      Math.random() *
        (ANTI_ENUMERATION.MAX_DELAY_MS - ANTI_ENUMERATION.MIN_DELAY_MS);

    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // ============================================
  // LOGGING
  // ============================================

  private logQuery(
    orderCode: string,
    clientIp: string,
    result: PublicOrderLogResult,
    startMs: number,
  ): void {
    const durationMs = DateTimeUtils.toMillis(DateTimeUtils.now()) - startMs;

    this.logger.log('Public order payment query', {
      orderCodeMasked: this.maskOrderCode(orderCode),
      clientIp,
      result,
      durationMs,
    });
  }
}
