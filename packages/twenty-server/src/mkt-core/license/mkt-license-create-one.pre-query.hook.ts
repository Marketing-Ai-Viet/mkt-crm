import { Injectable } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';

import { MktLicenseRenewService } from 'src/mkt-core/license/services/mkt-license.renew.service';
import { MktLicenseService } from './mkt-license.service';
import { MktLicenseWorkspaceEntity } from './mkt-license.workspace-entity';

@Injectable()
@WorkspaceQueryHook('mktLicense.createOne')
export class MktLicenseCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  constructor(
    private readonly mktLicenseService: MktLicenseService,
    private readonly mktLicenseRenewService: MktLicenseRenewService,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<MktLicenseWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktLicenseWorkspaceEntity>> {
    return payload;
  }
}
