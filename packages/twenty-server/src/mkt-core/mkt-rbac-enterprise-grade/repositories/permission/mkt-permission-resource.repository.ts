import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktPermissionResourceWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktPermissionResourceRepository - Data access layer for Permission Resource entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for resource queries.
 */
@Injectable()
export class MktPermissionResourceRepository extends BaseWorkspaceRepository<MktPermissionResourceWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPermissionResourceWorkspaceEntity,
      MktPermissionResourceRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByResourceKey(
    resourceKey: string,
  ): Promise<MktPermissionResourceWorkspaceEntity | null> {
    return this.findOne({ resourceKey, isActive: true });
  }

  async findByResourceKeys(
    workspaceId: string,
    resourceKeys: string[],
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
    if (resourceKeys.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { resourceKey: In(resourceKeys), isActive: true },
    });
  }

  async findByCategory(
    workspaceId: string,
    resourceCategory: string,
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { resourceCategory, isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async findActive(
    workspaceId: string,
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async findSystemResources(
    workspaceId: string,
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isSystemResource: true, isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async findWithTemplatePermissions(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionResourceWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['templatePermissions', 'userOverrides'],
    });
  }

  async findByIdsResource(
    workspaceId: string,
    ids: string[],
  ): Promise<MktPermissionResourceWorkspaceEntity[]> {
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

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  async hardDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }
}
