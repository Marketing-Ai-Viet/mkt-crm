import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktPermissionActionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktPermissionActionRepository - Data access layer for Permission Action entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for action lookups.
 */
@Injectable()
export class MktPermissionActionRepository extends BaseWorkspaceRepository<MktPermissionActionWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPermissionActionWorkspaceEntity,
      MktPermissionActionRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByActionKey(
    workspaceId: string,
    actionKey: string,
  ): Promise<MktPermissionActionWorkspaceEntity | null> {
    return this.findOne(workspaceId, { actionKey, isActive: true });
  }

  async findByActionKeys(
    workspaceId: string,
    actionKeys: string[],
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
    workspaceId: string,
    actionCategory: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { actionCategory, isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findByRiskLevel(
    workspaceId: string,
    riskLevel: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { riskLevel, isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findActive(
    workspaceId: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findSystemActions(
    workspaceId: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isSystemAction: true, isActive: true },
      order: { position: 'ASC' },
    });
  }

  async findRequiringApproval(
    workspaceId: string,
  ): Promise<MktPermissionActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { requiresApproval: true, isActive: true },
      order: { riskLevel: 'DESC', position: 'ASC' },
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
