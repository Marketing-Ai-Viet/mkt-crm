import { Logger } from '@nestjs/common';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import {
  MKT_LICENSE_RENEWING_EVENT,
  MKT_LICENSE_STATUS,
} from 'src/mkt-core/license/license.constants';
import { MktLicenseWorkspaceEntity } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { LicenseRenewingEvent } from 'src/mkt-core/license/types/license-event.types';

@WorkspaceQueryHook('mktLicense.updateOne')
export class MktLicenseUpdateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktLicenseUpdateOnePreQueryHook.name);

  constructor(private readonly workspaceEventEmitter: WorkspaceEventEmitter) {}
  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<MktLicenseWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<MktLicenseWorkspaceEntity>> {
    this.logger.log(
      `MktLicenseUpdateOnePreQueryHook called with payload: ${JSON.stringify(payload)}`,
    );

    const status = payload?.data?.status;
    const licenseId = payload?.id;

    if (status === MKT_LICENSE_STATUS.RENEWING) {
      this.logger.log(
        `License ${licenseId} is being renewed. Emitting RENEWING event.`,
      );

      // Emit custom event for license renewing
      this.workspaceEventEmitter.emitCustomBatchEvent<LicenseRenewingEvent>(
        MKT_LICENSE_RENEWING_EVENT,
        [
          {
            licenseId: licenseId,
            status: status,
            timestamp: new Date().toISOString(),
            userId: authContext?.user?.id,
            workspaceId: authContext?.workspace?.id,
          },
        ],
        authContext?.workspace?.id,
      );

      this.logger.log(`RENEWING event emitted for license ${licenseId}`);
    }

    return payload;
  }
}
