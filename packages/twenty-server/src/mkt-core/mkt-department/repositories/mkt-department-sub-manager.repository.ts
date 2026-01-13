import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { REPOSITORY_MESSAGES } from 'src/mkt-core/common/messages';
import { MktDepartmentSubManagerWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-sub-manager.workspace-entity';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';

/**
 * MktDepartmentSubManagerRepository - Data access layer for Department Sub Manager entity
 *
 * Responsibilities:
 * - Database operations for MktDepartmentSubManager entity
 * - Manage sub-manager assignments for departments
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktDepartmentSubManagerRepository {
  private readonly logger = new Logger('MktDepartmentSubManager:Repository');

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  // ============================================
  // REPOSITORY ACCESS
  // ============================================

  /**
   * Get repository for specific workspace
   * Thread-safe: Uses TwentyORMGlobalManager directly
   */
  async getRepository(
    workspaceId?: string,
  ): Promise<WorkspaceRepository<MktDepartmentSubManagerWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(
        REPOSITORY_MESSAGES.ERROR.WORKSPACE_NOT_FOUND,
      );
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktDepartmentSubManagerWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find sub-manager assignment by ID
   */
  async findById(
    workspaceId: string,
    id: string,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id } });
  }

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
  async exists(
    workspaceId: string,
    departmentId: string,
    workspaceMemberId: string,
  ): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    return repository.existsBy({
      departmentId,
      workspaceMemberId,
    });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new sub-manager assignment
   */
  async create(
    workspaceId: string,
    data: Partial<MktDepartmentSubManagerWorkspaceEntity>,
  ): Promise<MktDepartmentSubManagerWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);

    const assignment = repository.create({
      ...data,
      assignedAt: data.assignedAt ?? DateTimeUtils.now().toJSDate(),
      isActive: data.isActive ?? true,
      isPrimary: data.isPrimary ?? false,
    });

    return repository.save(assignment);
  }

  /**
   * Bulk create sub-manager assignments
   */
  async bulkCreate(
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
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update sub-manager assignment by ID
   */
  async update(
    workspaceId: string,
    id: string,
    data: Partial<MktDepartmentSubManagerWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(id, data);
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
  // DELETE OPERATIONS
  // ============================================

  /**
   * Soft delete sub-manager assignment
   */
  async softDelete(workspaceId: string, id: string): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.softDelete(id);

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

    const result = await repository.softDelete({ departmentId });

    this.logger.log(
      `Removed ${result.affected ?? 0} sub-manager assignments for department ${departmentId}`,
    );

    return result.affected ?? 0;
  }

  /**
   * Remove all sub-manager assignments for a workspace member
   */
  async removeAllByWorkspaceMemberId(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<number> {
    const repository = await this.getRepository(workspaceId);

    const result = await repository.softDelete({ workspaceMemberId });

    this.logger.log(
      `Removed ${result.affected ?? 0} sub-manager assignments for member ${workspaceMemberId}`,
    );

    return result.affected ?? 0;
  }

  // ============================================
  // COUNT OPERATIONS
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

    return repository.count({ where: whereClause });
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

    return repository.count({ where: whereClause });
  }
}
