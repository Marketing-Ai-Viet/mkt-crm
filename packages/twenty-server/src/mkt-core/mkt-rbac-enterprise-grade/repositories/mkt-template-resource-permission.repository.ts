import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktTemplateResourcePermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktTemplateResourcePermissionRepository {
  private readonly logger = new Logger(
    MktTemplateResourcePermissionRepository.name,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<
    WorkspaceRepository<MktTemplateResourcePermissionWorkspaceEntity>
  > {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktTemplateResourcePermissionWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true },
      relations: ['resource', 'context'],
    });
  }

  async findByResourceId(
    resourceId: string,
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { resourceId, isActive: true },
      relations: ['template', 'context'],
    });
  }

  async findByContextId(
    contextId: string,
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { contextId, isActive: true },
      relations: ['template', 'resource'],
    });
  }

  async findByTemplateAndResource(
    templateId: string,
    resourceId: string,
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { templateId, resourceId, isActive: true },
      relations: ['resource', 'context'],
    });
  }

  async findByTemplateResourceContext(
    templateId: string,
    resourceId: string,
    contextId?: string,
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { templateId, resourceId, contextId, isActive: true },
      relations: ['resource', 'context'],
    });
  }

  async findActiveByTemplateIds(
    templateIds: string[],
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    if (templateIds.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId: In(templateIds), isActive: true },
      relations: ['resource', 'context'],
    });
  }

  async findWithRelations(
    id: string,
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['template', 'resource', 'context'],
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async findActive(
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      relations: ['template', 'resource', 'context'],
    });
  }

  async save(
    entity: Partial<MktTemplateResourcePermissionWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity> {
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

  async deactivateByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ templateId }, { isActive: false });
  }

  async deactivateByResourceId(
    resourceId: string,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ resourceId }, { isActive: false });
  }

  async delete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }

  async softDelete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.softDelete({ id });
  }

  async deleteByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ templateId });
  }

  async count(
    where?: FindOptionsWhere<MktTemplateResourcePermissionWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
