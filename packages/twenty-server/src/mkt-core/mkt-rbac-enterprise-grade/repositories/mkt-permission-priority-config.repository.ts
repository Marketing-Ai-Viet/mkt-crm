import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPermissionPriorityConfigWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktPermissionPriorityConfigRepository {
  private readonly logger = new Logger(
    MktPermissionPriorityConfigRepository.name,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktPermissionPriorityConfigWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktPermissionPriorityConfigWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findBySourceType(
    sourceType: string,
    workspaceId?: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { sourceType, isActive: true },
      order: { basePriority: 'DESC' },
    });
  }

  async findBySourceTypeAndSubType(
    sourceType: string,
    sourceSubType?: string,
    workspaceId?: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { sourceType, sourceSubType, isActive: true },
    });
  }

  async findActive(
    workspaceId?: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { basePriority: 'DESC' },
    });
  }

  async findByBasePriorityRange(
    minPriority: number,
    maxPriority: number,
    workspaceId?: string,
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

  async findByIds(
    ids: string[],
    workspaceId?: string,
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
    sourceTypes: string[],
    workspaceId?: string,
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
    workspaceId?: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    const configs = await repository.find({
      where: { isActive: true },
      order: { basePriority: 'DESC' },
      take: 1,
    });

    return configs[0] ?? null;
  }

  async save(
    entity: Partial<MktPermissionPriorityConfigWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktPermissionPriorityConfigWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    return repository.save(entity);
  }

  async updateIsActive(
    id: string,
    isActive: boolean,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ id }, { isActive });
  }

  async updatePriority(
    id: string,
    basePriority: number,
    priorityBoost?: number,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    const updateData: Partial<MktPermissionPriorityConfigWorkspaceEntity> = {
      basePriority,
    };

    if (priorityBoost !== undefined) {
      updateData.priorityBoost = priorityBoost;
    }

    await repository.update({ id }, updateData);
  }

  async delete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }

  async softDelete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.softDelete({ id });
  }

  async count(
    where?: FindOptionsWhere<MktPermissionPriorityConfigWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
