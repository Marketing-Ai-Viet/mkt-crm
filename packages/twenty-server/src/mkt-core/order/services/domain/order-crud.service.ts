import { Injectable, Logger } from '@nestjs/common';

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
   * Tao order moi
   */
  async createOrder(
    data: Partial<MktOrderWorkspaceEntity>,
  ): Promise<MktOrderWorkspaceEntity> {
    return this.orderRepository.createOrder(data);
  }

  /**
   * Tim order theo ID
   */
  async findOrderById(
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.findById(orderId);
  }

  /**
   * Tim order voi day du relations
   */
  async findOrderWithRelations(
    orderId: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.findByIdWithRelations(orderId);
  }

  /**
   * Tim order theo order code
   */
  async findOrderByCode(
    orderCode: string,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.findByOrderCode(orderCode);
  }

  /**
   * Tim orders theo customer ID
   */
  async findOrdersByCustomerId(
    customerId: string,
  ): Promise<MktOrderWorkspaceEntity[]> {
    return this.orderRepository.findByCustomerId(customerId);
  }

  /**
   * Tim orders theo status
   */
  async findOrdersByStatus(
    status: ORDER_STATUS,
  ): Promise<MktOrderWorkspaceEntity[]> {
    return this.orderRepository.findByStatus(status);
  }

  /**
   * Kiem tra order ton tai
   */
  async orderExists(orderId: string): Promise<boolean> {
    const order = await this.orderRepository.findById(orderId);

    return order !== null;
  }

  /**
   * Update order
   */
  async updateOrder(
    orderId: string,
    data: Partial<MktOrderWorkspaceEntity>,
  ): Promise<void> {
    await this.orderRepository.updateOrder(orderId, data);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: ORDER_STATUS,
  ): Promise<void> {
    await this.orderRepository.updateStatus(orderId, status);
  }

  /**
   * Update order va tra ve order da update
   */
  async updateOrderAndReturn(
    orderId: string,
    data: Partial<MktOrderWorkspaceEntity>,
  ): Promise<MktOrderWorkspaceEntity | null> {
    return this.orderRepository.updateOrderAndReturn(orderId, data);
  }

  /**
   * Hard delete order (dung trong compensate)
   */
  async hardDeleteOrder(orderId: string): Promise<void> {
    this.logger.warn(`Hard deleting order: ${orderId}`);
    await this.orderRepository.softDeleteOrder(orderId);
  }

  // ============================================
  // ORDER ITEM CRUD OPERATIONS
  // ============================================

  /**
   * Tao order item
   */
  async createOrderItem(
    data: Partial<MktOrderItemWorkspaceEntity>,
  ): Promise<MktOrderItemWorkspaceEntity> {
    return this.orderItemRepository.createOrderItem(data);
  }

  /**
   * Tao nhieu order items
   */
  async createOrderItems(
    items: Partial<MktOrderItemWorkspaceEntity>[],
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.createManyOrderItems(items);
  }

  /**
   * Tim order item theo ID
   */
  async findOrderItemById(
    itemId: string,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.orderItemRepository.findByIdWithOptions(itemId);
  }

  /**
   * Tim order item voi day du relations
   */
  async findOrderItemWithRelations(
    itemId: string,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.orderItemRepository.findByIdWithRelations(itemId);
  }

  /**
   * Tim order items theo order ID
   */
  async findOrderItemsByOrderId(
    orderId: string,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.findByOrderId(orderId);
  }

  /**
   * Tim order items theo external product ID
   */
  async findOrderItemsByExternalProductId(
    externalProductId: string,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.findByExternalProductId(externalProductId);
  }

  /**
   * Tim order items theo variant ID
   * @deprecated Variant module has been removed
   */
  async findOrderItemsByVariantId(
    variantId: string,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    return this.orderItemRepository.findByVariantId(variantId);
  }

  /**
   * Kiem tra order item ton tai
   */
  async orderItemExists(itemId: string): Promise<boolean> {
    const item = await this.orderItemRepository.findByIdWithOptions(itemId);

    return item !== null;
  }

  /**
   * Dem order items trong order
   */
  async countOrderItems(orderId: string): Promise<number> {
    return this.orderItemRepository.countByOrderId(orderId);
  }

  /**
   * Update order item
   */
  async updateOrderItem(
    itemId: string,
    data: Partial<MktOrderItemWorkspaceEntity>,
  ): Promise<void> {
    await this.orderItemRepository.updateOrderItem(itemId, data);
  }

  /**
   * Update order item va tra ve item da update
   */
  async updateOrderItemAndReturn(
    itemId: string,
    data: Partial<MktOrderItemWorkspaceEntity>,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.orderItemRepository.updateAndReturnWithOptions(itemId, data);
  }

  /**
   * Hard delete order items (dung trong compensate)
   */
  async hardDeleteOrderItems(orderItemIds: string[]): Promise<void> {
    if (orderItemIds.length === 0) {
      return;
    }

    this.logger.warn(`Hard deleting order items: ${orderItemIds.join(', ')}`);
    await this.orderItemRepository.softDeleteManyOrderItems(orderItemIds);
  }

  /**
   * Hard delete order items theo order ID
   */
  async hardDeleteOrderItemsByOrderId(orderId: string): Promise<void> {
    this.logger.warn(`Hard deleting order items for order: ${orderId}`);
    await this.orderItemRepository.softDeleteByOrderId(orderId);
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
