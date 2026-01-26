import { Injectable } from '@nestjs/common';

import { DeepPartial, FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  MKT_ORDER_ITEM_LOG_CONTEXT,
  MKT_ORDER_ITEM_LOG_MESSAGES,
} from 'src/mkt-core/order/messages';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import {
  DEFAULT_ORDER_ITEM_RELATIONS,
  FindOrderItemOptions,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktOrderItemRepository - Data access layer for OrderItem entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 *
 * Responsibilities:
 * - Database operations for MktOrderItem entity
 * - Query building and execution
 * - Transaction support via QueryRunner
 * - Bulk operations for order items
 *
 * Does NOT handle:
 * - Business logic (handled by Service layer)
 * - Validation (handled by Service layer)
 * - Price calculations (handled by Service layer)
 */
@Injectable()
export class MktOrderItemRepository extends BaseWorkspaceRepository<MktOrderItemWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktOrderItemWorkspaceEntity,
      `${MKT_ORDER_ITEM_LOG_CONTEXT}:Repository`,
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find order item by ID with options (logging included)
   */
  async findByIdWithOptions(
    itemId: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_ID_START(itemId));

    const repository = await this.getRepository();

    const orderItem = await repository.findOne({
      where: { id: itemId },
      relations: options?.relations,
    });

    if (!orderItem) {
      this.logger.debug(
        MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_ID_NOT_FOUND(itemId),
      );

      return null;
    }

    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_ID_SUCCESS(itemId));

    return orderItem;
  }

  /**
   * Find order item by ID with full relations
   */
  async findByIdWithRelations(
    itemId: string,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.findByIdWithOptions(itemId, {
      relations: DEFAULT_ORDER_ITEM_RELATIONS,
    });
  }

  /**
   * Find all order items for an order
   */
  async findByOrderId(
    orderId: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_ORDER_START(orderId));

    const repository = await this.getRepository();

    const items = await repository.find({
      where: { mktOrderId: orderId },
      relations: options?.relations,
      order: { position: 'ASC' },
    });

    this.logger.debug(
      MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_ORDER_SUCCESS(orderId, items.length),
    );

    return items;
  }

  /**
   * Find order items by external product ID
   */
  async findByExternalProductId(
    externalProductId: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    this.logger.debug(
      MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_PRODUCT_START(externalProductId),
    );

    const repository = await this.getRepository();

    return repository.find({
      where: { externalMktProductId: externalProductId },
      relations: options?.relations,
    });
  }

  /**
   * Find order items by external product code
   */
  async findByExternalProductCode(
    externalProductCode: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { externalMktProductCode: externalProductCode },
      relations: options?.relations,
    });
  }

  /**
   * @deprecated Variant module has been removed. Use findByExternalProductId instead.
   * Find order items by variant ID - returns empty array as variants are removed
   */
  async findByVariantId(
    variantId: string,
    _options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    this.logger.warn(
      `findByVariantId is deprecated. Variant ${variantId} lookup returns empty.`,
    );

    return [];
  }

  /**
   * Find order items with custom where clause and options
   */
  async findManyWithOptions(
    where: FindOptionsWhere<MktOrderItemWorkspaceEntity>,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where,
      relations: options?.relations,
    });
  }

  /**
   * Count order items for an order
   */
  async countByOrderId(orderId: string): Promise<number> {
    return this.count({ mktOrderId: orderId });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new order item
   */
  async createOrderItem(
    data: DeepPartial<MktOrderItemWorkspaceEntity>,
  ): Promise<MktOrderItemWorkspaceEntity> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository();

    const orderItem = repository.create(data);

    const savedItem = await repository.save(orderItem);

    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_SUCCESS(savedItem.id));

    return savedItem;
  }

  /**
   * Create multiple order items
   *
   * @param items - Order items data to create
   * @param workspaceId - Optional workspace ID (uses scoped context if not provided)
   */
  async createManyOrderItems(
    items: DeepPartial<MktOrderItemWorkspaceEntity>[],
    workspaceId?: string,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    if (items.length === 0) {
      return [];
    }

    this.logger.debug(
      MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_BULK_START(items.length),
    );

    const repository = await this.getRepository(workspaceId);

    const orderItems = items.map((item) => repository.create(item));

    const savedItems = await repository.save(orderItems);

    this.logger.debug(
      MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_BULK_SUCCESS(savedItems.length),
    );

    return savedItems;
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update order item by ID
   *
   * @param itemId - Order item ID to update
   * @param data - Order item data to update
   * @param workspaceId - Optional workspace ID (uses scoped context if not provided)
   */
  async updateOrderItem(
    itemId: string,
    data: DeepPartial<MktOrderItemWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<void> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.UPDATE_START(itemId));

    const repository = await this.getRepository(workspaceId);

    await repository.update(itemId, data as never);

    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.UPDATE_SUCCESS(itemId));
  }

  /**
   * Update and return the updated order item with options
   */
  async updateAndReturnWithOptions(
    itemId: string,
    data: DeepPartial<MktOrderItemWorkspaceEntity>,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    await this.updateOrderItem(itemId, data);

    return this.findByIdWithOptions(itemId, options);
  }

  /**
   * Update multiple order items by IDs (batch update)
   */
  async updateManyOrderItems(
    itemIds: string[],
    data: DeepPartial<MktOrderItemWorkspaceEntity>,
  ): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    const repository = await this.getRepository();

    await repository.update({ id: In(itemIds) }, data as never);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete order item by setting deletedAt timestamp
   */
  async softDeleteOrderItem(itemId: string): Promise<void> {
    this.logger.warn(MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_START(itemId));

    await this.softDelete(itemId);

    this.logger.warn(MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_SUCCESS(itemId));
  }

  /**
   * Soft delete multiple order items by IDs
   *
   * @param itemIds - Order item IDs to delete
   * @param workspaceId - Optional workspace ID (uses scoped context if not provided)
   */
  async softDeleteManyOrderItems(
    itemIds: string[],
    workspaceId?: string,
  ): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BULK_START(itemIds.length),
    );

    const repository = await this.getRepository(workspaceId);

    await repository.update(itemIds, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BULK_SUCCESS(itemIds.length),
    );
  }

  /**
   * Soft delete all order items for an order
   */
  async softDeleteByOrderId(orderId: string): Promise<void> {
    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BY_ORDER_START(orderId),
    );

    const repository = await this.getRepository();

    await repository.update({ mktOrderId: orderId }, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BY_ORDER_SUCCESS(orderId),
    );
  }
}
