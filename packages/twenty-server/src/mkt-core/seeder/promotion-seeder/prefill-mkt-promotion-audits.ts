import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_PROMOTION_AUDIT_DATA_SEED_COLUMNS,
  MKT_PROMOTION_AUDIT_DATA_SEEDS,
} from './mkt-promotion-audit-data-seeds.constants';

export const prefillMktPromotionAudits = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPromotionAudit`,
      MKT_PROMOTION_AUDIT_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_PROMOTION_AUDIT_DATA_SEEDS)
    .execute();
};
