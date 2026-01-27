import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_CUSTOMER_TIER_HISTORY_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/mkt-customer-tier-histories/mkt-customer-tier-history-data-seeds.constants';

export const prefillMktCustomerTierHistories = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktCustomerTierHistory`,
      MKT_CUSTOMER_TIER_HISTORY_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_CUSTOMER_TIER_HISTORY_DATA_SEEDS)
    .execute();
};
