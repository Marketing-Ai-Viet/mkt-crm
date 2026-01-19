import { Injectable } from '@nestjs/common';

import { DeepPartial, FindOptionsWhere } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import {
  MKT_ORDER_LOG_CONTEXT,
  MKT_ORDER_LOG_MESSAGES,
} from 'src/mkt-core/order/messages';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  DEFAULT_ORDER_RELATIONS,
  FindOrderOptions,
  PAYMENT_SUMMARY_RELATIONS,
  UpdatePaymentAmountsData,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktOrderRepository - Data access layer for Order entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktOrder entity
 * - Query building and execution
 * - Transaction support via QueryRunner
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Service layer)
 */
@Injectable()
export class MktOrderRepository extends BaseWorkspaceRepository<MktOrderWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktOrderWorkspaceEntity,
      `${MKT_ORDER_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find order by ID with options (logging included)
   */
  async findByIdWithOptions(
    orderId: string,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity | null> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_ID_START(orderId));

    const repository = await this.getRepository();

    const order = await repository.findOne({
      where: { id: orderId },
      relations: options?.relations,
    });

    if (!order) {
      this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_ID_NOT_FOUND(orderId));

      return null;
    }

    this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_ID_SUCCESS(orderId));

    return order;
  }

  /**
   * Find order by ID with full relations
   */
  async findByIdWithRelations(
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.findByIdWithOptions(orderId, {
      relations: DEFAULT_ORDER_RELATIONS,
    });
  }

  /**
   * Find order by ID with payment relations
   * Used for payment summary calculations
   */
  async findByIdWithPaymentSummary(
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    this.logger.debug(
      `Finding order ${orderId} with payment summary relations`,
    );

    return this.findByIdWithOptions(orderId, {
      relations: PAYMENT_SUMMARY_RELATIONS,
    });
  }

  /**
   * Find order by order code
   */
  async findByOrderCode(
    orderCode: string,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity | null> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_CODE_START(orderCode));

    const repository = await this.getRepository();

    const order = await repository.findOne({
      where: { orderCode },
      relations: options?.relations,
    });

    if (!order) {
      this.logger.debug(
        MKT_ORDER_LOG_MESSAGES.FIND_BY_CODE_NOT_FOUND(orderCode),
      );

      return null;
    }

    this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_CODE_SUCCESS(orderCode));

    return order;
  }

  /**
   * Find orders by customer ID
   */
  async findByCustomerId(
    customerId: string,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity[]> {
    this.logger.debug(
      MKT_ORDER_LOG_MESSAGES.FIND_BY_CUSTOMER_START(customerId),
    );

    const repository = await this.getRepository();

    const orders = await repository.find({
      where: { mktCustomerId: customerId },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });

    this.logger.debug(
      MKT_ORDER_LOG_MESSAGES.FIND_BY_CUSTOMER_SUCCESS(
        customerId,
        orders.length,
      ),
    );

    return orders;
  }

  /**
   * Find orders by status
   */
  async findByStatus(
    status: ORDER_STATUS,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity[]> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_STATUS_START(status));

    const repository = await this.getRepository();

    const orders = await repository.find({
      where: { status },
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });

    this.logger.debug(
      MKT_ORDER_LOG_MESSAGES.FIND_BY_STATUS_SUCCESS(status, orders.length),
    );

    return orders;
  }

  /**
   * Find orders with custom where clause and options
   */
  async findManyWithOptions(
    where: FindOptionsWhere<MktOrderWorkspaceEntity>,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where,
      relations: options?.relations,
    });
  }

  /**
   * Find single order with dynamic where clause (supports AND/OR conditions)
   * Used by custom resolvers with hierarchical access filtering
   *
   * @param where - TypeORM where clause (single object or array for OR)
   * @param options - Find options
   */
  async findOneWithWhere(
    where:
      | FindOptionsWhere<MktOrderWorkspaceEntity>
      | FindOptionsWhere<MktOrderWorkspaceEntity>[],
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository.findOne({
      where,
      relations: options?.relations ?? DEFAULT_ORDER_RELATIONS,
    });
  }

  /**
   * Find orders with dynamic where clause (supports AND/OR conditions)
   * Used by custom resolvers with hierarchical access filtering
   *
   * @param where - TypeORM where clause (single object or array for OR)
   * @param options - Find options
   */
  async findManyWithWhere(
    where:
      | FindOptionsWhere<MktOrderWorkspaceEntity>
      | FindOptionsWhere<MktOrderWorkspaceEntity>[],
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where,
      relations: options?.relations,
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new order
   */
  async createOrder(
    data: DeepPartial<MktOrderWorkspaceEntity>,
  ): Promise<MktOrderWorkspaceEntity> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository();

    const order = repository.create({
      ...data,
      status: data.status ?? ORDER_STATUS.DRAFT,
      currency: data.currency ?? 'VND',
    });

    const savedOrder = await repository.save(order);

    this.logger.debug(MKT_ORDER_LOG_MESSAGES.CREATE_SUCCESS(savedOrder.id));

    return savedOrder;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update order by ID
   */
  async updateOrder(
    orderId: string,
    data: DeepPartial<MktOrderWorkspaceEntity>,
  ): Promise<void> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.UPDATE_START(orderId));

    const repository = await this.getRepository();

    await repository.update(orderId, data as never);

    this.logger.debug(MKT_ORDER_LOG_MESSAGES.UPDATE_SUCCESS(orderId));
  }

  /**
   * Update order status
   */
  async updateStatus(orderId: string, status: ORDER_STATUS): Promise<void> {
    this.logger.debug(
      MKT_ORDER_LOG_MESSAGES.STATUS_UPDATE_START(orderId, status),
    );

    await this.updateOrder(orderId, { status });

    this.logger.debug(
      MKT_ORDER_LOG_MESSAGES.STATUS_UPDATE_SUCCESS(orderId, status),
    );
  }

  /**
   * Update and return the updated order
   */
  async updateOrderAndReturn(
    orderId: string,
    data: DeepPartial<MktOrderWorkspaceEntity>,
  ): Promise<MktOrderWorkspaceEntity | null> {
    await this.updateOrder(orderId, data);

    return this.findByIdWithOptions(orderId);
  }

  /**
   * Update payment amounts for an order
   * Used when payment status changes (new payment, refund, etc.)
   *
   * @param orderId - Order ID
   * @param data - Payment amounts data (paidAmount, remainingAmount, paymentStatus)
   */
  async updatePaymentAmounts(
    orderId: string,
    data: UpdatePaymentAmountsData,
  ): Promise<void> {
    this.logger.debug(
      `Updating payment amounts for order ${orderId}: ` +
        `paid=${data.paidAmount}, remaining=${data.remainingAmount}, status=${data.paymentStatus}`,
    );

    const repository = await this.getRepository();

    await repository.update(orderId, {
      paidAmount: data.paidAmount,
      remainingAmount: data.remainingAmount,
      paymentStatus: data.paymentStatus,
      updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.debug(`Payment amounts updated for order ${orderId}`);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete order by setting deletedAt timestamp
   */
  async softDeleteOrder(orderId: string): Promise<void> {
    this.logger.warn(MKT_ORDER_LOG_MESSAGES.DELETE_START(orderId));

    await this.softDelete(orderId);

    this.logger.warn(MKT_ORDER_LOG_MESSAGES.DELETE_SUCCESS(orderId));
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get order statistics aggregated by customer IDs
   * Single query with GROUP BY to avoid N+1 problem
   *
   * @param customerIds - Array of customer IDs to aggregate
   * @returns Array of { customerId, orderCount, totalValue }
   */
  async getOrderStatsByCustomers(
    customerIds: string[],
  ): Promise<
    Array<{ customerId: string; orderCount: number; totalValue: number }>
  > {
    if (customerIds.length === 0) {
      return [];
    }

    this.logger.debug(
      `Fetching order stats for ${customerIds.length} customers`,
    );

    const repository = await this.getRepository();

    const stats = await repository
      .createQueryBuilder('order')
      .select('order.mktCustomerId', 'customerId')
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalValue')
      .where('order.mktCustomerId IN (:...customerIds)', { customerIds })
      .groupBy('order.mktCustomerId')
      .getRawMany();

    return stats.map((s) => ({
      customerId: s.customerId,
      orderCount: parseInt(s.orderCount, 10) || 0,
      totalValue: parseFloat(s.totalValue) || 0,
    }));
  }

  /**
   * Get order statistics for a single customer
   *
   * @param customerId - Customer ID
   * @returns Order statistics including counts, totals, and dates
   */
  async getCustomerOrderStats(customerId: string): Promise<{
    orderCount: number;
    totalValue: number;
    firstOrderDate: string | null;
    lastOrderDate: string | null;
    averageOrderInterval: number;
  }> {
    const repository = await this.getRepository();

    const result = await repository
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'orderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalValue')
      .addSelect('MIN(order.createdAt)', 'firstOrderDate')
      .addSelect('MAX(order.createdAt)', 'lastOrderDate')
      .where('order.mktCustomerId = :customerId', { customerId })
      .getRawOne();

    const orderCount = parseInt(result?.orderCount, 10) || 0;

    // Calculate average order interval in days
    let averageOrderInterval = 0;

    if (orderCount > 1 && result?.firstOrderDate && result?.lastOrderDate) {
      // createdAt is stored as milliseconds timestamp string
      const firstMillis = parseInt(result.firstOrderDate, 10);
      const lastMillis = parseInt(result.lastOrderDate, 10);

      // Validate parsed values are valid numbers
      if (!Number.isNaN(firstMillis) && !Number.isNaN(lastMillis)) {
        const firstDateTime = DateTimeUtils.fromMillis(firstMillis);
        const lastDateTime = DateTimeUtils.fromMillis(lastMillis);
        const totalDays = DateTimeUtils.diffInDays(lastDateTime, firstDateTime);

        // Ensure totalDays is valid before division
        if (!Number.isNaN(totalDays) && totalDays >= 0) {
          averageOrderInterval = Math.round(totalDays / (orderCount - 1));
        }
      }
    }

    return {
      orderCount,
      totalValue: parseFloat(result?.totalValue) || 0,
      firstOrderDate: result?.firstOrderDate ?? null,
      lastOrderDate: result?.lastOrderDate ?? null,
      averageOrderInterval,
    };
  }

  // ============================================
  // CONDITIONAL UPDATE
  // ============================================

  /**
   * Conditional update - only updates if conditions are met
   * Returns affected row count for idempotency check
   *
   * @param where - Conditions that must be met for update
   * @param data - Data to update
   * @returns Object with affected row count
   */
  async updateOrderWhere(
    where: FindOptionsWhere<MktOrderWorkspaceEntity>,
    data: DeepPartial<MktOrderWorkspaceEntity>,
  ): Promise<{ affected: number }> {
    this.logger.debug(
      `Conditional update with where: ${JSON.stringify(where)}`,
    );

    const repository = await this.getRepository();

    const result = await repository.update(where, data as never);

    this.logger.debug(`Conditional update affected: ${result.affected ?? 0}`);

    return { affected: result.affected ?? 0 };
  }

  /**
   * Get completed order statistics aggregated by customer IDs
   * Single query with GROUP BY to avoid N+1 problem
   * Only counts orders with COMPLETED status for tier calculation
   *
   * @param customerIds - Array of customer IDs to aggregate
   * @param completedStatuses - Array of order statuses to count (default: ['COMPLETED'])
   * @returns Array of { customerId, orderCount, totalValue }
   */
  async getCompletedOrderStatsByCustomers(
    customerIds: string[],
    completedStatuses: ORDER_STATUS[] = [ORDER_STATUS.COMPLETED],
  ): Promise<
    Array<{ customerId: string; orderCount: number; totalValue: number }>
  > {
    if (customerIds.length === 0) {
      return [];
    }

    this.logger.debug(
      `Fetching completed order stats for ${customerIds.length} customers with statuses: ${completedStatuses.join(', ')}`,
    );

    const repository = await this.getRepository();

    const stats = await repository
      .createQueryBuilder('order')
      .select('order.mktCustomerId', 'customerId')
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'totalValue')
      .where('order.mktCustomerId IN (:...customerIds)', { customerIds })
      .andWhere('order.status IN (:...statuses)', {
        statuses: completedStatuses,
      })
      .groupBy('order.mktCustomerId')
      .getRawMany();

    return stats.map((s) => ({
      customerId: s.customerId,
      orderCount: parseInt(s.orderCount, 10) || 0,
      totalValue: parseFloat(s.totalValue) || 0,
    }));
  }

  // ============================================
  // PAYMENT DEADLINE OPERATIONS
  // ============================================

  /**
   * Find orders that are overdue (PROCESSING status with deadline passed)
   * Used by PaymentOverdueScanService
   */
  async findOverdueOrders(
    workspaceId: string,
    options: {
      status: ORDER_STATUS;
      paymentDeadlineBefore: Date;
    },
  ): Promise<MktOrderWorkspaceEntity[]> {
    this.logger.debug(
      `Finding overdue orders with status ${options.status} and deadline before ${options.paymentDeadlineBefore}`,
    );

    const repository = await this.getRepository();

    const orders = await repository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: options.status })
      .andWhere('order.paymentDeadline < :deadline', {
        deadline: options.paymentDeadlineBefore,
      })
      .andWhere('order.paymentDeadline IS NOT NULL')
      .orderBy('order.paymentDeadline', 'ASC')
      .getMany();

    this.logger.debug(`Found ${orders.length} overdue orders`);

    return orders;
  }

  /**
   * Get order licenses from order items
   * Returns license data from MKT Server stored in order items
   * Used by PaymentDeadlineProcessor
   */
  async getOrderLicenses(
    orderId: string,
    _workspaceId: string,
  ): Promise<Array<{ id: string; status: string }> | null> {
    this.logger.debug(`Getting licenses for order ${orderId}`);

    const order = await this.findByIdWithOptions(orderId, {
      relations: { orderItems: true },
    });

    if (!order || !order.orderItems) {
      return null;
    }

    // Extract license IDs from order items metadata
    // Order items store license info from MKT Server
    const licenses: Array<{ id: string; status: string }> = [];

    for (const item of order.orderItems) {
      // Check if item has license info in metadata or licenseId field
      const itemAny = item as unknown as Record<string, unknown>;

      if (itemAny.licenseId) {
        licenses.push({
          id: itemAny.licenseId as string,
          status: (itemAny.licenseStatus as string) ?? 'UNKNOWN',
        });
      }
    }

    this.logger.debug(`Found ${licenses.length} licenses for order ${orderId}`);

    return licenses;
  }
}
