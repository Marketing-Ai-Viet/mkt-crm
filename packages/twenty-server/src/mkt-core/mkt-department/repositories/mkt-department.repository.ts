import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { BaseWorkspaceRepository } from 'src/mkt-core/common/repositories';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department.workspace-entity';

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
   * Find department by code
   */
  async findByCode(
    workspaceId: string,
    departmentCode: string,
  ): Promise<MktDepartmentWorkspaceEntity | null> {
    return this.findOne(workspaceId, { departmentCode });
  }

  /**
   * Find departments by manager ID
   */
  async findByManagerId(
    workspaceId: string,
    managerId: string,
  ): Promise<MktDepartmentWorkspaceEntity[]> {
    return this.findMany(workspaceId, { managerId });
  }
}
