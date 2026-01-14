import { Injectable } from '@nestjs/common';

import { FindOptionsWhere, IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-sub-manager.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktDepartmentSubManagerRepository - Data access layer for Department Sub Manager entity
 *
 * Extends BaseWorkspaceRepository for common CRUD operations.
 * Provides specialized methods for managing sub-manager assignments.
 */
@Injectable()
export class MktDepartmentSubManagerRepository extends BaseWorkspaceRepository<MktDepartmentSubManagerWorkspaceEntity> {
  constructor(
    twentyORMGlobalManager: TwentyORMGlobalManager,
    scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {
    super(
      twentyORMGlobalManager,
      scopedWorkspaceContextFactory,
      MktDepartmentSubManagerWorkspaceEntity,
      MktDepartmentSubManagerRepository.name,
    );
  }

  // ============================================
  // SPECIALIZED FIND OPERATIONS
  // ============================================

  /**
   * Find all sub-managers for a department
   */
  async findByDepartmentId(
    departmentId: string,
    options?: { activeOnly?: boolean },
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    const repository = await this.getRepository();

    const whereClause: Record<string, unknown> = {
      departmentId,
      deletedAt: IsNull(),
    };

    if (options?.activeOnly) {
      whereClause.isActive = true;
    }

    return repository.find({
      where: whereClause,
      order: { isPrimary: 'DESC', assignedAt: 'ASC' },
    });
  }

  /**
   * Find all department assignments for a workspace member
   */
  async findByWorkspaceMemberId(
    workspaceMemberId: string,
    options?: { activeOnly?: boolean },
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    const repository = await this.getRepository();

    const whereClause: Record<string, unknown> = {
      workspaceMemberId,
      deletedAt: IsNull(),
    };

    if (options?.activeOnly) {
      whereClause.isActive = true;
    }

    return repository.find({
      where: whereClause,
      order: { isPrimary: 'DESC', assignedAt: 'ASC' },
    });
  }

  /**
   * Find specific assignment by department and workspace member
   */
  async findByDepartmentAndMember(
    departmentId: string,
    workspaceMemberId: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity | null> {
    return this.findOne({
      departmentId,
      workspaceMemberId,
      deletedAt: IsNull(),
    });
  }

  /**
   * Find primary sub-manager for a department
   */
  async findPrimaryByDepartmentId(
    departmentId: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity | null> {
    return this.findOne({
      departmentId,
      isPrimary: true,
      isActive: true,
      deletedAt: IsNull(),
    });
  }

  /**
   * Check if assignment exists
   */
  async assignmentExists(
    departmentId: string,
    workspaceMemberId: string,
  ): Promise<boolean> {
    return this.existsWhere({
      departmentId,
      workspaceMemberId,
    });
  }

  // ============================================
  // SPECIALIZED CREATE OPERATIONS
  // ============================================

  /**
   * Create new sub-manager assignment with defaults
   */
  async createAssignment(
    data: Partial<MktDepartmentSubManagerWorkspaceEntity>,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity> {
    return this.create({
      ...data,
      assignedAt: data.assignedAt ?? DateTimeUtils.now().toJSDate(),
      isActive: data.isActive ?? true,
      isPrimary: data.isPrimary ?? false,
    });
  }

  /**
   * Bulk create sub-manager assignments
   */
  async bulkCreateAssignments(
    assignments: Array<Partial<MktDepartmentSubManagerWorkspaceEntity>>,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    if (assignments.length === 0) {
      return [];
    }

    const now = DateTimeUtils.now().toJSDate();

    const items = assignments.map((data) => ({
      ...data,
      assignedAt: data.assignedAt ?? now,
      isActive: data.isActive ?? true,
      isPrimary: data.isPrimary ?? false,
    }));

    return this.bulkCreate(items);
  }

  // ============================================
  // SPECIALIZED UPDATE OPERATIONS
  // ============================================

  /**
   * Set primary sub-manager for a department
   * Unsets any existing primary first
   */
  async setPrimary(departmentId: string, subManagerId: string): Promise<void> {
    const repository = await this.getRepository();

    // Unset existing primary
    await repository.update(
      { departmentId, isPrimary: true },
      { isPrimary: false },
    );

    // Set new primary
    await repository.update(subManagerId, { isPrimary: true });
  }

  /**
   * Deactivate sub-manager assignment
   */
  async deactivate(id: string): Promise<void> {
    await this.update(id, { isActive: false });
  }

  /**
   * Activate sub-manager assignment
   */
  async activate(id: string): Promise<void> {
    await this.update(id, { isActive: true });
  }

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  /**
   * Remove all sub-manager assignments for a department
   */
  async removeAllByDepartmentId(departmentId: string): Promise<number> {
    const affected = await this.softDeleteWhere({ departmentId });

    this.logger.log(
      `Removed ${affected} sub-manager assignments for department ${departmentId}`,
    );

    return affected;
  }

  /**
   * Remove all sub-manager assignments for a workspace member
   */
  async removeAllByWorkspaceMemberId(
    workspaceMemberId: string,
  ): Promise<number> {
    const affected = await this.softDeleteWhere({
      workspaceMemberId,
    });

    this.logger.log(
      `Removed ${affected} sub-manager assignments for member ${workspaceMemberId}`,
    );

    return affected;
  }

  // ============================================
  // SPECIALIZED COUNT OPERATIONS
  // ============================================

  /**
   * Count sub-managers for a department
   */
  async countByDepartmentId(
    departmentId: string,
    options?: { activeOnly?: boolean },
  ): Promise<number> {
    const whereClause: Record<string, unknown> = {
      departmentId,
      deletedAt: IsNull(),
    };

    if (options?.activeOnly) {
      whereClause.isActive = true;
    }

    return this.count(
      whereClause as FindOptionsWhere<MktDepartmentSubManagerWorkspaceEntity>,
    );
  }

  /**
   * Count department assignments for a workspace member
   */
  async countByWorkspaceMemberId(
    workspaceMemberId: string,
    options?: { activeOnly?: boolean },
  ): Promise<number> {
    const whereClause: Record<string, unknown> = {
      workspaceMemberId,
      deletedAt: IsNull(),
    };

    if (options?.activeOnly) {
      whereClause.isActive = true;
    }

    return this.count(
      whereClause as FindOptionsWhere<MktDepartmentSubManagerWorkspaceEntity>,
    );
  }
}
