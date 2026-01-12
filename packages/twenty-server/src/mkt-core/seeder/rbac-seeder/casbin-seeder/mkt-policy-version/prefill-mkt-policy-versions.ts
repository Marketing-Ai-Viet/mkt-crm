import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_POLICY_VERSION_DATA_SEED_COLUMNS,
  MKT_POLICY_VERSION_DATA_SEEDS,
} from './mkt-policy-version-data-seeds.constants';

export const prefillMktPolicyVersions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPolicyVersion`,
      MKT_POLICY_VERSION_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_POLICY_VERSION_DATA_SEEDS)
    .execute();
};
