import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktGenericComboItemWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo-item.workspace-entity';
import {
  CreateGenericComboItemData,
  UpdateGenericComboItemData,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import {
  GENERIC_COMBO_LOG_CONTEXT,
  GENERIC_COMBO_DEFAULTS,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';

/**
 * Repository cho MktGenericComboItem
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 */
@Injectable()
export class MktGenericComboItemRepository extends BaseWorkspaceRepository<MktGenericComboItemWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktGenericComboItemWorkspaceEntity,
      `${GENERIC_COMBO_LOG_CONTEXT}:Item`,
    );
  }

  /**
   * Tìm items theo combo ID, sắp xếp theo position
   */
  async findByComboId(
    comboId: string,
  ): Promise<MktGenericComboItemWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository.find({
      where: { genericComboId: comboId },
      order: { position: 'ASC' },
    });
  }

  /**
   * Tìm item theo ID với relations (internal product/variant)
   */
  async findByIdWithRelations(
    id: string,
  ): Promise<MktGenericComboItemWorkspaceEntity | null> {
    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.mktProduct', 'mktProduct')
      .leftJoinAndSelect('item.mktVariant', 'mktVariant')
      .where('item.id = :id', { id })
      .getOne();
  }

  /**
   * Tìm items theo combo ID với relations
   */
  async findByComboIdWithRelations(
    comboId: string,
  ): Promise<MktGenericComboItemWorkspaceEntity[]> {
    const repository = await this.getRepository();

    return repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.mktProduct', 'mktProduct')
      .leftJoinAndSelect('item.mktVariant', 'mktVariant')
      .where('item.genericComboId = :comboId', { comboId })
      .orderBy('item.position', 'ASC')
      .getMany();
  }

  /**
   * Tạo item mới
   */
  async createItem(
    comboId: string,
    data: CreateGenericComboItemData,
  ): Promise<MktGenericComboItemWorkspaceEntity> {
    const repository = await this.getRepository();

    const item = repository.create({
      ...data,
      genericComboId: comboId,
      quantity: data.quantity ?? GENERIC_COMBO_DEFAULTS.QUANTITY,
      position: data.position ?? GENERIC_COMBO_DEFAULTS.POSITION,
    });

    const savedItem = await repository.save(item);

    this.logger.log(
      `Created generic combo item ${savedItem.id} for combo ${comboId}`,
    );

    return savedItem;
  }

  /**
   * Tạo nhiều items (batch)
   */
  async createManyItems(
    comboId: string,
    items: CreateGenericComboItemData[],
  ): Promise<MktGenericComboItemWorkspaceEntity[]> {
    if (items.length === 0) {
      return [];
    }

    const repository = await this.getRepository();

    const itemEntities = items.map((item, index) =>
      repository.create({
        ...item,
        genericComboId: comboId,
        quantity: item.quantity ?? GENERIC_COMBO_DEFAULTS.QUANTITY,
        position: item.position ?? index,
      }),
    );

    const savedItems = await repository.save(itemEntities);

    this.logger.log(
      `Created ${savedItems.length} generic combo items for combo ${comboId}`,
    );

    return savedItems;
  }

  /**
   * Cập nhật item
   */
  async updateItem(
    id: string,
    data: UpdateGenericComboItemData,
  ): Promise<MktGenericComboItemWorkspaceEntity | null> {
    const repository = await this.getRepository();

    await repository.update(id, data);

    return this.findById(id);
  }

  /**
   * Xóa item (hard delete)
   */
  async deleteItem(id: string): Promise<void> {
    const repository = await this.getRepository();

    await repository.delete(id);

    this.logger.log(`Deleted generic combo item ${id}`);
  }

  /**
   * Xóa tất cả items của combo
   */
  async deleteByComboId(comboId: string): Promise<void> {
    const repository = await this.getRepository();

    await repository.delete({ genericComboId: comboId });

    this.logger.log(`Deleted all items for generic combo ${comboId}`);
  }

  /**
   * Cập nhật positions cho items
   */
  async updatePositions(
    itemPositions: Array<{ id: string; position: number }>,
  ): Promise<void> {
    const repository = await this.getRepository();

    for (const { id, position } of itemPositions) {
      await repository.update(id, { position });
    }

    this.logger.log(`Updated positions for ${itemPositions.length} items`);
  }
}
