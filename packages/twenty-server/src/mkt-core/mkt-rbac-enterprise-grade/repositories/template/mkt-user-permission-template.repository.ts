import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktUserPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktUserPermissionTemplateRepository {
  private readonly logger = new Logger(
    MktUserPermissionTemplateRepository.name,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktUserPermissionTemplateWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktUserPermissionTemplateWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByWorkspaceMemberId(
    workspaceMemberId: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { workspaceMemberId, isActive: true },
      relations: ['template'],
    });
  }

  async findActiveByWorkspaceMemberId(
    workspaceMemberId: string,
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('upt')
      .leftJoinAndSelect('upt.template', 'template')
      .where('upt.workspaceMemberId = :workspaceMemberId', {
        workspaceMemberId,
      })
      .andWhere('upt.isActive = :isActive', { isActive: true })
      .andWhere('(upt.expiresAt IS NULL OR upt.expiresAt >= :now)', { now })
      .getMany();
  }

  async findByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true },
      relations: ['workspaceMember'],
    });
  }

  async findByWorkspaceMemberAndTemplate(
    workspaceMemberId: string,
    templateId: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { workspaceMemberId, templateId, isActive: true },
      relations: ['template', 'workspaceMember'],
    });
  }

  async findExpired(
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('upt')
      .where('upt.isActive = :isActive', { isActive: true })
      .andWhere('upt.expiresAt IS NOT NULL')
      .andWhere('upt.expiresAt <= :now', { now })
      .getMany();
  }

  async findWithRelations(
    id: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['template', 'workspaceMember', 'assignedBy'],
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
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
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      relations: ['template', 'workspaceMember'],
    });
  }

  async save(
    entity: Partial<MktUserPermissionTemplateWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity> {
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

  async deactivateByWorkspaceMemberId(
    workspaceMemberId: string,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ workspaceMemberId }, { isActive: false });
  }

  async deactivateByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update({ templateId }, { isActive: false });
  }

  async deactivateExpired(
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<number> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('upt')
      .update()
      .set({ isActive: false })
      .where('isActive = :isActive', { isActive: true })
      .andWhere('expiresAt IS NOT NULL')
      .andWhere('expiresAt <= :now', { now })
      .execute();

    return result.affected ?? 0;
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
    where?: FindOptionsWhere<MktUserPermissionTemplateWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }

  async countByTemplateId(
    templateId: string,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({
      where: { templateId, isActive: true },
    });
  }
}
