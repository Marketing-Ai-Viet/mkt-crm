import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { DEPARTMENT_TYPE } from 'src/mkt-core/mkt-department/constants/mkt-department.constant';
import {
  DEPARTMENT_MESSAGES,
  MKT_DEPARTMENT_LOG_CONTEXT,
} from 'src/mkt-core/mkt-department/messages';
import { MktDepartmentHierarchyService } from 'src/mkt-core/mkt-department/services/mkt-department-hierarchy.service';
import { DepartmentCreateMetadata } from 'src/mkt-core/mkt-department/types';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/objects/mkt-department.workspace-entity';
import {
  parseJsonOrNull,
  safeJsonStringify,
} from 'src/mkt-core/utils/json.util';

type CreatedDepartment = MktDepartmentWorkspaceEntity & {
  id: string;
};

@Injectable()
@WorkspaceQueryHook({
  key: 'mktDepartment.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktDepartmentCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(
    `${MKT_DEPARTMENT_LOG_CONTEXT}:CreateHook`,
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
    const created: CreatedDepartment = payload?.[0];

    if (!created) return;
    try {
      const rawMetadata = created.metadata as unknown;
      const { departmentType } = created;

      const metadata =
        typeof rawMetadata === 'string'
          ? parseJsonOrNull<DepartmentCreateMetadata>(rawMetadata)
          : (rawMetadata as DepartmentCreateMetadata | null);

      if (!metadata?.CreateOneMktDepartmentHierarchy) return;

      const hierarchyData = {
        ...metadata.CreateOneMktDepartmentHierarchy,
        childDepartmentId: created.id,
      } as MktDepartmentHierarchyWorkspaceEntity;

      if (departmentType === DEPARTMENT_TYPE.TEAM) {
        await this.departmentHierarchyService.createTeamDepartmentHierarchy(
          hierarchyData,
        );
      }
      // Perform any additional operations with the metadata if needed
      this.logger.log(
        DEPARTMENT_MESSAGES.LOG.HOOK_CREATE_SUCCESS(
          safeJsonStringify(metadata) ?? '',
        ),
      );
    } catch (error) {
      this.logger.error(
        DEPARTMENT_MESSAGES.ERROR.HOOK_CREATE_FAILED(error.message),
      );
    }
  }
}
