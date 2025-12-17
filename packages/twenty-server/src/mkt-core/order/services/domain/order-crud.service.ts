import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';
import {
  MktOrderRepository,
  MktOrderItemRepository,
} from 'src/mkt-core/order/repositories';

/**
 * OrderCrudService - Domain service for Order and OrderItem operations
 *
 * This service delegates data access to repositories and provides
 * a clean interface for domain operations.
 *
 * Responsibilities:
 * - Coordinate repository operations
 * - Provide domain-level abstractions
 *
 * Does NOT handle:
 * - Business logic validation (handled by OrderValidationService)
 * - Status transitions (handled by OrderStatusService)
 * - Event emission (handled by OrderEventService)
 */
@Injectable()
export class OrderCrudService {
  private readonly logger = new Logger(OrderCrudService.name);

  constructor(
    private readonly orderRepository: MktOrderRepository,
    private readonly orderItemRepository: MktOrderItemRepository,
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
    return this.orderRepository.create(workspaceId, data, queryRunner);
  }

  /**
   * Tìm order theo ID
   */
  async findOrderById(
    workspaceId: string,
    orderId: string,
    relations?: string[],
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.findById(workspaceId, orderId, {
      relations: relations as never,
    });
  }

  /**
   * Tìm order với đầy đủ relations
   */
  async findOrderWithRelations(
    workspaceId: string,
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.findByIdWithRelations(workspaceId, orderId);
  }

  /**
   * Tìm order theo order code
   */
  async findOrderByCode(
    workspaceId: string,
    orderCode: string,
    relations?: string[],
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.findByOrderCode(workspaceId, orderCode, {
      relations: relations as never,
    });
  }

  /**
   * Tìm orders theo customer ID
   */
  async findOrdersByCustomerId(
    workspaceId: string,
    customerId: string,
    relations?: string[],
  ): Promise<MktOrderWorkspaceEntity[]> {
    return this.orderRepository.findByCustomerId(workspaceId, customerId, {
      relations: relations as never,
    });
  }

  /**
   * Tìm orders theo status
   */
  async findOrdersByStatus(
    workspaceId: string,
    status: ORDER_STATUS,
    relations?: string[],
  ): Promise<MktOrderWorkspaceEntity[]> {
    return this.orderRepository.findByStatus(workspaceId, status, {
      relations: relations as never,
    });
  }

  /**
   * Kiểm tra order tồn tại
   */
  async orderExists(workspaceId: string, orderId: string): Promise<boolean> {
    return this.orderRepository.exists(workspaceId, orderId);
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
    await this.orderRepository.update(workspaceId, orderId, data, queryRunner);
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
    await this.orderRepository.updateStatus(
      workspaceId,
      orderId,
      status,
      queryRunner,
    );
  }

  /**
   * Update order và trả về order đã update
   */
  async updateOrderAndReturn(
    workspaceId: string,
    orderId: string,
    data: Partial<MktOrderWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.updateAndReturn(
      workspaceId,
      orderId,
      data,
      queryRunner,
    );
  }

  /**
   * Hard delete order (dùng trong compensate)
   */
  async hardDeleteOrder(
    workspaceId: string,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(`Hard deleting order: ${orderId}`);
    await this.orderRepository.hardDelete(workspaceId, orderId, queryRunner);
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
    return this.orderItemRepository.create(workspaceId, data, queryRunner);
  }

  /**
   * Tạo nhiều order items
   */
  async createOrderItems(
    workspaceId: string,
    items: Partial<MktOrderItemWorkspaceEntity>[],
    queryRunner?: QueryRunner,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.createMany(workspaceId, items, queryRunner);
  }

  /**
   * Tìm order item theo ID
   */
  async findOrderItemById(
    workspaceId: string,
    itemId: string,
    relations?: string[],
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.orderItemRepository.findById(workspaceId, itemId, {
      relations: relations as never,
    });
  }

  /**
   * Tìm order item với đầy đủ relations
   */
  async findOrderItemWithRelations(
    workspaceId: string,
    itemId: string,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.orderItemRepository.findByIdWithRelations(workspaceId, itemId);
  }

  /**
   * Tìm order items theo order ID
   */
  async findOrderItemsByOrderId(
    workspaceId: string,
    orderId: string,
    relations?: string[],
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.findByOrderId(workspaceId, orderId, {
      relations: relations as never,
    });
  }

  /**
   * Tìm order items theo external product ID
   */
  async findOrderItemsByExternalProductId(
    workspaceId: string,
    externalProductId: string,
    relations?: string[],
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.findByExternalProductId(
      workspaceId,
      externalProductId,
      { relations: relations as never },
    );
  }

  /**
   * Tìm order items theo variant ID
   */
  async findOrderItemsByVariantId(
    workspaceId: string,
    variantId: string,
    relations?: string[],
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.findByVariantId(workspaceId, variantId, {
      relations: relations as never,
    });
  }

  /**
   * Kiểm tra order item tồn tại
   */
  async orderItemExists(workspaceId: string, itemId: string): Promise<boolean> {
    return this.orderItemRepository.exists(workspaceId, itemId);
  }

  /**
   * Đếm order items trong order
   */
  async countOrderItems(workspaceId: string, orderId: string): Promise<number> {
    return this.orderItemRepository.countByOrderId(workspaceId, orderId);
  }

  /**
   * Update order item
   */
  async updateOrderItem(
    workspaceId: string,
    itemId: string,
    data: Partial<MktOrderItemWorkspaceEntity>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    await this.orderItemRepository.update(
      workspaceId,
      itemId,
      data,
      queryRunner,
    );
  }

  /**
   * Update order item và trả về item đã update
   */
  async updateOrderItemAndReturn(
    workspaceId: string,
    itemId: string,
    data: Partial<MktOrderItemWorkspaceEntity>,
    relations?: string[],
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.orderItemRepository.updateAndReturn(workspaceId, itemId, data, {
      relations: relations as never,
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
    if (orderItemIds.length === 0) {
      return;
    }

    this.logger.warn(`Hard deleting order items: ${orderItemIds.join(', ')}`);
    await this.orderItemRepository.hardDeleteMany(
      workspaceId,
      orderItemIds,
      queryRunner,
    );
  }

  /**
   * Hard delete order items theo order ID
   */
  async hardDeleteOrderItemsByOrderId(
    workspaceId: string,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(`Hard deleting order items for order: ${orderId}`);
    await this.orderItemRepository.hardDeleteByOrderId(
      workspaceId,
      orderId,
      queryRunner,
    );
  }

  // ============================================
  // REPOSITORY ACCESS (for complex queries)
  // ============================================

  /**
   * Get order repository for complex queries
   */
  getOrderRepository() {
    return this.orderRepository;
  }

  /**
   * Get order item repository for complex queries
   */
  getOrderItemRepository() {
    return this.orderItemRepository;
  }
}
