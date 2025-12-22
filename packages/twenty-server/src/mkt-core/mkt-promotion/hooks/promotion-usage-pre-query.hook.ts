import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { FindManyResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import {
  ObjectRecordOrderBy,
  OrderByDirection,
} from 'src/engine/api/graphql/workspace-query-builder/interfaces/object-record.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';

type PromotionUsageFilter = Record<string, unknown>;

/**
 * PromotionUsageFindManyPreQueryHook - Pre-query hook cho mktPromotionUsage findMany
 *
 * Chức năng:
 * - Thêm ordering mặc định: appliedAt DESC
 * - Hiển thị promotion usage gần nhất trước
 */
@Injectable()
@WorkspaceQueryHook('mktPromotionUsage.findMany')
export class PromotionUsageFindManyPreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: FindManyResolverArgs<PromotionUsageFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<PromotionUsageFilter, ObjectRecordOrderBy>> {
    const existingOrderBy = payload.orderBy || [];

    // Thêm ordering mặc định: promotion usage gần nhất trước
    if (existingOrderBy.length === 0) {
      payload.orderBy = [{ appliedAt: OrderByDirection.DescNullsLast }];
    }

    this.logger.debug('Applied promotion usage findMany pre-query ordering', {
      orderBy: payload.orderBy,
    });

    return payload;
  }
}
