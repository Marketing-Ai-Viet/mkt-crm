import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import {
  DataAccessPolicyType,
  RiskLevel,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants';
import { MktDataAccessPolicyWorkspaceEntity } from 'src/mkt-core/mkt-rbac-enterprise-grade/workspace-entities';

/**
 * MktDataAccessPolicyRepository - Data access layer for Data Access Policy entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for policy lookups.
 */
@Injectable()
export class MktDataAccessPolicyRepository extends BaseWorkspaceRepository<MktDataAccessPolicyWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDataAccessPolicyWorkspaceEntity,
      MktDataAccessPolicyRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  async findByObjectName(
    workspaceId: string,
    objectName: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { objectName, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByDepartmentId(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { departmentId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findBySpecificMemberId(
    workspaceId: string,
    specificMemberId: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { specificMemberId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByOrganizationLevelId(
    workspaceId: string,
    organizationLevelId: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { organizationLevelId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByPermissionTemplateId(
    workspaceId: string,
    permissionTemplateId: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { permissionTemplateId, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByDataAccessPolicyType(
    workspaceId: string,
    policyType: DataAccessPolicyType,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { policyType, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findByRiskLevel(
    workspaceId: string,
    riskLevel: RiskLevel,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { riskLevel, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findActive(
    workspaceId: string,
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async findForMemberAndObject(
    workspaceId: string,
    memberId: string,
    objectName: string,
    departmentId?: string,
    organizationLevelId?: string,
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
    workspaceId: string,
    id: string,
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

  async findByIdsWithActive(
    workspaceId: string,
    ids: string[],
  ): Promise<MktDataAccessPolicyWorkspaceEntity[]> {
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
