import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department-hierarchy/mkt-department-hierarchy.workspace-entity';
import { DEPARTMENT_TYPE } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/mkt-department.workspace-entity';
import { MktDepartmentHierarchyService } from 'src/mkt-core/mkt-department/services/mkt-department-hierarchy.service';

export type Updated = MktDepartmentWorkspaceEntity & {
  id: string;
};

export type Metadata = {
  UpdateOneMktDepartmentHierarchy: {
    name: string;
    relationshipType: string;
    parentDepartmentId: string;
    childDepartmentId: string;
  };
};

@Injectable()
@WorkspaceQueryHook({
  key: 'mktDepartment.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktDepartmentUpdateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(
    MktDepartmentUpdateOnePostQueryHook.name,
  );

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly departmentHierarchyService: MktDepartmentHierarchyService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktDepartmentWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) return;
    const update: Updated = payload?.[0];

    if (!update) return;
    try {
      let metadata = update.metadata as unknown as Metadata;
      const { departmentType } = update;

      if (typeof metadata === 'string') metadata = JSON.parse(metadata);

      const hierarchyData = {
        ...metadata.UpdateOneMktDepartmentHierarchy,
        childDepartmentId: update.id,
      } as MktDepartmentHierarchyWorkspaceEntity;

      if (departmentType === DEPARTMENT_TYPE.TEAM) {
        await this.departmentHierarchyService.updateTeamDepartmentHierarchy(
          hierarchyData,
        );
      }
      // Perform any additional operations with the metadata if needed
      this.logger.log(
        `Department updated with metadata: ${JSON.stringify(metadata)}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing metadata for updated department: ${error.message}`,
      );
    }
  }
}
