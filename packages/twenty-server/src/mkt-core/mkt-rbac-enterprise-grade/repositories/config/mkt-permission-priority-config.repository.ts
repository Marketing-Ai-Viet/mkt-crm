import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktPermissionPriorityConfigWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktPermissionPriorityConfigRepository - Data access layer for Permission Priority Config entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for priority config queries.
 */
@Injectable()
export class MktPermissionPriorityConfigRepository extends BaseWorkspaceRepository<MktPermissionPriorityConfigWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPermissionPriorityConfigWorkspaceEntity,
      MktPermissionPriorityConfigRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findBySourceType(
    workspaceId: string,
    sourceType: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { sourceType, isActive: true },
      order: { basePriority: 'DESC' },
    });
  }

  async findBySourceTypeAndSubType(
    workspaceId: string,
    sourceType: string,
    sourceSubType?: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity | null> {
    return this.findOne(workspaceId, {
      sourceType,
      sourceSubType,
      isActive: true,
    });
  }

  async findActive(
    workspaceId: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { basePriority: 'DESC' },
    });
  }

  async findByBasePriorityRange(
    workspaceId: string,
    minPriority: number,
    maxPriority: number,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('config')
      .where('config.isActive = :isActive', { isActive: true })
      .andWhere('config.basePriority >= :minPriority', { minPriority })
      .andWhere('config.basePriority <= :maxPriority', { maxPriority })
      .orderBy('config.basePriority', 'DESC')
      .getMany();
  }

  async findByIdsPriorityConfig(
    workspaceId: string,
    ids: string[],
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async findBySourceTypes(
    workspaceId: string,
    sourceTypes: string[],
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity[]> {
    if (sourceTypes.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { sourceType: In(sourceTypes), isActive: true },
      order: { basePriority: 'DESC' },
    });
  }

  async getHighestPriorityConfig(
    workspaceId: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    const configs = await repository.find({
      where: { isActive: true },
      order: { basePriority: 'DESC' },
      take: 1,
    });

    return configs[0] ?? null;
  }

  // ============================================
  // SPECIALIZED UPDATE OPERATIONS
  // ============================================

  async updateIsActive(
    workspaceId: string,
    id: string,
    isActive: boolean,
  ): Promise<void> {
    await this.update(workspaceId, id, { isActive });
  }

  async updatePriority(
    workspaceId: string,
    id: string,
    basePriority: number,
    priorityBoost?: number,
  ): Promise<void> {
    const updateData: Partial<MktPermissionPriorityConfigWorkspaceEntity> = {
      basePriority,
    };

    if (priorityBoost !== undefined) {
      updateData.priorityBoost = priorityBoost;
    }

    await this.update(workspaceId, id, updateData);
  }

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  async hardDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }
}
