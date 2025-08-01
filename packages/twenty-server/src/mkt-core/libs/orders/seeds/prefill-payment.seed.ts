import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { PAYMENT_DATA_SEEDS, PAYMENT_DATA_SEED_COLUMNS } from 'src/mkt-core/libs/orders/seeds/constants/payment-seed.constant';
export const prefillPayments = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.payment`, PAYMENT_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(PAYMENT_DATA_SEEDS)
    .execute();
};
