import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktUserPermissionOverrideWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktUserPermissionOverrideRepository {
  private readonly logger = new Logger(
    MktUserPermissionOverrideRepository.name,
  );

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktUserPermissionOverrideWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktUserPermissionOverrideWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByWorkspaceMemberId(
    workspaceMemberId: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { workspaceMemberId, isActive: true },
      relations: ['resource', 'action'],
    });
  }

  async findActiveByWorkspaceMemberId(
    workspaceMemberId: string,
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('override')
      .leftJoinAndSelect('override.resource', 'resource')
      .leftJoinAndSelect('override.action', 'action')
      .where('override.workspaceMemberId = :workspaceMemberId', {
        workspaceMemberId,
      })
      .andWhere('override.isActive = :isActive', { isActive: true })
      .andWhere('(override.expiresAt IS NULL OR override.expiresAt >= :now)', {
        now,
      })
      .getMany();
  }

  async findByResourceId(
    resourceId: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { resourceId, isActive: true },
      relations: ['workspaceMember', 'action'],
    });
  }

  async findByActionId(
    actionId: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { actionId, isActive: true },
      relations: ['workspaceMember', 'resource'],
    });
  }

  async findByWorkspaceMemberResourceAction(
    workspaceMemberId: string,
    resourceId: string,
    actionId: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { workspaceMemberId, resourceId, actionId, isActive: true },
      relations: ['resource', 'action'],
    });
  }

  async findAllowedOverrides(
    workspaceMemberId: string,
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('override')
      .leftJoinAndSelect('override.resource', 'resource')
      .leftJoinAndSelect('override.action', 'action')
      .where('override.workspaceMemberId = :workspaceMemberId', {
        workspaceMemberId,
      })
      .andWhere('override.isActive = :isActive', { isActive: true })
      .andWhere('override.isAllowed = :isAllowed', { isAllowed: true })
      .andWhere('(override.expiresAt IS NULL OR override.expiresAt >= :now)', {
        now,
      })
      .getMany();
  }

  async findDeniedOverrides(
    workspaceMemberId: string,
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('override')
      .leftJoinAndSelect('override.resource', 'resource')
      .leftJoinAndSelect('override.action', 'action')
      .where('override.workspaceMemberId = :workspaceMemberId', {
        workspaceMemberId,
      })
      .andWhere('override.isActive = :isActive', { isActive: true })
      .andWhere('override.isAllowed = :isAllowed', { isAllowed: false })
      .andWhere('(override.expiresAt IS NULL OR override.expiresAt >= :now)', {
        now,
      })
      .getMany();
  }

  async findExpired(
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    return repository
      .createQueryBuilder('override')
      .where('override.isActive = :isActive', { isActive: true })
      .andWhere('override.expiresAt IS NOT NULL')
      .andWhere('override.expiresAt <= :now', { now })
      .getMany();
  }

  async findWithRelations(
    id: string,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['workspaceMember', 'resource', 'action', 'approvedBy'],
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async save(
    entity: Partial<MktUserPermissionOverrideWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity> {
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

  async deactivateExpired(
    referenceDate?: Date,
    workspaceId?: string,
  ): Promise<number> {
    const now = referenceDate ?? new Date();
    const repository = await this.getRepository(workspaceId);

    const result = await repository
      .createQueryBuilder('override')
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
    where?: FindOptionsWhere<MktUserPermissionOverrideWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
