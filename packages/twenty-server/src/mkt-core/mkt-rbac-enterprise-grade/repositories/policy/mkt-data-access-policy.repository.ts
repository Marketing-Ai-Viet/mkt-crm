import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { FindOptionsWhere, In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';
import {
  PolicyType,
  RiskLevel,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';

@Injectable()
export class MktDataAccessPolicyRepository {
  private readonly logger = new Logger(MktDataAccessPolicyRepository.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktDataAccessPolicyWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktDataAccessPolicyWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async findById(
    id: string,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

  async findByObjectName(
    objectName: string,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { objectName, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByDepartmentId(
    departmentId: string,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { departmentId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findBySpecificMemberId(
    specificMemberId: string,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { specificMemberId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByOrganizationLevelId(
    organizationLevelId: string,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { organizationLevelId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByPermissionTemplateId(
    permissionTemplateId: string,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { permissionTemplateId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByPolicyType(
    policyType: PolicyType,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { policyType, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByRiskLevel(
    riskLevel: RiskLevel,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { riskLevel, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findActive(
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findForMemberAndObject(
    memberId: string,
    objectName: string,
    departmentId?: string,
    organizationLevelId?: string,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    const qb = repository
      .createQueryBuilder('policy')
      .where('policy.objectName = :objectName', { objectName })
      .andWhere('policy.isActive = :isActive', { isActive: true })
      .andWhere(
        '(policy.specificMemberId = :memberId OR policy.specificMemberId IS NULL)',
        { memberId },
      );

    if (departmentId) {
      qb.andWhere(
        '(policy.departmentId = :departmentId OR policy.departmentId IS NULL)',
        { departmentId },
      );
    }

    if (organizationLevelId) {
      qb.andWhere(
        '(policy.organizationLevelId = :organizationLevelId OR policy.organizationLevelId IS NULL)',
        { organizationLevelId },
      );
    }

    return qb.orderBy('policy.priority', 'DESC').getMany();
  }

  async findWithRelations(
    id: string,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
      relations: [
        'department',
        'specificMember',
        'organizationLevel',
        'permissionTemplate',
      ],
    });
  }

  async findByIds(
    ids: string[],
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { id: In(ids) },
    });
  }

  async save(
    entity: Partial<MktDataAccessPolicyWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity> {
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
    where?: FindOptionsWhere<MktDataAccessPolicyWorkspaceEntity>,
    workspaceId?: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    return repository.count({ where });
  }
}
