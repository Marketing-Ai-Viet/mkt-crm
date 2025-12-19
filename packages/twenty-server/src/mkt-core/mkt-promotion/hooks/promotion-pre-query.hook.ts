import { Injectable, Logger } from '@nestjs/common';

import { WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import {
  FindManyResolverArgs,
  FindOneResolverArgs,
} from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import {
  ObjectRecordOrderBy,
  OrderByDirection,
} from 'src/engine/api/graphql/workspace-query-builder/interfaces/object-record.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { PROMOTION_LOG_CONTEXT } from 'src/mkt-core/mkt-promotion/constants';

type PromotionFilter = {
  deletedAt?: {
    is?: string;
  };
};

/**
 * PromotionPreQueryHook - Pre-query hook cho mktPromotion findOne
 *
 * Chức năng:
 * - Thêm filter mặc định: loại bỏ các promotion đã xóa (deletedAt IS NULL)
 * - Không thay đổi ordering cho findOne
 */
@Injectable()
@WorkspaceQueryHook('mktPromotion.findOne')
export class PromotionFindOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: FindOneResolverArgs<PromotionFilter>,
  ): Promise<FindOneResolverArgs<PromotionFilter>> {
    const existingFilter = payload.filter || {};

    // Thêm filter loại bỏ các promotion đã xóa nếu chưa có filter deletedAt
    if (!existingFilter.deletedAt) {
      payload.filter = {
        ...existingFilter,
        deletedAt: {
          is: 'NULL',
        },
      };
    }

    this.logger.debug('Applied findOne pre-query filters', {
      filter: payload.filter,
    });

    return payload;
  }
}

/**
 * PromotionFindManyPreQueryHook - Pre-query hook cho mktPromotion findMany
 *
 * Chức năng:
 * - Thêm filter mặc định: loại bỏ các promotion đã xóa (deletedAt IS NULL)
 * - Thêm ordering mặc định: priority DESC, createdAt DESC
 * - Ưu tiên hiển thị promotion có priority cao và mới tạo trước
 */
@Injectable()
@WorkspaceQueryHook('mktPromotion.findMany')
export class PromotionFindManyPreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: FindManyResolverArgs<PromotionFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<PromotionFilter, ObjectRecordOrderBy>> {
    const existingFilter = payload.filter || {};
    const existingOrderBy = payload.orderBy || [];

    // Thêm filter loại bỏ các promotion đã xóa nếu chưa có filter deletedAt
    if (!existingFilter.deletedAt) {
      payload.filter = {
        ...existingFilter,
        deletedAt: {
          is: 'NULL',
        },
      };
    }

    // Thêm ordering mặc định nếu chưa có orderBy
    // Priority cao hơn được hiển thị trước, nếu priority bằng nhau thì promotion mới hơn được ưu tiên
    if (existingOrderBy.length === 0) {
      payload.orderBy = [
        { priority: OrderByDirection.DescNullsLast },
        { createdAt: OrderByDirection.DescNullsLast },
      ];
    }

    this.logger.debug('Applied findMany pre-query filters and ordering', {
      filter: payload.filter,
      orderBy: payload.orderBy,
    });

    return payload;
  }
}
