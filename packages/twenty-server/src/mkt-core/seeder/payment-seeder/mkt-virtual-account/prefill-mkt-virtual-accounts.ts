import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_VIRTUAL_ACCOUNT_DATA_SEED_COLUMNS,
  MKT_VIRTUAL_ACCOUNT_DATA_SEEDS,
} from 'src/mkt-core/seeder/payment-seeder/mkt-virtual-account/mkt-virtual-account-data-seeds.constants';

export const prefillMktVirtualAccounts = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktVirtualAccount`,
      MKT_VIRTUAL_ACCOUNT_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_VIRTUAL_ACCOUNT_DATA_SEEDS)
    .execute();
};
