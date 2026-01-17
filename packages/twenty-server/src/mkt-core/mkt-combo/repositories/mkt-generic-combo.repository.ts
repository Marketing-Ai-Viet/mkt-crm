import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
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
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Xử lý truy vấn database với JOIN queries để tránh N+1
 */
@Injectable()
export class MktGenericComboRepository extends BaseWorkspaceRepository<MktGenericComboWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktGenericComboWorkspaceEntity,
      GENERIC_COMBO_LOG_CONTEXT,
    );
  }

  private async getItemRepository() {
    const wsId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new Error('Workspace ID not found in scoped context');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace<MktGenericComboItemWorkspaceEntity>(
      wsId,
      MktGenericComboItemWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  /**
   * Tìm combo theo ID với items (sử dụng JOIN để tránh N+1)
   */
  async findByIdWithItems(id: string): Promise<GenericComboWithItems | null> {
    const repository = await this.getRepository();

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
  async findManyByIds(ids: string[]): Promise<GenericComboWithItems[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository();

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
    comboCode: string,
  ): Promise<GenericComboWithItems | null> {
    const repository = await this.getRepository();

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
    options: { limit: number; offset: number },
    filter?: GenericComboFilter,
  ): Promise<PaginatedGenericComboResult<MktGenericComboWorkspaceEntity>> {
    const repository = await this.getRepository();

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
  async createCombo(
    data: CreateGenericComboData,
  ): Promise<MktGenericComboWorkspaceEntity> {
    const repository = await this.getRepository();
    const itemRepository = await this.getItemRepository();

    const { items, ...comboData } = data;

    // Tạo combo với version khởi tạo
    const combo = repository.create({
      ...comboData,
      version: GENERIC_COMBO_DEFAULTS.VERSION,
    });

    const savedCombo = await repository.save(combo);

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

      await itemRepository.save(itemEntities);
    }

    this.logger.log(
      `Created generic combo ${savedCombo.id} (${savedCombo.comboCode})`,
    );

    return savedCombo;
  }

  /**
   * Cập nhật combo với optimistic locking
   */
  async updateCombo(
    id: string,
    data: UpdateGenericComboData,
  ): Promise<MktGenericComboWorkspaceEntity | null> {
    const repository = await this.getRepository();

    const { expectedVersion, ...updateData } = data;

    // Kiểm tra version nếu cần
    if (expectedVersion !== undefined) {
      const current = await this.findById(id);

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
    await repository
      .createQueryBuilder()
      .update()
      .set({
        ...updateData,
        version: () => 'version + 1',
      })
      .where('id = :id', { id })
      .execute();

    this.logger.log(`Updated generic combo ${id}`);

    return this.findById(id);
  }

  /**
   * Kiểm tra code đã tồn tại chưa
   */
  async codeExists(comboCode: string, excludeId?: string): Promise<boolean> {
    const repository = await this.getRepository();

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
  async softDeleteCombo(id: string): Promise<void> {
    await this.softDelete(id);

    this.logger.log(`Soft deleted generic combo ${id}`);
  }
}
