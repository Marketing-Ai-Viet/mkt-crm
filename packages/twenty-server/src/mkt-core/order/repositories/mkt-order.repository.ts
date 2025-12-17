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
  UpdateOrderData,
} from 'src/mkt-core/order/types';

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
   */
  async create(
    workspaceId: string,
    data: CreateOrderData,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderWorkspaceEntity> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

    const order = repository.create({
      ...data,
      status: data.status ?? ORDER_STATUS.DRAFT,
      currency: data.currency ?? 'VND',
    });

    let savedOrder: MktOrderWorkspaceEntity;

    if (queryRunner) {
      savedOrder = await queryRunner.manager.save(order);
    } else {
      savedOrder = await repository.save(order);
    }

    this.logger.debug(MKT_ORDER_LOG_MESSAGES.CREATE_SUCCESS(savedOrder.id));

    return savedOrder;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update order by ID
   */
  async update(
    workspaceId: string,
    orderId: string,
    data: UpdateOrderData,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(MKT_ORDER_LOG_MESSAGES.UPDATE_START(orderId));

    const repository = await this.getRepository(workspaceId);

    if (queryRunner) {
      await queryRunner.manager.update(
        MktOrderWorkspaceEntity,
        { id: orderId },
        data,
      );
    } else {
      await repository.update(orderId, data);
    }

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

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Hard delete order (use with caution)
   */
  async hardDelete(
    workspaceId: string,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(MKT_ORDER_LOG_MESSAGES.DELETE_START(orderId));

    const repository = await this.getRepository(workspaceId);

    if (queryRunner) {
      await queryRunner.manager.delete(MktOrderWorkspaceEntity, {
        id: orderId,
      });
    } else {
      await repository.delete(orderId);
    }

    this.logger.warn(MKT_ORDER_LOG_MESSAGES.DELETE_SUCCESS(orderId));
  }

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

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
