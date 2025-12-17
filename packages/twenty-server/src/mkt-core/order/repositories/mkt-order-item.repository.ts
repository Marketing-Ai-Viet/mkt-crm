import { Injectable, Logger } from '@nestjs/common';

import { FindOptionsWhere, QueryRunner } from 'typeorm';

import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
   * Find order items by variant ID (internal product)
   */
  async findByVariantId(
    workspaceId: string,
    variantId: string,
    options?: FindOrderItemOptions,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    this.logger.debug(
      MKT_ORDER_ITEM_LOG_MESSAGES.FIND_BY_VARIANT_START(variantId),
    );

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { mktVariantId: variantId },
      relations: options?.relations,
    });
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
   */
  async create(
    workspaceId: string,
    data: CreateOrderItemData,
    queryRunner?: QueryRunner,
  ): Promise<MktOrderItemWorkspaceEntity> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_START());

    const repository = await this.getRepository(workspaceId);

    const orderItem = repository.create(data);

    let savedItem: MktOrderItemWorkspaceEntity;

    if (queryRunner) {
      savedItem = await queryRunner.manager.save(orderItem);
    } else {
      savedItem = await repository.save(orderItem);
    }

    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_SUCCESS(savedItem.id));

    return savedItem;
  }

  /**
   * Create multiple order items
   */
  async createMany(
    workspaceId: string,
    items: CreateOrderItemData[],
    queryRunner?: QueryRunner,
  ): Promise<MktOrderItemWorkspaceEntity[]> {
    if (items.length === 0) {
      return [];
    }

    this.logger.debug(
      MKT_ORDER_ITEM_LOG_MESSAGES.CREATE_BULK_START(items.length),
    );

    const repository = await this.getRepository(workspaceId);

    const orderItems = items.map((item) => repository.create(item));

    let savedItems: MktOrderItemWorkspaceEntity[];

    if (queryRunner) {
      savedItems = await queryRunner.manager.save(orderItems);
    } else {
      savedItems = await repository.save(orderItems);
    }

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
   */
  async update(
    workspaceId: string,
    itemId: string,
    data: UpdateOrderItemData,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.debug(MKT_ORDER_ITEM_LOG_MESSAGES.UPDATE_START(itemId));

    const repository = await this.getRepository(workspaceId);

    if (queryRunner) {
      await queryRunner.manager.update(
        MktOrderItemWorkspaceEntity,
        { id: itemId },
        data,
      );
    } else {
      await repository.update(itemId, data);
    }

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
   * Update multiple order items by IDs
   */
  async updateMany(
    workspaceId: string,
    itemIds: string[],
    data: UpdateOrderItemData,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    const repository = await this.getRepository(workspaceId);

    if (queryRunner) {
      for (const itemId of itemIds) {
        await queryRunner.manager.update(
          MktOrderItemWorkspaceEntity,
          { id: itemId },
          data,
        );
      }
    } else {
      for (const itemId of itemIds) {
        await repository.update(itemId, data);
      }
    }
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Hard delete order item (use with caution)
   */
  async hardDelete(
    workspaceId: string,
    itemId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_START(itemId));

    const repository = await this.getRepository(workspaceId);

    if (queryRunner) {
      await queryRunner.manager.delete(MktOrderItemWorkspaceEntity, {
        id: itemId,
      });
    } else {
      await repository.delete(itemId);
    }

    this.logger.warn(MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_SUCCESS(itemId));
  }

  /**
   * Hard delete multiple order items by IDs
   */
  async hardDeleteMany(
    workspaceId: string,
    itemIds: string[],
    queryRunner?: QueryRunner,
  ): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BULK_START(itemIds.length),
    );

    const repository = await this.getRepository(workspaceId);

    if (queryRunner) {
      await queryRunner.manager.delete(MktOrderItemWorkspaceEntity, itemIds);
    } else {
      await repository.delete(itemIds);
    }

    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BULK_SUCCESS(itemIds.length),
    );
  }

  /**
   * Hard delete all order items for an order
   */
  async hardDeleteByOrderId(
    workspaceId: string,
    orderId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.warn(
      MKT_ORDER_ITEM_LOG_MESSAGES.DELETE_BY_ORDER_START(orderId),
    );

    const repository = await this.getRepository(workspaceId);

    if (queryRunner) {
      await queryRunner.manager.delete(MktOrderItemWorkspaceEntity, {
        mktOrderId: orderId,
      });
    } else {
      await repository.delete({ mktOrderId: orderId });
    }

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
    workspaceId: string,
  ): Promise<WorkspaceRepository<MktOrderItemWorkspaceEntity>> {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktOrderItemWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }
}
