import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPermissionContextWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktPermissionContextRepository {
  private readonly logger = new Logger(MktPermissionContextRepository.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktPermissionContextWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktPermissionContextWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByContextKey(
    contextKey: string,
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { contextKey, isActive: true },
    });
  }

  async findByContextType(
    contextType: string,
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { contextType, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findActive(
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findSystemDefaults(
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isSystemDefault: true, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findWithTemplateResourcePermissions(
    id: string,
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['templateResourcePermissions'],
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async findByContextKeys(
    contextKeys: string[],
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    if (contextKeys.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { contextKey: In(contextKeys), isActive: true },
    });
  }

  async save(
    entity: Partial<MktPermissionContextWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktPermissionContextWorkspaceEntity> {
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
    where?: FindOptionsWhere<MktPermissionContextWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
