import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

/**
 * Pure CRUD service cho Order và OrderItem
 * Không chứa business logic, chỉ thực hiện các operations cơ bản
 */
@Injectable()
export class OrderCrudService {
  private readonly logger = new Logger(OrderCrudService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  // ============================================
  // ORDER CRUD OPERATIONS
  // ============================================

  /**
   * Tạo order mới
   */
  async createOrder(
    workspaceId: string,
    data: Partial<MktOrderWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderWorkspaceEntity> {
    const repository = await this.getOrderRepository(workspaceId);

    const order = repository.create({
      ...data,
      status: data.status ?? ORDER_STATUS.DRAFT,
      currency: data.currency ?? 'VND',
    });

    if (queryRunner) {
      return queryRunner.manager.save(order);
    }

    return repository.save(order);
  }

  /**
   * Tìm order theo ID
   */
  async findOrderById(
    workspaceId: string,
    orderId: string,
    relations?: string[],
  ): Promise<MktOrderWorkspaceEntity | null> {
    const repository = await this.getOrderRepository(workspaceId);

    return repository.findOne({
      where: { id: orderId },
      relations,
    });
  }

  /**
   * Tìm order với đầy đủ relations
   */
  async findOrderWithRelations(
    workspaceId: string,
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    const repository = await this.getOrderRepository(workspaceId);

    return repository.findOne({
      where: { id: orderId },
      relations: [
        'orderItems',
        'mktCustomer',
        'mktPayments',
        'mktLicense',
        'mktContract',
      ],
    });
  }

  /**
   * Update order
   */
  async updateOrder(
    workspaceId: string,
    orderId: string,
    data: Partial<MktOrderWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getOrderRepository(workspaceId);

    if (queryRunner) {
      await queryRunner.manager.update(
        MktOrderWorkspaceEntity,
        { id: orderId },
        data,
      );

      return;
    }

    await repository.update(orderId, data);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    workspaceId: string,
    orderId: string,
    status: ORDER_STATUS,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.updateOrder(workspaceId, orderId, { status }, queryRunner);
  }

  /**
   * Hard delete order (dùng trong compensate)
   */
  async hardDeleteOrder(
    workspaceId: string,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getOrderRepository(workspaceId);

    this.logger.warn(`Hard deleting order: ${orderId}`);

    if (queryRunner) {
      await queryRunner.manager.delete(MktOrderWorkspaceEntity, {
        id: orderId,
      });

      return;
    }

    await repository.delete(orderId);
  }

  // ============================================
  // ORDER ITEM CRUD OPERATIONS
  // ============================================

  /**
   * Tạo order item
   */
  async createOrderItem(
    workspaceId: string,
    data: Partial<MktOrderItemWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderItemWorkspaceEntity> {
    const repository = await this.getOrderItemRepository(workspaceId);

    const orderItem = repository.create(data);

    if (queryRunner) {
      return queryRunner.manager.save(orderItem);
    }

    return repository.save(orderItem);
  }

  /**
   * Tạo nhiều order items
   */
  async createOrderItems(
    workspaceId: string,
    items: Partial<MktOrderItemWorkspaceEntity>[],
    queryRunner?: QueryRunner,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    const repository = await this.getOrderItemRepository(workspaceId);

    const orderItems = items.map((item) => repository.create(item));

    if (queryRunner) {
      return queryRunner.manager.save(orderItems);
    }

    return repository.save(orderItems);
  }

  /**
   * Tìm order items theo order ID
   */
  async findOrderItemsByOrderId(
    workspaceId: string,
    orderId: string,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    const repository = await this.getOrderItemRepository(workspaceId);

    return repository.find({
      where: { mktOrderId: orderId },
    });
  }

  /**
   * Hard delete order items (dùng trong compensate)
   */
  async hardDeleteOrderItems(
    workspaceId: string,
    orderItemIds: string[],
    queryRunner?: QueryRunner,
  ): Promise<void> {
    if (orderItemIds.length === 0) return;

    const repository = await this.getOrderItemRepository(workspaceId);

    this.logger.warn(`Hard deleting order items: ${orderItemIds.join(', ')}`);

    if (queryRunner) {
      await queryRunner.manager.delete(
        MktOrderItemWorkspaceEntity,
        orderItemIds,
      );

      return;
    }

    await repository.delete(orderItemIds);
  }

  /**
   * Hard delete order items theo order ID
   */
  async hardDeleteOrderItemsByOrderId(
    workspaceId: string,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getOrderItemRepository(workspaceId);

    this.logger.warn(`Hard deleting order items for order: ${orderId}`);

    if (queryRunner) {
      await queryRunner.manager.delete(MktOrderItemWorkspaceEntity, {
        mktOrderId: orderId,
      });

      return;
    }

    await repository.delete({ mktOrderId: orderId });
  }

  // ============================================
  // REPOSITORY GETTERS
  // ============================================

  private async getOrderRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktOrderWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktOrderWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  private async getOrderItemRepository(
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktOrderItemWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktOrderItemWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
