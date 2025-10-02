import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { FieldActorSource } from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { MktLicenseHistoryWorkspaceEntity } from 'src/mkt-core/license/objects/mkt-license-history.workspace-entity';

@Injectable()
@WorkspaceQueryHook({
  key: 'mktLicense.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class MktLicenseCreateOnePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(MktLicenseCreateOnePostQueryHook.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: MktLicenseWorkspaceEntity[],
  ): Promise<void> {
    const workspaceId = this.scopedWorkspaceContextFactory.create().workspaceId;

    if (!workspaceId) return;

    const createdLicense = payload?.[0];
    if (!createdLicense) return;

    try {
      const licenseRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseWorkspaceEntity>(
          workspaceId,
          'mktLicense',
          { shouldBypassPermissionChecks: true },
        );

      const licenseHistoryRepository =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktLicenseHistoryWorkspaceEntity>(
          workspaceId,
          'mktLicenseHistory',
          { shouldBypassPermissionChecks: true },
        );

      // Create initial history item for license creation
      const historyItem = {
        name: `License Created - ${new Date().toISOString()}`,
        action: 'LICENSE_CREATED',
        note: `License initially created with status: ${createdLicense.status || 'Unknown'}`,
      };

      // 1. Update the license with initial history (JSON field)
      await licenseRepository.update(
        { id: createdLicense.id },
        {
          history: JSON.stringify([historyItem]) as unknown as JSON,
        },
      );

      // 2. Create initial record in mktLicenseHistory table
      const newLicenseHistory = licenseHistoryRepository.create({
        name: historyItem.name,
        action: historyItem.action,
        note: historyItem.note,
        mktLicenseId: createdLicense.id,
        position: 1,
        createdBy: {
          source: FieldActorSource.MANUAL,
          workspaceMemberId: authContext.user?.id || null,
          name:
            authContext.user?.firstName && authContext.user?.lastName
              ? `${authContext.user.firstName} ${authContext.user.lastName}`
              : authContext.user?.email || 'Unknown User',
          context: {},
        },
      });

      await licenseHistoryRepository.save(newLicenseHistory);
    } catch (error) {
      this.logger.error('Failed to create license history:', {
        error: error.message,
        licenseId: createdLicense.id,
      });
    }
  }
}
