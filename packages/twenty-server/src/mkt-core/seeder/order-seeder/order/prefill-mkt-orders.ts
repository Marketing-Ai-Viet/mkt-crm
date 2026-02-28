import { Logger } from '@nestjs/common';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_ORDER_DATA_SEED_COLUMNS,
  MKT_ORDER_DATA_SEED_PREV_MONTH_COLUMNS,
  MKT_ORDER_DATA_SEEDS,
  MKT_ORDER_DATA_SEEDS_PREV_MONTH,
  MKT_ORDER_SEED_OVERRIDES,
} from 'src/mkt-core/seeder/order-seeder/order/mkt-order-data-seeds.constants';

const logger = new Logger('prefillMktOrders');

export const prefillMktOrders = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  // Phase 1: Insert all current-month orders (includes RBAC test orders via spread)
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktOrder`, MKT_ORDER_DATA_SEED_COLUMNS)
    .values(MKT_ORDER_DATA_SEEDS)
    .orIgnore()
    .execute();

  // Phase 2: Apply staff distribution + completedAt overrides (includes RBAC overrides via spread)
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

  // Phase 3: Insert prev-month orders (wrapped in try-catch to not block above phases)
  try {
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(`${schemaName}.mktOrder`, MKT_ORDER_DATA_SEED_PREV_MONTH_COLUMNS)
      .values(MKT_ORDER_DATA_SEEDS_PREV_MONTH)
      .orIgnore()
      .execute();

    // Backfill createdAt via raw SQL UPDATE for each prev-month order
    for (const order of MKT_ORDER_DATA_SEEDS_PREV_MONTH) {
      if (order.createdAt) {
        await entityManager.query(
          `UPDATE "${schemaName}"."mktOrder" SET "createdAt" = $1 WHERE id = $2`,
          [order.createdAt, order.id],
        );
      }
    }
  } catch (error) {
    logger.warn(`Prev-month orders seed failed: ${(error as Error).message}`);
  }
};
