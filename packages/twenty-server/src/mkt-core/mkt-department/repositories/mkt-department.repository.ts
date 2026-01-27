import { Injectable } from '@nestjs/common';

import { ILike } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';
import {
  SearchDepartmentParams,
  SearchDepartmentResult,
} from 'src/mkt-core/mkt-department/types';

/**
 * MktDepartmentRepository - Data access layer for Department entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Add specialized department-specific methods here.
 */
@Injectable()
export class MktDepartmentRepository extends BaseWorkspaceRepository<MktDepartmentWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDepartmentWorkspaceEntity,
      MktDepartmentRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED OPERATIONS
  // ============================================

  /**
   * Relations to load for full department details
   */
  private static readonly FULL_RELATIONS = [
    'manager',
    'subManagers',
    'subManagers.workspaceMember',
  ];

  /**
   * Find department by ID with full relations (manager, subManagers)
   */
  async findByIdWithRelations(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id: departmentId },
      relations: MktDepartmentRepository.FULL_RELATIONS,
    });
  }

  /**
   * Find department by code with full relations (manager, subManagers)
   */
  async findByCodeWithRelations(
    workspaceId: string,
    departmentCode: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { departmentCode },
      relations: MktDepartmentRepository.FULL_RELATIONS,
    });
  }

  /**
   * Find department by code
   */
  async findByCode(
    departmentCode: string,
    workspaceId?: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { departmentCode },
    });
  }

  /**
   * Find department by ID with explicit workspace context
   */
  async findByIdInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id },
    });
  }

  /**
   * Find departments by manager ID
   */
  async findByManagerId(
    managerId: string,
    workspaceId?: string,
  ): Promise<MktDepartmentWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find({
      where: { managerId },
    });
  }

  /**
   * Create department with explicit workspace context
   */
  async createInWorkspace(
    data: Partial<MktDepartmentWorkspaceEntity>,
    workspaceId: string,
  ): Promise<MktDepartmentWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);
    const entity = repository.create(data);

    return repository.save(entity);
  }

  /**
   * Update and return department with explicit workspace context
   */
  async updateAndReturnInWorkspace(
    id: string,
    data: Partial<MktDepartmentWorkspaceEntity>,
    workspaceId: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data as never);

    return repository.findOne({ where: { id } });
  }

  /**
   * Soft delete department with explicit workspace context
   */
  async softDeleteInWorkspace(id: string, workspaceId: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, {
      deletedAt: new Date().toISOString(),
    } as never);

    this.logger.log(`Soft deleted department ${id}`);
  }

  /**
   * Search departments with filters and pagination
   */
  async searchInWorkspace(
    workspaceId: string,
    params: SearchDepartmentParams,
  ): Promise<SearchDepartmentResult> {
    const repository = await this.getRepository(workspaceId);

    const {
      keyword,
      departmentCode,
      departmentType,
      managerId,
      isActive,
      requiresKpiTracking,
      page = 1,
      limit = 20,
    } = params;

    // Build where conditions
    const where: Record<string, unknown>[] = [];
    const baseConditions: Record<string, unknown> = {};

    // Exact match filters
    if (departmentCode) {
      baseConditions.departmentCode = departmentCode;
    }
    if (departmentType) {
      baseConditions.departmentType = departmentType;
    }
    if (managerId) {
      baseConditions.managerId = managerId;
    }
    if (isActive !== undefined) {
      baseConditions.isActive = isActive;
    }
    if (requiresKpiTracking !== undefined) {
      baseConditions.requiresKpiTracking = requiresKpiTracking;
    }

    // Keyword search (tìm kiếm trong departmentName và departmentNameEn)
    if (keyword) {
      where.push(
        { ...baseConditions, departmentName: ILike(`%${keyword}%`) },
        { ...baseConditions, departmentNameEn: ILike(`%${keyword}%`) },
        { ...baseConditions, departmentCode: ILike(`%${keyword}%`) },
      );
    } else {
      where.push(baseConditions);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await repository.findAndCount({
      where: where.length > 0 ? where : undefined,
      relations: MktDepartmentRepository.FULL_RELATIONS,
      skip,
      take: limit,
      order: { displayOrder: 'ASC', departmentName: 'ASC' },
    });

    return { items, total };
  }
}
