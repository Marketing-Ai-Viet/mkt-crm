import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In, QueryRunner } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { REPOSITORY_MESSAGES } from 'src/mkt-core/common/messages';
import {
  MKT_ORDER_ITEM_LOG_CONTEXT,
  MKT_ORDER_ITEM_LOG_MESSAGES,
} from 'src/mkt-core/order/messages';
import { MktOrderItemWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order-item.workspace-entity';
import {
  CreateOrderItemData,
  DEFAULT_ORDER_ITEM_RELATIONS,
  FindOrderItemOptions,
  UpdateOrderItemData,
} from 'src/mkt-core/order/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktOrderItemRepository - Data access layer for OrderItem entity
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
export class MktOrderItemRepository {
  private readonly logger = new Logger(
    `${MKT_ORDER_ITEM_LOG_CONTEXT}:Repository`,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find order item by ID
   */
  async findById(
    workspaceId: string,
    itemId: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_ID_START(itemId));

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    itemId: string,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    return this.findById(workspaceId, itemId, {
      relations: DEFAULT_ORDER_ITEM_RELATIONS,
    });
  }

  /**
   * Find all order items for an order
   */
  async findByOrderId(
    workspaceId: string,
    orderId: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_ORDER_START(orderId));

    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    externalProductId: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    this.logger.debug(
      MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_PRODUCT_START(externalProductId),
    );

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { externalMktProductId: externalProductId },
      relations: options?.relations,
    });
  }

  /**
   * Find order items by external product code
   */
  async findByExternalProductCode(
    workspaceId: string,
    externalProductCode: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
    _workspaceId: string,
    variantId: string,
    _options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    this.logger.warn(
      `findByVariantId is deprecated. Variant ${variantId} lookup returns empty.`,
    );

    return [];
  }

  /**
   * Find order items with custom where clause
   */
  async findMany(
    workspaceId: string,
    where: FindOptionsWhere<MktOrderItemWorkspaceEntity>,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where,
      relations: options?.relations,
    });
  }

  /**
   * Check if order item exists
   */
  async exists(workspaceId: string, itemId: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const count = await repository.count({
      where: { id: itemId },
    });

    return count > 0;
  }

  /**
   * Count order items for an order
   */
  async countByOrderId(workspaceId: string, orderId: string): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { mktOrderId: orderId },
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new order item
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async create(
    workspaceId: string,
    data: CreateOrderItemData,
    _queryRunner?: QueryRunner,
  ): Promise<MktOrderItemWorkspaceEntity> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

    const orderItem = repository.create(data);

    // Always use repository.save() - queryRunner.manager doesn't have workspace entity metadata
    const savedItem = await repository.save(orderItem);

    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_SUCCESS(savedItem.id));

    return savedItem;
  }

  /**
   * Create multiple order items
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async createMany(
    workspaceId: string,
    items: CreateOrderItemData[],
    _queryRunner?: QueryRunner,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    if (items.length === 0) {
      return [];
    }

    this.logger.debug(
      MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_BULK_START(items.length),
    );

    const repository = await this.getRepository(workspaceId);

    const orderItems = items.map((item) => repository.create(item));

    // Always use repository.save() - queryRunner.manager doesn't have workspace entity metadata
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
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async update(
    workspaceId: string,
    itemId: string,
    data: UpdateOrderItemData,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.UPDATE_START(itemId));

    const repository = await this.getRepository(workspaceId);

    // Always use repository.update() - queryRunner.manager doesn't have workspace entity metadata
    await repository.update(itemId, data);

    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.UPDATE_SUCCESS(itemId));
  }

  /**
   * Update and return the updated order item
   */
  async updateAndReturn(
    workspaceId: string,
    itemId: string,
    data: UpdateOrderItemData,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity | null> {
    await this.update(workspaceId, itemId, data, options?.queryRunner);

    return this.findById(workspaceId, itemId, options);
  }

  /**
   * Update multiple order items by IDs (batch update)
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async updateMany(
    workspaceId: string,
    itemIds: string[],
    data: UpdateOrderItemData,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    const repository = await this.getRepository(workspaceId);

    // Use batch update with In() operator to avoid N+1 queries
    await repository.update({ id: In(itemIds) }, data);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete order item by setting deletedAt timestamp
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async softDelete(
    workspaceId: string,
    itemId: string,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_START(itemId));

    const repository = await this.getRepository(workspaceId);

    await repository.update(itemId, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    });

    this.logger.warn(MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_SUCCESS(itemId));
  }

  /**
   * Soft delete multiple order items by IDs
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async softDeleteMany(
    workspaceId: string,
    itemIds: string[],
    _queryRunner?: QueryRunner,
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
    });

    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BULK_SUCCESS(itemIds.length),
    );
  }

  /**
   * Soft delete all order items for an order
   * Note: queryRunner is ignored - workspace repository handles its own connection
   */
  async softDeleteByOrderId(
    workspaceId: string,
    orderId: string,
    _queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BY_ORDER_START(orderId),
    );

    const repository = await this.getRepository(workspaceId);

    await repository.update(
      { mktOrderId: orderId },
      { deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()) },
    );

    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BY_ORDER_SUCCESS(orderId),
    );
  }

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get the underlying TypeORM repository
   * Useful for complex queries not covered by this repository
   */
  async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktOrderItemWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(
        REPOSITORY_MESSAGES.ERROR.WORKSPACE_NOT_FOUND,
      );
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktOrderItemWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
