import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_PROMOTION_USAGE_DATA_SEED_COLUMNS,
  MKT_PROMOTION_USAGE_DATA_SEEDS,
} from './mkt-promotion-usage-data-seeds.constants';

export const prefillMktPromotionUsages = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPromotionUsage`,
      MKT_PROMOTION_USAGE_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_PROMOTION_USAGE_DATA_SEEDS)
    .execute();
};
