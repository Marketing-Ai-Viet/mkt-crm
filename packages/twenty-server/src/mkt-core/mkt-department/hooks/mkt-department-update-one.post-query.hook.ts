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
import { DepartmentUpdateMetadata } from 'src/mkt-core/mkt-department/types';
import { MktDepartmentHierarchyWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department-hierarchy.workspace-entity';
import { MktDepartmentWorkspaceEntity } from 'src/mkt-core/mkt-department/workspace-entity/mkt-department.workspace-entity';
import {
  parseJsonOrNull,
  safeJsonStringify,
} from 'src/mkt-core/utils/json.util';

type UpdatedDepartment = MktDepartmentWorkspaceEntity & {
  id: string;
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
    `${MKT_DEPARTMENT_LOG_CONTEXT}:UpdateHook`,
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
    const updated: UpdatedDepartment = payload?.[0];

    if (!updated) return;
    try {
      const rawMetadata = updated.metadata as unknown;
      const { departmentType } = updated;

      const metadata =
        typeof rawMetadata === 'string'
          ? parseJsonOrNull<DepartmentUpdateMetadata>(rawMetadata)
          : (rawMetadata as DepartmentUpdateMetadata | null);

      if (!metadata?.UpdateOneMktDepartmentHierarchy) return;

      const hierarchyData = {
        ...metadata.UpdateOneMktDepartmentHierarchy,
        childDepartmentId: updated.id,
      } as MktDepartmentHierarchyWorkspaceEntity;

      if (departmentType === DEPARTMENT_TYPE.TEAM) {
        await this.departmentHierarchyService.updateTeamDepartmentHierarchy(
          hierarchyData,
        );
      }
      // Perform any additional operations with the metadata if needed
      this.logger.log(
        DEPARTMENT_MESSAGES.LOG.HOOK_UPDATE_SUCCESS(
          safeJsonStringify(metadata) ?? '',
        ),
      );
    } catch (error) {
      this.logger.error(
        DEPARTMENT_MESSAGES.ERROR.HOOK_UPDATE_FAILED(error.message),
      );
    }
  }
}
