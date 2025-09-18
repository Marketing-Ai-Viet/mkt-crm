import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { ORDER_STATUS } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

@Injectable()
@WorkspaceQueryHook('mktOrder.createOne')
export class MktOrderCreateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(MktOrderCreateOnePreQueryHook.name);

  constructor(
    private readonly scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  ) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs<MktOrderWorkspaceEntity>,
  ): Promise<CreateOneResolverArgs<MktOrderWorkspaceEntity>> {
    const newPayload = {
      ...payload,
      data: {
        ...payload.data,
        status: ORDER_STATUS.WAIT,
      },
    };

    return newPayload;
  }
}
