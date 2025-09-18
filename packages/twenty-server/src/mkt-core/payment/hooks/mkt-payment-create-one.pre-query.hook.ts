import { Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktPaymentWorkspaceEntity } from 'src/mkt-core/payment/mkt-payment.workspace-entity';
import { MktPaymentPrepareService } from 'src/mkt-core/payment/services/mkt-payment-prepare.service';

@WorkspaceQueryHook('mktPayment.createOne')
export class MktPaymentCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktPaymentCreateOnePreQueryHook.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
    private readonly mktPaymentPrepareService: MktPaymentPrepareService,
  ) {}

  async execute(
    authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<MktPaymentWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktPaymentWorkspaceEntity>> {
    return this.mktPaymentPrepareService.prepareCreateOnePayload(payload);
  }
}
