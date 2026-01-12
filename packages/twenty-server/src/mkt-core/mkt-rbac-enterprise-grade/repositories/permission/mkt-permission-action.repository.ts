import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPermissionActionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktPermissionActionRepository {
  private readonly logger = new Logger(MktPermissionActionRepository.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktPermissionActionWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktPermissionActionWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByActionKey(
    actionKey: string,
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { actionKey, isActive: true },
    });
  }

  async findByActionKeys(
    actionKeys: string[],
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    if (actionKeys.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { actionKey: In(actionKeys), isActive: true },
    });
  }

  async findByCategory(
    actionCategory: string,
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { actionCategory, isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findByRiskLevel(
    riskLevel: string,
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { riskLevel, isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findActive(
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findSystemActions(
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isSystemAction: true, isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findRequiringApproval(
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { requiresApproval: true, isActive: true },
      order: { riskLevel: 'DESC', position: 'ASC' },
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async save(
    entity: Partial<MktPermissionActionWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktPermissionActionWorkspaceEntity> {
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

  async delete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }

  async softDelete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.softDelete({ id });
  }

  async count(
    where?: FindOptionsWhere<MktPermissionActionWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
