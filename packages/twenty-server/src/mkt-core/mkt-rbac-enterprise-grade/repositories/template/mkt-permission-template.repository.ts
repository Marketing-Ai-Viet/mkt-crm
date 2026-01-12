import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import {
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPermissionTemplateWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

@Injectable()
export class MktPermissionTemplateRepository {
  private readonly logger = new Logger(MktPermissionTemplateRepository.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktPermissionTemplateWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktPermissionTemplateWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByTemplateKey(
    templateKey: string,
    workspaceId?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { templateKey, isActive: true },
    });
  }

  async findByHierarchyLevel(
    hierarchyLevel: number,
    workspaceId?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { hierarchyLevel, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByDepartmentType(
    departmentType: string,
    workspaceId?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { departmentType, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findActive(
    workspaceId?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findActiveAndEffective(
    referenceDate: Date,
    workspaceId?: string,
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
    organizationLevelId: string,
    workspaceId?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { organizationLevelId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findWithRelations(
    id: string,
    workspaceId?: string,
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

  async findByIds(
    ids: string[],
    workspaceId?: string,
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
    workspaceId?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isSystemTemplate: true, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async save(
    entity: Partial<MktPermissionTemplateWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktPermissionTemplateWorkspaceEntity> {
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

  async delete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.delete({ id });
  }

  async softDelete(id: string, workspaceId?: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.softDelete({ id });
  }

  async count(
    where?: FindOptionsWhere<MktPermissionTemplateWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
