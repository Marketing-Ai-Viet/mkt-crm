import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktTemplateSystemActionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktTemplateSystemActionRepository {
  private readonly logger = new Logger(MktTemplateSystemActionRepository.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktTemplateSystemActionWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktTemplateSystemActionWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true },
    });
  }

  async findByActionKey(
    actionKey: string,
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { actionKey, isActive: true },
      relations: ['template'],
    });
  }

  async findByTemplateAndActionKey(
    templateId: string,
    actionKey: string,
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { templateId, actionKey, isActive: true },
    });
  }

  async findAllowedByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true, isAllowed: true },
    });
  }

  async findAllowedByTemplateIds(
    templateIds: string[],
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    if (templateIds.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId: In(templateIds), isActive: true, isAllowed: true },
    });
  }

  async findDeniedByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true, isAllowed: false },
    });
  }

  async findWithRelations(
    id: string,
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['template'],
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
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
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      relations: ['template'],
    });
  }

  async save(
    entity: Partial<MktTemplateSystemActionWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity> {
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

  async updateIsAllowed(
    id: string,
    isAllowed: boolean,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ id }, { isAllowed });
  }

  async deactivateByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ templateId }, { isActive: false });
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
    where?: FindOptionsWhere<MktTemplateSystemActionWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
