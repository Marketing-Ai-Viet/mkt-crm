import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktTemplateAccessLimitationWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktTemplateAccessLimitationRepository {
  private readonly logger = new Logger(
    MktTemplateAccessLimitationRepository.name,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktTemplateAccessLimitationWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktTemplateAccessLimitationWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true },
    });
  }

  async findByLimitationType(
    limitationType: string,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { limitationType, isActive: true },
      relations: ['template'],
    });
  }

  async findByLimitationKey(
    limitationKey: string,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { limitationKey, isActive: true },
      relations: ['template'],
    });
  }

  async findByTemplateAndKey(
    templateId: string,
    limitationKey: string,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { templateId, limitationKey, isActive: true },
    });
  }

  async findEnforcedByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true, isEnforced: true },
    });
  }

  async findEnforcedByTemplateIds(
    templateIds: string[],
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    if (templateIds.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: {
        templateId: In(templateIds),
        isActive: true,
        isEnforced: true,
      },
    });
  }

  async findBySeverity(
    severity: string,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { severity, isActive: true },
      relations: ['template'],
    });
  }

  async findWithRelations(
    id: string,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['template'],
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
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
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      relations: ['template'],
    });
  }

  async save(
    entity: Partial<MktTemplateAccessLimitationWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity> {
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

  async updateIsEnforced(
    id: string,
    isEnforced: boolean,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ id }, { isEnforced });
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
    where?: FindOptionsWhere<MktTemplateAccessLimitationWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
