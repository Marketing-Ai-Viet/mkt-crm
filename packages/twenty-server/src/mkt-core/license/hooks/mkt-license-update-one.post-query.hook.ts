import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
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

  constructor() {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: MktLicenseWorkspaceEntity[],
  ): Promise<void> {}
}
