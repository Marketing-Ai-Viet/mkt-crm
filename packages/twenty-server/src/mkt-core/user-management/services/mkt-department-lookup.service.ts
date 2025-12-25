import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';

@Injectable()
export class MktDepartmentLookupService {
  private readonly logger = new Logger(MktDepartmentLookupService.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async getDepartmentIdFromTeamId(
    teamId: string | null | undefined,
  ): Promise<string | null> {
    if (!teamId) {
      return null;
    }

    try {
      const workspaceId =
        this.scopedWorkspaceContextFactory.create().workspaceId;

      if (!workspaceId) {
        this.logger.warn('Workspace ID not found in context');

        return null;
      }

      // Query hierarchy where team is child to get parent department
      const hierarchyRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace(
          workspaceId,
          MktDepartmentHierarchyWorkspaceEntity,
          { shouldBypassPermissionChecks: true },
        );
      const hierarchy = await hierarchyRepo.findOne({
        where: { childDepartmentId: teamId },
      });

      this.logger.log(
        `Found departmentId ${hierarchy?.parentDepartmentId} for teamId ${teamId}`,
      );

      return hierarchy?.parentDepartmentId || null;
    } catch (error) {
      this.logger.warn(
        `Failed to get departmentId from teamId ${teamId}: ${error.message}`,
      );

      return null;
    }
  }
}
