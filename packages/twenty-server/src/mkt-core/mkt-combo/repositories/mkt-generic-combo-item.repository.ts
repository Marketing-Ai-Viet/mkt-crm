import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
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
 */
@Injectable()
export class MktGenericComboItemRepository {
  private readonly logger = new Logger(GENERIC_COMBO_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktGenericComboItemWorkspaceEntity>(
      workspaceId,
      'mktGenericComboItem',
    );
  }

  /**
   * Tìm items theo combo ID, sắp xếp theo position
   */
  async findByComboId(
    workspaceId: string,
    comboId: string,
  ): Promise<MktGenericComboItemWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { genericComboId: comboId },
      order: { position: 'ASC' },
    });
  }

  /**
   * Tìm item theo ID
   */
  async findById(
    workspaceId: string,
    id: string,
  ): Promise<MktGenericComboItemWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  /**
   * Tìm item theo ID với relations (internal product/variant)
   */
  async findByIdWithRelations(
    workspaceId: string,
    id: string,
  ): Promise<MktGenericComboItemWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    comboId: string,
  ): Promise<MktGenericComboItemWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
  async create(
    workspaceId: string,
    comboId: string,
    data: CreateGenericComboItemData,
    queryRunner?: QueryRunner,
  ): Promise<MktGenericComboItemWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const item = repository.create({
      ...data,
      genericComboId: comboId,
      quantity: data.quantity ?? GENERIC_COMBO_DEFAULTS.QUANTITY,
      position: data.position ?? GENERIC_COMBO_DEFAULTS.POSITION,
    });

    let savedItem: MktGenericComboItemWorkspaceEntity;

    if (queryRunner) {
      savedItem = await queryRunner.manager.save(item);
    } else {
      savedItem = await repository.save(item);
    }

    this.logger.log(
      `Created generic combo item ${savedItem.id} for combo ${comboId}`,
    );

    return savedItem;
  }

  /**
   * Tạo nhiều items (batch)
   */
  async createMany(
    workspaceId: string,
    comboId: string,
    items: CreateGenericComboItemData[],
    queryRunner?: QueryRunner,
  ): Promise<MktGenericComboItemWorkspaceEntity[]> {
    if (items.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    const itemEntities = items.map((item, index) =>
      repository.create({
        ...item,
        genericComboId: comboId,
        quantity: item.quantity ?? GENERIC_COMBO_DEFAULTS.QUANTITY,
        position: item.position ?? index,
      }),
    );

    let savedItems: MktGenericComboItemWorkspaceEntity[];

    if (queryRunner) {
      savedItems = await queryRunner.manager.save(itemEntities);
    } else {
      savedItems = await repository.save(itemEntities);
    }

    this.logger.log(
      `Created ${savedItems.length} generic combo items for combo ${comboId}`,
    );

    return savedItems;
  }

  /**
   * Cập nhật item
   */
  async update(
    workspaceId: string,
    id: string,
    data: UpdateGenericComboItemData,
    queryRunner?: QueryRunner,
  ): Promise<MktGenericComboItemWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.update(MktGenericComboItemWorkspaceEntity, id, data);

    return this.findById(workspaceId, id);
  }

  /**
   * Xóa item
   */
  async delete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.delete(MktGenericComboItemWorkspaceEntity, id);

    this.logger.log(`Deleted generic combo item ${id}`);
  }

  /**
   * Xóa tất cả items của combo
   */
  async deleteByComboId(
    workspaceId: string,
    comboId: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.delete(MktGenericComboItemWorkspaceEntity, {
      genericComboId: comboId,
    });

    this.logger.log(`Deleted all items for generic combo ${comboId}`);
  }

  /**
   * Cập nhật positions cho items
   */
  async updatePositions(
    workspaceId: string,
    itemPositions: Array<{ id: string; position: number }>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    for (const { id, position } of itemPositions) {
      await manager.update(MktGenericComboItemWorkspaceEntity, id, {
        position,
      });
    }

    this.logger.log(`Updated positions for ${itemPositions.length} items`);
  }
}
