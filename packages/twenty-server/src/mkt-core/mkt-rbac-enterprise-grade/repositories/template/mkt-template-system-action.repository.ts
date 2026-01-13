import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktTemplateSystemActionWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktTemplateSystemActionRepository - Data access layer for Template System Action entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for system action queries.
 */
@Injectable()
export class MktTemplateSystemActionRepository extends BaseWorkspaceRepository<MktTemplateSystemActionWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktTemplateSystemActionWorkspaceEntity,
      MktTemplateSystemActionRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    return this.findMany(workspaceId, { templateId, isActive: true });
  }

  async findByActionKey(
    workspaceId: string,
    actionKey: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { actionKey, isActive: true },
      relations: ['template'],
    });
  }

  async findByTemplateAndActionKey(
    workspaceId: string,
    templateId: string,
    actionKey: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity | null> {
    return this.findOne(workspaceId, { templateId, actionKey, isActive: true });
  }

  async findAllowedByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    return this.findMany(workspaceId, {
      templateId,
      isActive: true,
      isAllowed: true,
    });
  }

  async findAllowedByTemplateIds(
    workspaceId: string,
    templateIds: string[],
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
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    return this.findMany(workspaceId, {
      templateId,
      isActive: true,
      isAllowed: false,
    });
  }

  async findWithRelations(
    workspaceId: string,
    id: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['template'],
    });
  }

  async findByIdsSystemAction(
    workspaceId: string,
    ids: string[],
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
    workspaceId: string,
  ): Promise<MktTemplateSystemActionWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      relations: ['template'],
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

  async updateIsAllowed(
    workspaceId: string,
    id: string,
    isAllowed: boolean,
  ): Promise<void> {
    await this.update(workspaceId, id, { isAllowed });
  }

  async deactivateByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<void> {
    await this.updateWhere(workspaceId, { templateId }, { isActive: false });
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
