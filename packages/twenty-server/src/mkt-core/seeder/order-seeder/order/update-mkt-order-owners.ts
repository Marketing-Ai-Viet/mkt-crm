import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import { MKT_ORDER_SEED_OVERRIDES } from 'src/mkt-core/seeder/order-seeder/order/mkt-order-data-seeds.constants';

/**
 * Post-seed update: Apply staff distribution + completedAt overrides for mktOrder
 * Runs after INSERT phase to redistribute orders from Tim Apple to correct owners
 */
export const updateMktOrderOwners = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  for (const override of MKT_ORDER_SEED_OVERRIDES) {
    await entityManager.query(
      `UPDATE "${schemaName}"."mktOrder"
       SET "accountOwnerId" = $1, "createdById" = $2, "completedAt" = $3
       WHERE id = $4`,
      [
        override.accountOwnerId,
        override.createdById,
        override.completedAt,
        override.orderId,
      ],
    );
  }
};
