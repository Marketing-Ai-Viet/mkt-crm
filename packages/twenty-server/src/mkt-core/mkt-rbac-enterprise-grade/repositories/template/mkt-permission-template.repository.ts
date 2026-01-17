import { Injectable } from '@nestjs/common';

import { In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktPermissionTemplateRepository - Data access layer for Permission Template entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for template queries.
 */
@Injectable()
export class MktPermissionTemplateRepository extends BaseWorkspaceRepository<MktPermissionTemplateWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktPermissionTemplateWorkspaceEntity,
      MktPermissionTemplateRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByTemplateKey(
    templateKey: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    return this.findOne({ templateKey, isActive: true });
  }

  async findByHierarchyLevel(
    workspaceId: string,
    hierarchyLevel: number,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { hierarchyLevel, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByDepartmentType(
    workspaceId: string,
    departmentType: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { departmentType, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findActive(
    workspaceId: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findActiveAndEffective(
    workspaceId: string,
    referenceDate: Date,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: [
        {
          isActive: true,
          effectiveFrom: LessThanOrEqual(referenceDate),
          effectiveTo: MoreThanOrEqual(referenceDate),
        },
        {
          isActive: true,
          effectiveFrom: LessThanOrEqual(referenceDate),
          effectiveTo: undefined,
        },
      ],
      order: { priority: 'DESC' },
    });
  }

  async findByOrganizationLevelId(
    workspaceId: string,
    organizationLevelId: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { organizationLevelId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findWithRelations(
    workspaceId: string,
    id: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: [
        'resourcePermissions',
        'systemActions',
        'accessLimitations',
        'organizationLevel',
      ],
    });
  }

  async findByIdsTemplate(
    workspaceId: string,
    ids: string[],
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async findSystemTemplates(
    workspaceId: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isSystemTemplate: true, isActive: true },
      order: { priority: 'DESC' },
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
