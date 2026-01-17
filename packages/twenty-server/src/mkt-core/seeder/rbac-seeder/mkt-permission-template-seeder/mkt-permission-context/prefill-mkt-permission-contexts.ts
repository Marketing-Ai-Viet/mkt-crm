import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PERMISSION_CONTEXT_DATA_SEED_COLUMNS,
  MKT_PERMISSION_CONTEXT_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-context/mkt-permission-context-data-seeds.constants';

/**
 * Prefill Permission Context data for workspace
 *
 * Seeds system default permission contexts với template filter expressions.
 * Các contexts này được sử dụng làm template layer trong RBAC flow.
 *
 * @param entityManager - Workspace entity manager
 * @param schemaName - Workspace schema name (e.g., 'workspace_xxxx')
 */
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
    // Prepare data with JSON serialization for filterExpression and validationRules
    const seedData = MKT_PERMISSION_CONTEXT_DATA_SEEDS.map((context) => ({
      ...context,
      // Convert filterExpression object to JSON string for database storage
      filterExpression: JSON.stringify(context.filterExpression),
      // Convert validationRules object to JSON string if exists
      validationRules: context.validationRules
        ? JSON.stringify(context.validationRules)
        : null,
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
