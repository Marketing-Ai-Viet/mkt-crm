import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PAYMENT_HISTORY_DATA_SEED_COLUMNS,
  MKT_PAYMENT_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/seeder/payment-seeder/mkt-payment-history/mkt-payment-history-data-seeds.constants';

export const prefillMktPaymentHistories = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPaymentHistory`,
      MKT_PAYMENT_HISTORY_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_PAYMENT_HISTORY_DATA_SEEDS)
    .execute();
};
