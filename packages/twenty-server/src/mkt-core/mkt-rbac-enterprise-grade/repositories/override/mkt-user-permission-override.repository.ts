import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktUserPermissionOverrideWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktUserPermissionOverrideRepository - Data access layer for User Permission Override entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for permission override queries.
 */
@Injectable()
export class MktUserPermissionOverrideRepository extends BaseWorkspaceRepository<MktUserPermissionOverrideWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktUserPermissionOverrideWorkspaceEntity,
      MktUserPermissionOverrideRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { workspaceMemberId, isActive: true },
      relations: ['resource', 'action'],
    });
  }

  async findActiveByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
    referenceDate?: Date,
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
    workspaceId: string,
    resourceId: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { resourceId, isActive: true },
      relations: ['workspaceMember', 'action'],
    });
  }

  async findByActionId(
    workspaceId: string,
    actionId: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { actionId, isActive: true },
      relations: ['workspaceMember', 'resource'],
    });
  }

  async findByWorkspaceMemberResourceAction(
    workspaceId: string,
    workspaceMemberId: string,
    resourceId: string,
    actionId: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { workspaceMemberId, resourceId, actionId, isActive: true },
      relations: ['resource', 'action'],
    });
  }

  async findAllowedOverrides(
    workspaceId: string,
    workspaceMemberId: string,
    referenceDate?: Date,
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
    workspaceId: string,
    workspaceMemberId: string,
    referenceDate?: Date,
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
    workspaceId: string,
    referenceDate?: Date,
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
    workspaceId: string,
    id: string,
  ): Promise<MktUserPermissionOverrideWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['workspaceMember', 'resource', 'action', 'approvedBy'],
    });
  }

  async findByIdsOverride(
    workspaceId: string,
    ids: string[],
  ): Promise<MktUserPermissionOverrideWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  // ============================================
  // SPECIALIZED UPDATE OPERATIONS
  // ============================================

  async updateIsActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive });
  }

  async deactivateByWorkspaceMemberId(
    workspaceMemberId: string,
  ): Promise<void> {
    await this.updateWhere({ workspaceMemberId }, { isActive: false });
  }

  async deactivateExpired(
    workspaceId: string,
    referenceDate?: Date,
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

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  async hardDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }
}
