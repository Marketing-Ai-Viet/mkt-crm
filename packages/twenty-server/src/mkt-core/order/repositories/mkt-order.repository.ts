import { Injectable, Logger } from '@nestjs/common';

import { FindOptionsWhere, QueryRunner } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import {
  MKT_ORDER_LOG_CONTEXT,
  MKT_ORDER_LOG_MESSAGES,
} from 'src/mkt-core/order/messages';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  CreateOrderData,
  DEFAULT_ORDER_RELATIONS,
  FindOrderOptions,
  PAYMENT_SUMMARY_RELATIONS,
  UpdateOrderData,
  UpdatePaymentAmountsData,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktOrderRepository - Data access layer for Order entity
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
export class MktOrderRepository {
  private readonly logger = new Logger(`${MKT_ORDER_LOG_CONTEXT}:Repository`);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find order by ID
   */
  async findById(
    workspaceId: string,
    orderId: string,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity | null> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_ID_START(orderId));

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.findById(workspaceId, orderId, {
      relations: DEFAULT_ORDER_RELATIONS,
    });
  }

  /**
   * Find order by ID with payment relations
   * Used for payment summary calculations
   */
  async findByIdWithPaymentSummary(
    workspaceId: string,
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    this.logger.debug(
      `Finding order ${orderId} with payment summary relations`,
    );

    return this.findById(workspaceId, orderId, {
      relations: PAYMENT_SUMMARY_RELATIONS,
    });
  }

  /**
   * Find order by order code
   */
  async findByOrderCode(
    workspaceId: string,
    orderCode: string,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity | null> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_CODE_START(orderCode));

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    customerId: string,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity[]> {
    this.logger.debug(
      MKT_ORDER_LOG_MESSAGES.FIND_BY_CUSTOMER_START(customerId),
    );

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    status: ORDER_STATUS,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity[]> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.FIND_BY_STATUS_START(status));

    const repository = await this.getRepository(workspaceId);

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
   * Find orders with custom where clause
   */
  async findMany(
    workspaceId: string,
    where: FindOptionsWhere<MktOrderWorkspaceEntity>,
    options?: FindOrderOptions,
  ): Promise<MktOrderWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where,
      relations: options?.relations,
    });
  }

  /**
   * Check if order exists
   */
  async exists(workspaceId: string, orderId: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { id: orderId },
    });

    return count > 0;
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new order
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async create(
    workspaceId: string,
    data: CreateOrderData,
    _queryRunner?: QueryRunner,
  ): Promise<MktOrderWorkspaceEntity> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

    const order = repository.create({
      ...data,
      status: data.status ?? ORDER_STATUS.DRAFT,
      currency: data.currency ?? 'VND',
    });

    // Always use repository.save() - queryRunner.manager doesn't have workspace entity metadata
    const savedOrder = await repository.save(order);

    this.logger.debug(MKT_ORDER_LOG_MESSAGES.CREATE_SUCCESS(savedOrder.id));

    return savedOrder;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update order by ID
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async update(
    workspaceId: string,
    orderId: string,
    data: UpdateOrderData,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.UPDATE_START(orderId));

    const repository = await this.getRepository(workspaceId);

    // Always use repository.update() - queryRunner.manager doesn't have workspace entity metadata
    await repository.update(orderId, data);

    this.logger.debug(MKT_ORDER_LOG_MESSAGES.UPDATE_SUCCESS(orderId));
  }

  /**
   * Update order status
   */
  async updateStatus(
    workspaceId: string,
    orderId: string,
    status: ORDER_STATUS,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(
      MKT_ORDER_LOG_MESSAGES.STATUS_UPDATE_START(orderId, status),
    );

    await this.update(workspaceId, orderId, { status }, queryRunner);

    this.logger.debug(
      MKT_ORDER_LOG_MESSAGES.STATUS_UPDATE_SUCCESS(orderId, status),
    );
  }

  /**
   * Update and return the updated order
   */
  async updateAndReturn(
    workspaceId: string,
    orderId: string,
    data: UpdateOrderData,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderWorkspaceEntity | null> {
    await this.update(workspaceId, orderId, data, queryRunner);

    return this.findById(workspaceId, orderId);
  }

  /**
   * Update payment amounts for an order
   * Used when payment status changes (new payment, refund, etc.)
   *
   * @param workspaceId - Workspace ID
   * @param orderId - Order ID
   * @param data - Payment amounts data (paidAmount, remainingAmount, paymentStatus)
   */
  async updatePaymentAmounts(
    workspaceId: string,
    orderId: string,
    data: UpdatePaymentAmountsData,
  ): Promise<void> {
    this.logger.debug(
      `Updating payment amounts for order ${orderId}: ` +
        `paid=${data.paidAmount}, remaining=${data.remainingAmount}, status=${data.paymentStatus}`,
    );

    const repository = await this.getRepository(workspaceId);

    await repository.update(orderId, {
      paidAmount: data.paidAmount,
      remainingAmount: data.remainingAmount,
      paymentStatus: data.paymentStatus,
      updatedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    this.logger.debug(`Payment amounts updated for order ${orderId}`);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete order by setting deletedAt timestamp
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async softDelete(
    workspaceId: string,
    orderId: string,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(MKT_ORDER_LOG_MESSAGES.DELETE_START(orderId));

    const repository = await this.getRepository(workspaceId);

    await repository.update(orderId, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    this.logger.warn(MKT_ORDER_LOG_MESSAGES.DELETE_SUCCESS(orderId));
  }

  // ============================================
  // AGGREGATION OPERATIONS
  // ============================================

  /**
   * Get order statistics aggregated by customer IDs
   * Single query with GROUP BY to avoid N+1 problem
   *
   * @param workspaceId - Workspace ID
   * @param customerIds - Array of customer IDs to aggregate
   * @returns Array of { customerId, orderCount, totalValue }
   */
  async getOrderStatsByCustomers(
    workspaceId: string,
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

    const repository = await this.getRepository(workspaceId);

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
   * @param workspaceId - Workspace ID
   * @param customerId - Customer ID
   * @returns Order statistics including counts, totals, and dates
   */
  async getCustomerOrderStats(
    workspaceId: string,
    customerId: string,
  ): Promise<{
    orderCount: number;
    totalValue: number;
    firstOrderDate: string | null;
    lastOrderDate: string | null;
    averageOrderInterval: number;
  }> {
    const repository = await this.getRepository(workspaceId);

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
      const firstDate = new Date(result.firstOrderDate);
      const lastDate = new Date(result.lastOrderDate);
      const totalDays = Math.ceil(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      averageOrderInterval = Math.round(totalDays / (orderCount - 1));
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
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get completed order statistics aggregated by customer IDs
   * Single query with GROUP BY to avoid N+1 problem
   * Only counts orders with COMPLETED status for tier calculation
   *
   * @param workspaceId - Workspace ID
   * @param customerIds - Array of customer IDs to aggregate
   * @param completedStatuses - Array of order statuses to count (default: ['COMPLETED'])
   * @returns Array of { customerId, orderCount, totalValue }
   */
  async getCompletedOrderStatsByCustomers(
    workspaceId: string,
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

    const repository = await this.getRepository(workspaceId);

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

  /**
   * Get the underlying TypeORM repository
   * Useful for complex queries not covered by this repository
   */
  async getRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktOrderWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktOrderWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
