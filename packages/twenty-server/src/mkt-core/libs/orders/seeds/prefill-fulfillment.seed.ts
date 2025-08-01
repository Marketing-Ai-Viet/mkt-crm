import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { FULFILLMENT_DATA_SEEDS, FULFILLMENT_DATA_SEED_COLUMNS } from 'src/mkt-core/libs/orders/seeds/constants/fulfillment-seed.constant';
export const prefillFulfillments = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.fulfillment`, FULFILLMENT_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(FULFILLMENT_DATA_SEEDS)
    .execute();
};
