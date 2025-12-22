import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_COUPON_DATA_SEED_COLUMNS,
  MKT_COUPON_DATA_SEEDS,
} from './mkt-coupon-data-seeds.constants';

export const prefillMktCoupons = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktCoupon`, MKT_COUPON_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_COUPON_DATA_SEEDS)
    .execute();
};
