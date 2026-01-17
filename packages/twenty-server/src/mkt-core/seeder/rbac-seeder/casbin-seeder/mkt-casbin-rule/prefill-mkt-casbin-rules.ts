import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_CASBIN_RULE_DATA_SEED_COLUMNS,
  MKT_CASBIN_RULE_DATA_SEEDS,
} from './mkt-casbin-rule-data-seeds.constants';

export const prefillMktCasbinRules = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktCasbinRule`, MKT_CASBIN_RULE_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_CASBIN_RULE_DATA_SEEDS)
    .execute();
};
