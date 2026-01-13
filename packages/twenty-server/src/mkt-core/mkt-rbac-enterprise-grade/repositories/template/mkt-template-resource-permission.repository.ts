import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktTemplateResourcePermissionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktTemplateResourcePermissionRepository - Data access layer for Template Resource Permission entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for resource permission queries.
 */
@Injectable()
export class MktTemplateResourcePermissionRepository extends BaseWorkspaceRepository<MktTemplateResourcePermissionWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktTemplateResourcePermissionWorkspaceEntity,
      MktTemplateResourcePermissionRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true },
      relations: ['resource', 'context'],
    });
  }

  async findByResourceId(
    workspaceId: string,
    resourceId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { resourceId, isActive: true },
      relations: ['template', 'context'],
    });
  }

  async findByContextId(
    workspaceId: string,
    contextId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { contextId, isActive: true },
      relations: ['template', 'resource'],
    });
  }

  async findByTemplateAndResource(
    workspaceId: string,
    templateId: string,
    resourceId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { templateId, resourceId, isActive: true },
      relations: ['resource', 'context'],
    });
  }

  async findByTemplateResourceContext(
    workspaceId: string,
    templateId: string,
    resourceId: string,
    contextId?: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { templateId, resourceId, contextId, isActive: true },
      relations: ['resource', 'context'],
    });
  }

  async findActiveByTemplateIds(
    workspaceId: string,
    templateIds: string[],
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
    workspaceId: string,
    id: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['template', 'resource', 'context'],
    });
  }

  async findByIdsResourcePermission(
    workspaceId: string,
    ids: string[],
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
    workspaceId: string,
  ): Promise<MktTemplateResourcePermissionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      relations: ['template', 'resource', 'context'],
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

  async deactivateByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<void> {
    await this.updateWhere(workspaceId, { templateId }, { isActive: false });
  }

  async deactivateByResourceId(
    workspaceId: string,
    resourceId: string,
  ): Promise<void> {
    await this.updateWhere(workspaceId, { resourceId }, { isActive: false });
  }

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  async hardDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }

  async deleteByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ templateId });
  }
}
