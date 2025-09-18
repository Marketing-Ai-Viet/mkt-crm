import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PERMISSION_CONTEXT_DATA_SEED_COLUMNS,
  MKT_PERMISSION_CONTEXT_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-permission-context-data-seeds.constants';

export const prefillMktPermissionContexts = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  const tableName = `${schemaName}."mktPermissionContext"`;

  // Check if permission contexts already exist
  const existingContexts = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'context')
    .getRawMany();

  if (existingContexts.length === 0) {
    // Prepare data with JSON stringification for complex fields
    const seedData = MKT_PERMISSION_CONTEXT_DATA_SEEDS.map((context) => ({
      ...context,
      // Stringify JSON fields for database insertion
    }));

    // Insert permission contexts
    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_PERMISSION_CONTEXT_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();
  }
};
