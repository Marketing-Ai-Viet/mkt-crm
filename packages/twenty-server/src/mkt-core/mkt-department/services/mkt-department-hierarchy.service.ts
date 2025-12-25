import { Injectable } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';

@Injectable()
export class MktDepartmentHierarchyService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  private getWorkspaceId(): string {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) {
      throw new Error('Workspace ID not found in context');
    }

    return workspaceId;
  }

  private async getHierarchyRepository() {
    const workspaceId = this.getWorkspaceId();

    return this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      MktDepartmentHierarchyWorkspaceEntity,
      { shouldBypassPermissionChecks: true },
    );
  }

  async createTeamDepartmentHierarchy(
    hierarchyData: MktDepartmentHierarchyWorkspaceEntity,
  ): Promise<void> {
    const hierarchyRepo = await this.getHierarchyRepository();
    const hierarchy = hierarchyRepo.create(hierarchyData);

    await hierarchyRepo.save(hierarchy);
  }

  async updateTeamDepartmentHierarchy(
    hierarchyData: MktDepartmentHierarchyWorkspaceEntity,
  ): Promise<void> {
    const hierarchyRepo = await this.getHierarchyRepository();
    const hierarchy = await hierarchyRepo.findOneBy({
      childDepartmentId: hierarchyData.childDepartmentId,
    });

    if (hierarchy) {
      await hierarchyRepo.update(hierarchy.id, hierarchyData);
    }
  }
}
