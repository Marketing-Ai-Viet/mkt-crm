import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS,
  MKT_DATA_ACCESS_POLICY_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-data-access-policy/mkt-data-access-policy-data-seeds.constants';
import {
  MKT_ORDER_POLICY_DATA_SEEDS,
  MKT_ORDER_POLICY_DATA_SEED_IDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-data-access-policy/mkt-order-policy-data-seeds.constants';

export const prefillMktDataAccessPolicies = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  const tableName = `${schemaName}."mktDataAccessPolicy"`;

  // Check if data access policies already exist
  const existingPolicies = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'policy')
    .getRawMany();

  if (existingPolicies.length === 0) {
    // Prepare data with JSON serialization for filterConditions
    const seedData = MKT_DATA_ACCESS_POLICY_DATA_SEEDS.map((policy) => ({
      ...policy,
      // Convert filterConditions object to JSON string for database storage
      filterConditions: JSON.stringify(policy.filterConditions),
    }));

    // Insert data access policies
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();
  }

  // Seed Order-specific policies (idempotent - checks by ID)
  await prefillOrderPolicies(entityManager, tableName, existingPolicies);
};

/**
 * Seed Order-specific DataAccessPolicy entries
 *
 * Idempotent: Only inserts policies that don't already exist (by ID).
 * This allows adding Order policies to existing deployments without
 * requiring a full reseed.
 */
const prefillOrderPolicies = async (
  entityManager: WorkspaceEntityManager,
  tableName: string,
  existingPolicies: Record<string, unknown>[],
) => {
  const existingIds = new Set(existingPolicies.map((p) => p.id as string));

  const orderPolicyIds = Object.values(MKT_ORDER_POLICY_DATA_SEED_IDS);
  const missingPolicies = MKT_ORDER_POLICY_DATA_SEEDS.filter(
    (policy) =>
      orderPolicyIds.includes(policy.id) && !existingIds.has(policy.id),
  );

  if (missingPolicies.length === 0) {
    return;
  }

  // Adjust positions to not conflict with existing policies
  const maxPosition = existingPolicies.reduce(
    (max, p) => Math.max(max, (p.position as number) ?? 0),
    0,
  );

  const seedData = missingPolicies.map((policy, index) => ({
    ...policy,
    position: maxPosition + index + 1,
    filterConditions: JSON.stringify(policy.filterConditions),
  }));

  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(tableName, MKT_DATA_ACCESS_POLICY_DATA_SEED_COLUMNS)
    .values(seedData)
    .execute();
};
