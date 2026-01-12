import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_POLICY_APPROVAL_DATA_SEED_COLUMNS,
  MKT_POLICY_APPROVAL_DATA_SEEDS,
} from './mkt-policy-approval-data-seeds.constants';

export const prefillMktPolicyApprovals = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPolicyApproval`,
      MKT_POLICY_APPROVAL_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_POLICY_APPROVAL_DATA_SEEDS)
    .execute();
};
