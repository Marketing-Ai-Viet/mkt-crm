import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PERMISSION_RESOURCE_DATA_SEED_COLUMNS,
  MKT_PERMISSION_RESOURCE_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-permission-resource-data-seeds.constants';

export const prefillMktPermissionResources = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  const tableName = `${schemaName}."mktPermissionResource"`;

  // Check if permission resources already exist
  const existingResources = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'resource')
    .getRawMany();

  if (existingResources.length === 0) {
    // Prepare data with JSON stringification for complex fields
    const seedData = MKT_PERMISSION_RESOURCE_DATA_SEEDS.map((resource) => ({
      ...resource,
      // No JSON fields in permission resource entity, all are primitive types
    }));

    // Insert permission resources
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_PERMISSION_RESOURCE_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();
  }
};
