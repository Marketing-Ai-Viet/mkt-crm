import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { REPOSITORY_MESSAGES } from 'src/mkt-core/common/messages';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department.workspace-entity';

/**
 * MktDepartmentRepository - Data access layer for Department entity
 *
 * Responsibilities:
 * - Database operations for MktDepartment entity
 * - Query building and execution
 * - Thread-safe workspace context handling
 */
@Injectable()
export class MktDepartmentRepository {
  private readonly logger = new Logger('MktDepartment:Repository');

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
  ): Promise<WorkspaceRepository<MktDepartmentWorkspaceEntity>> {
    const wsId =
      workspaceId ?? this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!wsId) {
      throw new NotFoundException(
        REPOSITORY_MESSAGES.ERROR.WORKSPACE_NOT_FOUND,
      );
    }

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      wsId,
      MktDepartmentWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  // ============================================
  // FIND OPERATIONS
  // ============================================

  /**
   * Find department by ID
   */
  async findById(
    workspaceId: string,
    departmentId: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { id: departmentId } });
  }

  /**
   * Find department by code
   */
  async findByCode(
    workspaceId: string,
    departmentCode: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    const repository = await this.getRepository(workspaceId);

    return repository.findOne({ where: { departmentCode } });
  }

  /**
   * Find all departments
   */
  async findAll(workspaceId: string): Promise<MktDepartmentWorkspaceEntity[]> {
    const repository = await this.getRepository(workspaceId);

    return repository.find();
  }

  /**
   * Check if department exists
   */
  async exists(workspaceId: string, departmentId: string): Promise<boolean> {
    const repository = await this.getRepository(workspaceId);

    return repository.existsBy({ id: departmentId });
  }

  // ============================================
  // CREATE OPERATIONS
  // ============================================

  /**
   * Create new department
   */
  async create(
    workspaceId: string,
    data: Partial<MktDepartmentWorkspaceEntity>,
  ): Promise<MktDepartmentWorkspaceEntity> {
    const repository = await this.getRepository(workspaceId);
    const department = repository.create(data);

    return repository.save(department);
  }

  // ============================================
  // UPDATE OPERATIONS
  // ============================================

  /**
   * Update department by ID
   */
  async update(
    workspaceId: string,
    departmentId: string,
    data: Partial<MktDepartmentWorkspaceEntity>,
  ): Promise<void> {
    const repository = await this.getRepository(workspaceId);

    await repository.update(departmentId, data);
  }

  /**
   * Update and return the updated department
   */
  async updateAndReturn(
    workspaceId: string,
    departmentId: string,
    data: Partial<MktDepartmentWorkspaceEntity>,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    await this.update(workspaceId, departmentId, data);

    return this.findById(workspaceId, departmentId);
  }
}
