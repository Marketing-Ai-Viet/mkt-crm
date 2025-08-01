import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { ORDER_ITEM_DATA_SEEDS, ORDER_ITEM_DATA_SEED_COLUMNS } from 'src/mkt-core/libs/orders/seeds/constants/order-item-seed.constant';
export const prefillOrderItems = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.orderItem`, ORDER_ITEM_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(ORDER_ITEM_DATA_SEEDS)
    .execute();
};
