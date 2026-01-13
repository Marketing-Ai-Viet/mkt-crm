import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktPermissionContextWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktPermissionContextRepository - Data access layer for Permission Context entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for context queries.
 */
@Injectable()
export class MktPermissionContextRepository extends BaseWorkspaceRepository<MktPermissionContextWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPermissionContextWorkspaceEntity,
      MktPermissionContextRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByContextKey(
    workspaceId: string,
    contextKey: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    return this.findOne(workspaceId, { contextKey, isActive: true });
  }

  async findByContextType(
    workspaceId: string,
    contextType: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { contextType, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findActive(
    workspaceId: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findSystemDefaults(
    workspaceId: string,
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isSystemDefault: true, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findWithTemplateResourcePermissions(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionContextWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['templateResourcePermissions'],
    });
  }

  async findByIdsContext(
    workspaceId: string,
    ids: string[],
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
    workspaceId: string,
    contextKeys: string[],
  ): Promise<MktPermissionContextWorkspaceEntity[]> {
    if (contextKeys.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { contextKey: In(contextKeys), isActive: true },
    });
  }

  // ============================================
  // SPECIALIZED UPDATE OPERATIONS
  // ============================================

  async updateIsActive(
    workspaceId: string,
    id: string,
    isActive: boolean,
  ): Promise<void> {
    await this.update(workspaceId, id, { isActive });
  }

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  async hardDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }
}
