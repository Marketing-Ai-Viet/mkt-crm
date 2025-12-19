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
import {
  COUPON_STATUS,
  PROMOTION_LOG_CONTEXT,
} from 'src/mkt-core/mkt-promotion/constants';

type CouponFilter = {
  deletedAt?: {
    is?: string;
  };
  status?: {
    neq?: string;
  };
  and?: Array<{
    deletedAt?: { is?: string };
    status?: { neq?: string };
  }>;
};

/**
 * CouponFindOnePreQueryHook - Pre-query hook cho mktCoupon findOne
 *
 * Chức năng:
 * - Thêm filter mặc định: loại bỏ coupon đã xóa và đã vô hiệu hóa
 */
@Injectable()
@WorkspaceQueryHook('mktCoupon.findOne')
export class CouponFindOnePreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: FindOneResolverArgs<CouponFilter>,
  ): Promise<FindOneResolverArgs<CouponFilter>> {
    const existingFilter = payload.filter || {};

    // Thêm filter loại bỏ coupon đã xóa và đã vô hiệu hóa
    const shouldApplyDefaultFilter =
      !existingFilter.deletedAt && !existingFilter.status;

    if (shouldApplyDefaultFilter) {
      payload.filter = {
        ...existingFilter,
        and: [
          {
            deletedAt: {
              is: 'NULL',
            },
          },
          {
            status: {
              neq: COUPON_STATUS.DISABLED,
            },
          },
        ],
      };
    }

    this.logger.debug('Applied coupon findOne pre-query filters', {
      filter: payload.filter,
    });

    return payload;
  }
}

/**
 * CouponFindManyPreQueryHook - Pre-query hook cho mktCoupon findMany
 *
 * Chức năng:
 * - Thêm filter mặc định: loại bỏ coupon đã xóa và đã vô hiệu hóa
 * - Thêm ordering mặc định: createdAt DESC (coupon mới nhất trước)
 */
@Injectable()
@WorkspaceQueryHook('mktCoupon.findMany')
export class CouponFindManyPreQueryHook
  implements WorkspacePreQueryHookInstance
{
  private readonly logger = new Logger(PROMOTION_LOG_CONTEXT);

  async execute(
    _authContext: AuthContext,
    _objectName: string,
    payload: FindManyResolverArgs<CouponFilter, ObjectRecordOrderBy>,
  ): Promise<FindManyResolverArgs<CouponFilter, ObjectRecordOrderBy>> {
    const existingFilter = payload.filter || {};
    const existingOrderBy = payload.orderBy || [];

    // Thêm filter loại bỏ coupon đã xóa và đã vô hiệu hóa
    const shouldApplyDefaultFilter =
      !existingFilter.deletedAt && !existingFilter.status;

    if (shouldApplyDefaultFilter) {
      payload.filter = {
        ...existingFilter,
        and: [
          {
            deletedAt: {
              is: 'NULL',
            },
          },
          {
            status: {
              neq: COUPON_STATUS.DISABLED,
            },
          },
        ],
      };
    }

    // Thêm ordering mặc định: coupon mới nhất trước
    if (existingOrderBy.length === 0) {
      payload.orderBy = [{ createdAt: OrderByDirection.DescNullsLast }];
    }

    this.logger.debug(
      'Applied coupon findMany pre-query filters and ordering',
      {
        filter: payload.filter,
        orderBy: payload.orderBy,
      },
    );

    return payload;
  }
}
