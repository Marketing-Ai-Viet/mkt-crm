import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktTemplateAccessLimitationWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktTemplateAccessLimitationRepository - Data access layer for Template Access Limitation entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for limitation queries.
 */
@Injectable()
export class MktTemplateAccessLimitationRepository extends BaseWorkspaceRepository<MktTemplateAccessLimitationWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktTemplateAccessLimitationWorkspaceEntity,
      MktTemplateAccessLimitationRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    return this.findMany(workspaceId, { templateId, isActive: true });
  }

  async findByLimitationType(
    workspaceId: string,
    limitationType: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { limitationType, isActive: true },
      relations: ['template'],
    });
  }

  async findByLimitationKey(
    workspaceId: string,
    limitationKey: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { limitationKey, isActive: true },
      relations: ['template'],
    });
  }

  async findByTemplateAndKey(
    workspaceId: string,
    templateId: string,
    limitationKey: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity | null> {
    return this.findOne(workspaceId, {
      templateId,
      limitationKey,
      isActive: true,
    });
  }

  async findEnforcedByTemplateId(
    workspaceId: string,
    templateId: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    return this.findMany(workspaceId, {
      templateId,
      isActive: true,
      isEnforced: true,
    });
  }

  async findEnforcedByTemplateIds(
    workspaceId: string,
    templateIds: string[],
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
    workspaceId: string,
    severity: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { severity, isActive: true },
      relations: ['template'],
    });
  }

  async findWithRelations(
    workspaceId: string,
    id: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['template'],
    });
  }

  async findByIdsLimitation(
    workspaceId: string,
    ids: string[],
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
    workspaceId: string,
  ): Promise<MktTemplateAccessLimitationWorkspaceEntity[]> {
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

  async updateIsEnforced(
    workspaceId: string,
    id: string,
    isEnforced: boolean,
  ): Promise<void> {
    await this.update(workspaceId, id, { isEnforced });
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
