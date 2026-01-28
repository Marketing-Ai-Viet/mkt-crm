import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktOrderRepository } from 'src/mkt-core/order/repositories/mkt-order.repository';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { MoneyUtils } from 'src/mkt-core/utils/money.utils';
import {
  PurchaseHistoryOutput,
  PurchaseOrderOutput,
  PurchaseOrderItemOutput,
} from 'src/mkt-core/customer/dto/purchase-history.dto';
import { GetPurchaseHistoryArgs } from 'src/mkt-core/customer/dto/purchase-history.args';

/**
 * MktCustomerPurchaseHistoryService
 *
 * Service for fetching customer purchase history
 * Uses existing MktOrderRepository from OrderModule
 */
@Injectable()
export class MktCustomerPurchaseHistoryService {
  private readonly logger = new Logger(MktCustomerPurchaseHistoryService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly customerRepository: MktCustomerRepository,
  ) {}

  /**
   * Get purchase history for a customer with pagination and filters
   */
  async getPurchaseHistory(
    args: GetPurchaseHistoryArgs,
    _workspaceId: string,
  ): Promise<PurchaseHistoryOutput> {
    const {
      customerId,
      take = 20,
      skip = 0,
      status,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = args;

    this.logger.debug(`Getting purchase history for customer: ${customerId}`);

    // 1. Verify customer exists
    const customer = await this.customerRepository.findByIdOrNull(customerId);

    if (!customer) {
      throw new NotFoundException(
        CUSTOMER_MESSAGES.ERROR.CUSTOMER_NOT_FOUND(customerId),
      );
    }

    // 2. Get orders using existing repository method
    const allOrders = await this.orderRepository.findByCustomerId(customerId, {
      relations: { orderItems: true },
    });

    // 3. Apply filters
    let filteredOrders = allOrders.filter((o) => !o.deletedAt);

    if (status) {
      filteredOrders = filteredOrders.filter((o) => o.status === status);
    }

    if (paymentStatus) {
      filteredOrders = filteredOrders.filter(
        (o) => o.paymentStatus === paymentStatus,
      );
    }

    // 4. Sort orders
    filteredOrders = this.sortOrders(filteredOrders, sortBy, sortOrder);

    // 5. Pagination
    const totalCount = filteredOrders.length;
    const paginatedOrders = filteredOrders.slice(skip, skip + take);

    // 6. Get summary using existing repository method
    const stats = await this.orderRepository.getCustomerOrderStats(customerId);

    this.logger.debug(
      `Found ${totalCount} orders for customer ${customerId}, returning ${paginatedOrders.length}`,
    );

    // 7. Map to output
    return {
      orders: paginatedOrders.map((order) => this.mapOrderToOutput(order)),
      summary: {
        totalOrders: stats.orderCount,
        totalSpent: stats.totalValue,
        averageOrderValue:
          stats.orderCount > 0
            ? MoneyUtils.divideSafe(
                stats.totalValue,
                stats.orderCount,
              ).toNumber()
            : 0,
        firstPurchaseDate: stats.firstOrderDate ?? undefined,
        lastPurchaseDate: stats.lastOrderDate ?? undefined,
      },
      pagination: {
        take,
        skip,
        totalCount,
        hasMore: skip + take < totalCount,
      },
    };
  }

  /**
   * Sort orders by field and direction
   */
  private sortOrders(
    orders: MktOrderWorkspaceEntity[],
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
  ): MktOrderWorkspaceEntity[] {
    const multiplier = sortOrder === 'DESC' ? -1 : 1;

    return [...orders].sort((a, b) => {
      switch (sortBy) {
        case 'totalAmount':
          return ((a.totalAmount ?? 0) - (b.totalAmount ?? 0)) * multiplier;
        case 'orderCode':
          return (
            (a.orderCode ?? '').localeCompare(b.orderCode ?? '') * multiplier
          );
        case 'createdAt':
        default:
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            multiplier
          );
      }
    });
  }

  /**
   * Map order entity to output DTO
   */
  private mapOrderToOutput(
    order: MktOrderWorkspaceEntity,
  ): PurchaseOrderOutput {
    return {
      id: order.id,
      orderCode: order.orderCode ?? '',
      name: order.name,
      status: order.status ?? undefined,
      paymentStatus: order.paymentStatus ?? undefined,
      totalAmount: order.totalAmount ?? 0,
      paidAmount: order.paidAmount ?? 0,
      remainingAmount: order.remainingAmount ?? 0,
      discount: order.discount ?? undefined,
      tax: order.tax ?? undefined,
      subtotal: order.subtotal ?? undefined,
      currency: order.currency,
      createdAt: this.dateToISOString(order.createdAt),
      updatedAt: order.updatedAt
        ? this.dateToISOString(order.updatedAt)
        : undefined,
      items: this.mapOrderItems(order.orderItems),
    };
  }

  /**
   * Map order items to output DTOs
   */
  private mapOrderItems(
    items: MktOrderItemWorkspaceEntity[] | undefined,
  ): PurchaseOrderItemOutput[] {
    if (!items || items.length === 0) {
      return [];
    }

    return items.map((item) => ({
      id: item.id,
      snapshotProductName: item.snapshotProductName ?? undefined,
      snapshotPackageName: item.snapshotPackageName ?? undefined,
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? 0,
      totalPrice: item.totalPrice ?? 0,
      itemType: item.itemType ?? undefined,
    }));
  }

  /**
   * Convert Date to ISO string using DateTimeUtils
   */
  private dateToISOString(date: Date | string): string {
    if (typeof date === 'string') {
      return date;
    }

    return DateTimeUtils.toISO(DateTimeUtils.fromDate(date));
  }
}
