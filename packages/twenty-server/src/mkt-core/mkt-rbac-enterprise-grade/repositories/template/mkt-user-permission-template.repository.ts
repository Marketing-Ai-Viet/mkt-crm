import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktUserPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktUserPermissionTemplateRepository - Data access layer for User Permission Template entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for user-template assignment queries.
 */
@Injectable()
export class MktUserPermissionTemplateRepository extends BaseWorkspaceRepository<MktUserPermissionTemplateWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktUserPermissionTemplateWorkspaceEntity,
      MktUserPermissionTemplateRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { workspaceMemberId, isActive: true },
      relations: ['template'],
    });
  }

  async findActiveByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
    referenceDate?: Date,
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
    workspaceId: string,
    templateId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { templateId, isActive: true },
      relations: ['workspaceMember'],
    });
  }

  async findByWorkspaceMemberAndTemplate(
    workspaceId: string,
    workspaceMemberId: string,
    templateId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { workspaceMemberId, templateId, isActive: true },
      relations: ['template', 'workspaceMember'],
    });
  }

  async findExpired(
    workspaceId: string,
    referenceDate?: Date,
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
    workspaceId: string,
    id: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: ['template', 'workspaceMember', 'assignedBy'],
    });
  }

  async findByIdsUserTemplate(
    workspaceId: string,
    ids: string[],
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
    workspaceId: string,
  ): Promise<MktUserPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      relations: ['template', 'workspaceMember'],
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

  async deactivateByTemplateId(templateId: string): Promise<void> {
    await this.updateWhere({ templateId }, { isActive: false });
  }

  async deactivateExpired(
    workspaceId: string,
    referenceDate?: Date,
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

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  async hardDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }

  // ============================================
  // SPECIALIZED COUNT OPERATIONS
  // ============================================

  async countByTemplateId(templateId: string): Promise<number> {
    return this.count({ templateId, isActive: true });
  }
}
