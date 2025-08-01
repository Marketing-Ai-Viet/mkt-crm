import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { ORDER_DATA_SEEDS, ORDER_DATA_SEED_COLUMNS } from 'src/mkt-core/libs/orders/seeds/constants/order-seed.constant';

export const prefillOrders = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.order`, ORDER_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(ORDER_DATA_SEEDS)
    .execute();
};
