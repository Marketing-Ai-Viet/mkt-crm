import { Injectable } from '@nestjs/common';

import sortBy from 'lodash.sortby';

import { ORDER_STATUS, PAYMENT_STATUS } from 'src/mkt-core/order/constants';
import {
  OrderOutput,
  OrderItemOutput,
  OrderCustomerInfo,
  OrderSalesStaffInfo,
  OrderPaymentMethodInfo,
} from 'src/mkt-core/order/dto/order-response.output';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/objects/mkt-payment.workspace-entity';
import { PAYMENT_TRANSACTION_STATUS } from 'src/mkt-core/payment/constants/payment-status.constants';
import { DataScopeContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/types';
import { filterToWhere } from 'src/mkt-core/mkt-rbac-enterprise-grade/interceptors/utils';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

// ============================================
// TYPES
// ============================================

type GraphQLContext = {
  req: {
    dataScope?: DataScopeContext;
  };
};

/**
 * OrderQueryService - Handles query-related operations for orders
 *
 * Responsibilities:
 * - Build TypeORM where clauses with hierarchical access filtering
 * - Map order entities to output DTOs
 * - Extract related data (customer, items, payments, sales staff)
 */
@Injectable()
export class OrderQueryService {
  /**
   * Build TypeORM where clause combining base conditions with hierarchical filter
   */
  buildWhereClause(
    baseWhere: Record<string, unknown>,
    ctx: GraphQLContext,
  ): Record<string, unknown> | Record<string, unknown>[] {
    const dataScope = ctx.req?.dataScope;

    // No filter or full access - return base where only
    if (!dataScope?.filter || dataScope.hasFullAccess) {
      return baseWhere;
    }

    // Convert hierarchical filter to TypeORM where clause
    const hierarchicalWhere = filterToWhere(dataScope.filter);

    // No hierarchical conditions
    if (!hierarchicalWhere) {
      return baseWhere;
    }

    // Merge base where with hierarchical filter
    return this.mergeWhereConditions(baseWhere, hierarchicalWhere);
  }

  /**
   * Merge base where conditions with hierarchical filter
   */
  mergeWhereConditions(
    baseWhere: Record<string, unknown>,
    hierarchicalWhere: Record<string, unknown> | Record<string, unknown>[],
  ): Record<string, unknown> | Record<string, unknown>[] {
    // If hierarchical is array (OR conditions), merge base into each
    if (Array.isArray(hierarchicalWhere)) {
      return hierarchicalWhere.map((hw) => ({ ...baseWhere, ...hw }));
    }

    // Simple merge for AND conditions
    return { ...baseWhere, ...hierarchicalWhere };
  }

  // ============================================
  // MAPPING METHODS
  // ============================================

  /**
   * Map order entity to output DTO with all relations
   */
  mapOrderToOutput(order: MktOrderWorkspaceEntity): OrderOutput {
    return {
      // Existing fields
      id: order.id,
      name: order.name,
      orderCode: order.orderCode,
      status: order.status as ORDER_STATUS,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      promotionDiscount: order.promotionDiscount,
      comboDiscount: order.comboDiscount,
      currency: order.currency,
      note: order.note,
      paidAmount: order.paidAmount,
      remainingAmount: order.remainingAmount,
      paymentStatus: order.paymentStatus as PAYMENT_STATUS,
      accountingConfirmed: order.accountingConfirmed,
      mktCustomerId: order.mktCustomerId ?? undefined,
      accountOwnerId: order.accountOwnerId,
      createdById: order.createdById ?? undefined,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,

      // Customer info (from mktCustomer relation)
      customer: this.mapCustomerInfo(order.mktCustomer, order.mktCustomerId),

      // Order items
      orderItems: this.mapOrderItems(order.orderItems),

      // Sales staff info (from createdBy relation)
      salesStaff: this.mapSalesStaffInfo(order.createdBy),

      // Payment info (from mktPayments relation)
      paymentMethod: this.mapPaymentMethodInfo(order.mktPayments),
      lastPaymentDate: this.getLastPaymentDate(order.mktPayments),

      // Direct fields from entity
      sInvoiceStatus: order.sInvoiceStatus ?? undefined,
      paymentDeadline: this.formatPaymentDeadline(order.paymentDeadline),
    };
  }

  /**
   * Map order item entity to output DTO
   */
  mapOrderItemToOutput(item: MktOrderItemWorkspaceEntity): OrderItemOutput {
    return {
      id: item.id,
      name: item.name,
      productName: item.snapshotProductName ?? undefined,
      packageName: item.snapshotPackageName ?? undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      discount: item.itemDiscount,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Map order items array to output DTOs
   */
  private mapOrderItems(
    items: MktOrderItemWorkspaceEntity[] | undefined,
  ): OrderItemOutput[] | undefined {
    if (!items?.length) {
      return undefined;
    }

    return items.map((item) => this.mapOrderItemToOutput(item));
  }

  /**
   * Get latest confirmed payment from payments array
   */
  private getLatestConfirmedPayment(
    payments: MktPaymentWorkspaceEntity[] | undefined,
  ): MktPaymentWorkspaceEntity | undefined {
    if (!payments?.length) {
      return undefined;
    }

    const confirmedPayments = payments.filter(
      (p) => p.status === PAYMENT_TRANSACTION_STATUS.CONFIRMED,
    );

    if (!confirmedPayments.length) {
      return undefined;
    }

    // Sort by paymentDate ascending, then get the last one (most recent)
    const sorted = sortBy(confirmedPayments, ['paymentDate']);

    return sorted[sorted.length - 1];
  }

  /**
   * Map payment method info from latest confirmed payment
   */
  private mapPaymentMethodInfo(
    payments: MktPaymentWorkspaceEntity[] | undefined,
  ): OrderPaymentMethodInfo | undefined {
    const latestPayment = this.getLatestConfirmedPayment(payments);

    if (!latestPayment) {
      return undefined;
    }

    // Access nested relation mktPaymentMethod
    const paymentMethod = latestPayment.mktPaymentMethod as
      | { id?: string; name?: string; type?: string; description?: string }
      | undefined;

    if (!paymentMethod) {
      return undefined;
    }

    return {
      id: paymentMethod.id ?? undefined,
      name: paymentMethod.name ?? undefined,
      type: paymentMethod.type ?? undefined,
      description: paymentMethod.description ?? undefined,
    };
  }

  /**
   * Get last payment date from latest confirmed payment
   */
  private getLastPaymentDate(
    payments: MktPaymentWorkspaceEntity[] | undefined,
  ): string | undefined {
    const latestPayment = this.getLatestConfirmedPayment(payments);

    if (!latestPayment?.paymentDate) {
      return undefined;
    }

    // paymentDate is already a string from entity
    return latestPayment.paymentDate;
  }

  /**
   * Map customer info to output object
   */
  private mapCustomerInfo(
    customer:
      | { id?: string; name?: string; email?: string; phone?: string }
      | null
      | undefined,
    customerId: string | null | undefined,
  ): OrderCustomerInfo | undefined {
    if (!customer && !customerId) {
      return undefined;
    }

    return {
      id: customer?.id ?? customerId ?? undefined,
      name: customer?.name ?? undefined,
      email: customer?.email ?? undefined,
      phone: customer?.phone ?? undefined,
    };
  }

  /**
   * Map sales staff info to output object
   */
  private mapSalesStaffInfo(
    createdBy: WorkspaceMemberWorkspaceEntity | null | undefined,
  ): OrderSalesStaffInfo | undefined {
    if (!createdBy) {
      return undefined;
    }

    const fullName = this.getSalesStaffFullName(createdBy);

    return {
      id: createdBy.id ?? undefined,
      name: fullName,
      email: createdBy.userEmail ?? undefined,
    };
  }

  /**
   * Get sales staff full name from createdBy relation
   */
  private getSalesStaffFullName(
    createdBy: WorkspaceMemberWorkspaceEntity | null | undefined,
  ): string | undefined {
    if (!createdBy?.name) {
      return undefined;
    }

    const { firstName, lastName } = createdBy.name;

    if (!firstName) {
      return undefined;
    }

    return `${firstName} ${lastName ?? ''}`.trim();
  }

  /**
   * Format payment deadline to ISO string
   */
  private formatPaymentDeadline(
    paymentDeadline: Date | null | undefined,
  ): string | undefined {
    if (!paymentDeadline) {
      return undefined;
    }

    return DateTimeUtils.toISO(DateTimeUtils.fromDate(paymentDeadline));
  }
}
