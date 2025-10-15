import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { MKT_ORDER_EVENT_TYPES } from 'src/mkt-core/common/common.type';
import { MktCommonOrderService } from 'src/mkt-core/common/service/mkt-common-order.service';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';

@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktLicenseUpdateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(MktLicenseUpdateOnePostQueryHook.name);

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly mktCommonOrderService: MktCommonOrderService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: MktLicenseWorkspaceEntity[],
  ): Promise<void> {
    const updatedLicense = payload?.[0];

    if (!updatedLicense) return;

    this.logger.log(
      `License updated: ${updatedLicense.id}, status: ${updatedLicense.status}`,
    );
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    try {
      this.mktCommonOrderService.eventUpdated(
        updatedLicense.mktOrderId,
        workspaceId,
        MKT_ORDER_EVENT_TYPES.FROM_LICENSE,
      );

      return;
    } catch (error) {
      this.logger.error(
        '[Order POST HOOK] Failed to create related entities',
        error,
      );
      throw error;
    }
  }
}
