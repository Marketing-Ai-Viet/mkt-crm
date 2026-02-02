/**
 * Order Repository Adapter
 *
 * Implements IOrderRepositoryPort by wrapping MktOrderRepository.
 * Converts between MktOrderWorkspaceEntity and OrderForMatching.
 */

import { Injectable } from '@nestjs/common';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderRepository } from 'src/mkt-core/order/repositories';
import {
  IOrderRepositoryPort,
  OrderForMatching,
  OrderCandidateFilter,
} from 'src/mkt-core/payment/domain/ports';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

@Injectable()
export class OrderRepositoryAdapter implements IOrderRepositoryPort {
  constructor(private readonly orderRepository: MktOrderRepository) {}

  /**
   * Find order by ID
   */
  async findById(orderId: string): Promise<OrderForMatching | null> {
    const order = await this.orderRepository.findByIdWithOptions(orderId);

    if (!order) {
      return null;
    }

    return this.toOrderForMatching(order);
  }

  /**
   * Find order by order code
   */
  async findByOrderCode(orderCode: string): Promise<OrderForMatching | null> {
    const order = await this.orderRepository.findByOrderCode(orderCode);

    if (!order) {
      return null;
    }

    return this.toOrderForMatching(order);
  }

  /**
   * Find candidate orders for fuzzy matching
   */
  async findCandidates(
    filter: OrderCandidateFilter,
  ): Promise<OrderForMatching[]> {
    const repository = await this.orderRepository.getRepository();

    const qb = repository.createQueryBuilder('order');

    // Filter by status
    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];

      qb.andWhere('order.status IN (:...statuses)', { statuses });
    } else {
      // Default: only PROCESSING orders for matching
      qb.andWhere('order.status = :status', {
        status: ORDER_STATUS.PROCESSING,
      });
    }

    // Filter by creation date
    if (filter.createdWithinDays) {
      const minDate = DateTimeUtils.subtract(DateTimeUtils.now(), {
        days: filter.createdWithinDays,
      });

      qb.andWhere('order.createdAt >= :minDate', {
        minDate: DateTimeUtils.toMillis(minDate),
      });
    }

    // Filter by amount range
    if (filter.amountRange) {
      qb.andWhere('order.totalAmount >= :minAmount', {
        minAmount: filter.amountRange.min,
      });
      qb.andWhere('order.totalAmount <= :maxAmount', {
        maxAmount: filter.amountRange.max,
      });
    }

    // Limit results
    if (filter.limit) {
      qb.limit(filter.limit);
    }

    // Order by created date descending (most recent first)
    qb.orderBy('order.createdAt', 'DESC');

    const orders = await qb.getMany();

    return orders.map((order) => this.toOrderForMatching(order));
  }

  /**
   * Convert MktOrderWorkspaceEntity to OrderForMatching
   */
  private toOrderForMatching(order: {
    id: string;
    orderCode: string;
    totalAmount?: number | null;
    status?: string | null;
    createdAt: Date | string;
    mktCustomer?: { name?: string } | null;
  }): OrderForMatching {
    return {
      id: order.id,
      orderCode: order.orderCode,
      totalAmount: order.totalAmount ?? 0,
      status: order.status ?? '',
      customerName: order.mktCustomer?.name,
      createdAt:
        order.createdAt instanceof Date
          ? order.createdAt
          : new Date(order.createdAt),
    };
  }
}
