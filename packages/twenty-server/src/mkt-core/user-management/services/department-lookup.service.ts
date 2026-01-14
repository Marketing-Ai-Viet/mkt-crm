import { Injectable, Logger } from '@nestjs/common';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { MktDepartmentHierarchyRepository } from 'src/mkt-core/mkt-department/repositories';

@Injectable()
export class DepartmentLookupService {
  private readonly logger = new Logger(DepartmentLookupService.name);

  constructor(
    private readonly departmentHierarchyRepository: MktDepartmentHierarchyRepository,
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

      const hierarchy =
        await this.departmentHierarchyRepository.findByChildDepartmentId(
          teamId,
        );

      this.logger.log(
        `Found departmentId ${hierarchy?.parentDepartmentId} for teamId ${teamId}`,
      );

      return hierarchy?.parentDepartmentId ?? null;
    } catch (error) {
      this.logger.warn(
        `Failed to get departmentId from teamId ${teamId}: ${error.message}`,
      );

      return null;
    }
  }
}
