import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_PROMOTION_RULE_DATA_SEED_COLUMNS,
  MKT_PROMOTION_RULE_DATA_SEEDS,
} from './mkt-promotion-rule-data-seeds.constants';

export const prefillMktPromotionRules = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPromotionRule`,
      MKT_PROMOTION_RULE_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_PROMOTION_RULE_DATA_SEEDS)
    .execute();
};
