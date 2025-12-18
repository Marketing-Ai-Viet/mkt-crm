import { Injectable, Logger } from '@nestjs/common';

import { QueryRunner } from 'typeorm';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktGenericComboWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo.workspace-entity';
import { MktGenericComboItemWorkspaceEntity } from 'src/mkt-core/mkt-combo/objects/mkt-generic-combo-item.workspace-entity';
import {
  GenericComboWithItems,
  CreateGenericComboData,
  UpdateGenericComboData,
  PaginatedGenericComboResult,
  GenericComboFilter,
} from 'src/mkt-core/mkt-combo/types/generic-combo.types';
import { GenericComboVersionConflictError } from 'src/mkt-core/mkt-combo/errors/generic-combo.errors';
import {
  GENERIC_COMBO_LOG_CONTEXT,
  GENERIC_COMBO_DEFAULTS,
} from 'src/mkt-core/mkt-combo/constants/generic-combo.constants';

/**
 * Repository cho MktGenericCombo
 * Xử lý truy vấn database với JOIN queries để tránh N+1
 */
@Injectable()
export class MktGenericComboRepository {
  private readonly logger = new Logger(GENERIC_COMBO_LOG_CONTEXT);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  private async getRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktGenericComboWorkspaceEntity>(
      workspaceId,
      'mktGenericCombo',
    );
  }

  private async getItemRepository(workspaceId: string) {
    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktGenericComboItemWorkspaceEntity>(
      workspaceId,
      'mktGenericComboItem',
    );
  }

  /**
   * Tìm combo theo ID với items (sử dụng JOIN để tránh N+1)
   */
  async findByIdWithItems(
    workspaceId: string,
    id: string,
  ): Promise<GenericComboWithItems | null> {
    const repository = await this.getRepository(workspaceId);

    const combo = await repository
      .createQueryBuilder('combo')
      .leftJoinAndSelect('combo.items', 'items')
      .where('combo.id = :id', { id })
      .andWhere('combo.deletedAt IS NULL')
      .orderBy('items.position', 'ASC')
      .getOne();

    if (!combo) {
      return null;
    }

    return {
      combo,
      items: combo.items ?? [],
    };
  }

  /**
   * Tìm nhiều combo theo IDs (batch operation)
   */
  async findManyByIds(
    workspaceId: string,
    ids: string[],
  ): Promise<GenericComboWithItems[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    const combos = await repository
      .createQueryBuilder('combo')
      .leftJoinAndSelect('combo.items', 'items')
      .where('combo.id IN (:...ids)', { ids })
      .andWhere('combo.deletedAt IS NULL')
      .orderBy('items.position', 'ASC')
      .getMany();

    return combos.map((combo) => ({
      combo,
      items: combo.items ?? [],
    }));
  }

  /**
   * Tìm combo active theo code với items
   */
  async findActiveByCode(
    workspaceId: string,
    comboCode: string,
  ): Promise<GenericComboWithItems | null> {
    const repository = await this.getRepository(workspaceId);

    const combo = await repository
      .createQueryBuilder('combo')
      .leftJoinAndSelect('combo.items', 'items')
      .where('combo.comboCode = :comboCode', { comboCode })
      .andWhere('combo.isActive = :isActive', { isActive: true })
      .andWhere('combo.deletedAt IS NULL')
      .orderBy('items.position', 'ASC')
      .getOne();

    if (!combo) {
      return null;
    }

    return {
      combo,
      items: combo.items ?? [],
    };
  }

  /**
   * Tìm tất cả combo active với phân trang
   */
  async findAllActivePaginated(
    workspaceId: string,
    options: { limit: number; offset: number },
    filter?: GenericComboFilter,
  ): Promise<PaginatedGenericComboResult<MktGenericComboWorkspaceEntity>> {
    const repository = await this.getRepository(workspaceId);

    const queryBuilder = repository
      .createQueryBuilder('combo')
      .where('combo.deletedAt IS NULL');

    // Apply filters
    if (filter?.isActive !== undefined) {
      queryBuilder.andWhere('combo.isActive = :isActive', {
        isActive: filter.isActive,
      });
    }

    if (filter?.pricingType) {
      queryBuilder.andWhere('combo.pricingType = :pricingType', {
        pricingType: filter.pricingType,
      });
    }

    if (filter?.search) {
      queryBuilder.andWhere(
        '(combo.name ILIKE :search OR combo.comboCode ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter?.validAt) {
      queryBuilder.andWhere(
        '(combo.validFrom IS NULL OR combo.validFrom <= :validAt)',
        { validAt: filter.validAt },
      );
      queryBuilder.andWhere(
        '(combo.validTo IS NULL OR combo.validTo >= :validAt)',
        { validAt: filter.validAt },
      );
    }

    const total = await queryBuilder.getCount();

    const items = await queryBuilder
      .orderBy('combo.createdAt', 'DESC')
      .take(options.limit)
      .skip(options.offset)
      .getMany();

    return {
      items,
      total,
      hasMore: options.offset + items.length < total,
    };
  }

  /**
   * Tạo combo với items (transactional)
   */
  async create(
    workspaceId: string,
    data: CreateGenericComboData,
    queryRunner?: QueryRunner,
  ): Promise<MktGenericComboWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);
    const itemRepository = await this.getItemRepository(workspaceId);

    const { items, ...comboData } = data;

    // Tạo combo với version khởi tạo
    const combo = repository.create({
      ...comboData,
      version: GENERIC_COMBO_DEFAULTS.VERSION,
    });

    let savedCombo: MktGenericComboWorkspaceEntity;

    if (queryRunner) {
      savedCombo = await queryRunner.manager.save(combo);
    } else {
      savedCombo = await repository.save(combo);
    }

    // Tạo items
    if (items.length > 0) {
      const itemEntities = items.map((item, index) =>
        itemRepository.create({
          ...item,
          genericComboId: savedCombo.id,
          position: item.position ?? index,
          quantity: item.quantity ?? GENERIC_COMBO_DEFAULTS.QUANTITY,
        }),
      );

      if (queryRunner) {
        await queryRunner.manager.save(itemEntities);
      } else {
        await itemRepository.save(itemEntities);
      }
    }

    this.logger.log(
      `Created generic combo ${savedCombo.id} (${savedCombo.comboCode})`,
    );

    return savedCombo;
  }

  /**
   * Cập nhật combo với optimistic locking
   */
  async update(
    workspaceId: string,
    id: string,
    data: UpdateGenericComboData,
    queryRunner?: QueryRunner,
  ): Promise<MktGenericComboWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    const { expectedVersion, ...updateData } = data;

    // Kiểm tra version nếu cần
    if (expectedVersion !== undefined) {
      const current = await this.findById(workspaceId, id);

      if (!current) {
        return null;
      }

      if (current.version !== expectedVersion) {
        throw new GenericComboVersionConflictError(
          id,
          expectedVersion,
          current.version,
        );
      }
    }

    // Update với version increment
    await manager
      .createQueryBuilder()
      .update(MktGenericComboWorkspaceEntity)
      .set({
        ...updateData,
        version: () => 'version + 1',
      })
      .where('id = :id', { id })
      .execute();

    this.logger.log(`Updated generic combo ${id}`);

    return this.findById(workspaceId, id);
  }

  /**
   * Tìm combo theo ID (không có items)
   */
  async findById(
    workspaceId: string,
    id: string,
  ): Promise<MktGenericComboWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
    });
  }

  /**
   * Kiểm tra code đã tồn tại chưa
   */
  async codeExists(
    workspaceId: string,
    comboCode: string,
    excludeId?: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    const query = repository
      .createQueryBuilder('combo')
      .where('combo.comboCode = :comboCode', { comboCode })
      .andWhere('combo.deletedAt IS NULL');

    if (excludeId) {
      query.andWhere('combo.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();

    return count > 0;
  }

  /**
   * Soft delete combo
   */
  async softDelete(
    workspaceId: string,
    id: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);
    const manager = queryRunner?.manager ?? repository.manager;

    await manager.softDelete(MktGenericComboWorkspaceEntity, id);

    this.logger.log(`Soft deleted generic combo ${id}`);
  }
}
