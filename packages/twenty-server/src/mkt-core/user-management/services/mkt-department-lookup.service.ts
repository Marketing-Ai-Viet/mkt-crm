import { Injectable, Logger } from '@nestjs/common';

import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';

@Injectable()
export class MktDepartmentLookupService {
  private readonly logger = new Logger(MktDepartmentLookupService.name);

  constructor(private readonly mktRepo: MktRepositoryService) {}

  async getDepartmentIdFromTeamId(
    teamId: string | null | undefined,
  ): Promise<string | null> {
    if (!teamId) {
      return null;
    }

    try {
      // Query hierarchy where team is child to get parent department
      const hierarchyRepo = await this.mktRepo.getRepository(
        MktDepartmentHierarchyWorkspaceEntity,
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
