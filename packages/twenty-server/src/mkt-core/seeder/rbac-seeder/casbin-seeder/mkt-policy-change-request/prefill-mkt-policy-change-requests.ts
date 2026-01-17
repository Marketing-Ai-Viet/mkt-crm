import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_POLICY_CHANGE_REQUEST_DATA_SEED_COLUMNS,
  MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS,
} from './mkt-policy-change-request-data-seeds.constants';

export const prefillMktPolicyChangeRequests = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPolicyChangeRequest`,
      MKT_POLICY_CHANGE_REQUEST_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_POLICY_CHANGE_REQUEST_DATA_SEEDS)
    .execute();
};
