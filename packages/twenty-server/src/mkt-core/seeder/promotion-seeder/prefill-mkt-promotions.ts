import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_PROMOTION_DATA_SEED_COLUMNS,
  MKT_PROMOTION_DATA_SEEDS,
} from './mkt-promotion-data-seeds.constants';

export const prefillMktPromotions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktPromotion`, MKT_PROMOTION_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_PROMOTION_DATA_SEEDS)
    .execute();
};
