import { Injectable } from '@nestjs/common';

import { FindOptionsWhere, IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-sub-manager.workspace-entity';
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
    workspaceId: string,
    departmentId: string,
    options?: { activeOnly?: boolean },
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    workspaceMemberId: string,
    options?: { activeOnly?: boolean },
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

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
    workspaceId: string,
    departmentId: string,
    workspaceMemberId: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        departmentId,
        workspaceMemberId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Find by ID with workspace context
   */
  async findByIdWithWorkspace(
    workspaceId: string,
    id: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  /**
   * Find primary sub-manager for a department
   */
  async findPrimaryByDepartmentId(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({
      where: {
        departmentId,
        isPrimary: true,
        isActive: true,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Check if assignment exists
   */
  async assignmentExists(
    workspaceId: string,
    departmentId: string,
    workspaceMemberId: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    return repository.existsBy({
      departmentId,
      workspaceMemberId,
      deletedAt: IsNull(),
    });
  }

  // ============================================
  // SPECIALIZED CREATE OPERATIONS
  // ============================================

  /**
   * Create new sub-manager assignment with defaults
   */
  async createAssignment(
    workspaceId: string,
    data: Partial<MktDepartmentSubManagerWorkspaceEntity>,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const entity = repository.create({
      ...data,
      assignedAt: data.assignedAt ?? DateTimeUtils.now().toJSDate(),
      isActive: data.isActive ?? true,
      isPrimary: data.isPrimary ?? false,
    });

    return repository.save(entity);
  }

  /**
   * Bulk create sub-manager assignments
   */
  async bulkCreateAssignments(
    workspaceId: string,
    assignments: Array<Partial<MktDepartmentSubManagerWorkspaceEntity>>,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    if (assignments.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);
    const now = DateTimeUtils.now().toJSDate();

    const entities = assignments.map((data) =>
      repository.create({
        ...data,
        assignedAt: data.assignedAt ?? now,
        isActive: data.isActive ?? true,
        isPrimary: data.isPrimary ?? false,
      }),
    );

    return repository.save(entities);
  }

  // ============================================
  // SPECIALIZED UPDATE OPERATIONS
  // ============================================

  /**
   * Update sub-manager assignment
   */
  async updateAssignment(
    workspaceId: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data as never);
  }

  /**
   * Set primary sub-manager for a department
   * Unsets any existing primary first
   */
  async setPrimary(
    workspaceId: string,
    departmentId: string,
    subManagerId: string,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

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
  async deactivate(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, { isActive: false });
  }

  /**
   * Activate sub-manager assignment
   */
  async activate(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, { isActive: true });
  }

  // ============================================
  // SPECIALIZED DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete sub-manager assignment
   */
  async softDeleteAssignment(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    this.logger.log(`Soft deleted sub-manager assignment ${id}`);
  }

  /**
   * Remove all sub-manager assignments for a department
   */
  async removeAllByDepartmentId(
    workspaceId: string,
    departmentId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository.update({ departmentId }, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    const affected = result.affected ?? 0;

    this.logger.log(
      `Removed ${affected} sub-manager assignments for department ${departmentId}`,
    );

    return affected;
  }

  /**
   * Remove all sub-manager assignments for a workspace member
   */
  async removeAllByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository.update({ workspaceMemberId }, {
      deletedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    } as never);

    const affected = result.affected ?? 0;

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
    workspaceId: string,
    departmentId: string,
    options?: { activeOnly?: boolean },
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const whereClause: Record<string, unknown> = {
      departmentId,
      deletedAt: IsNull(),
    };

    if (options?.activeOnly) {
      whereClause.isActive = true;
    }

    return repository.count({
      where:
        whereClause as FindOptionsWhere<MktDepartmentSubManagerWorkspaceEntity>,
    });
  }

  /**
   * Count department assignments for a workspace member
   */
  async countByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
    options?: { activeOnly?: boolean },
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const whereClause: Record<string, unknown> = {
      workspaceMemberId,
      deletedAt: IsNull(),
    };

    if (options?.activeOnly) {
      whereClause.isActive = true;
    }

    return repository.count({
      where:
        whereClause as FindOptionsWhere<MktDepartmentSubManagerWorkspaceEntity>,
    });
  }

  /**
   * Hard delete all sub-managers for a department (for replacement)
   */
  async deleteByDepartmentId(
    departmentId: string,
    workspaceId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository.delete({ departmentId });

    const affected = result.affected ?? 0;

    this.logger.log(
      `Deleted ${affected} sub-managers for department ${departmentId}`,
    );

    return affected;
  }

  /**
   * Bulk create sub-managers with explicit workspace context
   */
  async bulkCreateInWorkspace(
    items: Array<Partial<MktDepartmentSubManagerWorkspaceEntity>>,
    workspaceId: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity[]> {
    if (items.length === 0) {
      return [];
    }

    const repository = await this.getRepository(workspaceId);
    const now = new Date();

    const entities = items.map((data) =>
      repository.create({
        ...data,
        assignedAt: data.assignedAt ?? now,
        isActive: data.isActive ?? true,
        isPrimary: data.isPrimary ?? false,
      }),
    );

    return repository.save(entities);
  }
}
