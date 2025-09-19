import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';

import { MktVariantValueWorkspaceEntity } from 'src/mkt-core/product/objects/mkt-variant-value.workspace-entity';
import { VariantService } from 'src/mkt-core/product/services/variant.service';

@Injectable()
@WorkspaceQueryHook('mktVariantValue.updateOne')
export class MktVariantValueUpdateOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(
    MktVariantValueUpdateOnePreQueryHook.name,
  );

  constructor(private readonly variantService: VariantService) {}

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs<MktVariantValueWorkspaceEntity>,
  ): Promise<UpdateOneResolverArgs<MktVariantValueWorkspaceEntity>> {
    const input = payload?.data;

    if (!input || input.dayDuration === undefined) {
      return payload;
    }

    try {
      const updatedVariantValue = await this.variantService.updateVariantValue(
        payload.id,
        input.dayDuration,
      );

      return {
        ...payload,
        data: {
          ...input,
          mktValueId: updatedVariantValue.mktValueId,
          name: updatedVariantValue.name,
        },
      };
    } catch (error) {
      this.logger.error(`Error in pre-query hook: ${error}`);
      throw error;
    }
  }
}
