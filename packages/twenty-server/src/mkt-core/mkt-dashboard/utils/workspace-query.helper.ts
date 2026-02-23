import { QueryRunner } from 'typeorm';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceDataSource } from 'src/engine/twenty-orm/datasource/workspace.datasource';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

/**
 * Get a workspace-scoped DataSource with search_path set for raw SQL queries.
 *
 * Raw SQL via `dataSource.query()` does NOT automatically apply the workspace schema.
 * This helper sets `search_path` so unqualified table names resolve correctly.
 *
 * WARNING: The SET search_path runs on one pooled connection and may not persist
 * for parallel queries (Promise.all) which can acquire different connections.
 * For services with parallel queries, use `createWorkspaceScopedRunner()` instead.
 */
export const getWorkspaceDataSourceWithSchema = async (
  scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  twentyORMGlobalManager: TwentyORMGlobalManager,
): Promise<WorkspaceDataSource> => {
  const wsId = scopedWorkspaceContextFactory.create().workspaceId ?? '';
  const dataSource = await twentyORMGlobalManager.getDataSourceForWorkspace({
    workspaceId: wsId,
  });

  const schemaName = getWorkspaceSchemaName(wsId);

  await dataSource.query(`SET search_path TO "${schemaName}"`, [], undefined, {
    shouldBypassPermissionChecks: true,
  });

  return dataSource;
};

/**
 * Connection-pool-safe alternative for services with parallel queries.
 *
 * Creates a dedicated QueryRunner (single pooled connection) with search_path set.
 * All queries routed through this runner share the same connection, so
 * `Promise.all` calls resolve table names correctly.
 *
 * Callers MUST call `release()` when done (use try/finally).
 *
 * Usage:
 *   const { dataSource, queryRunner, release } = await createWorkspaceScopedRunner(...);
 *   try {
 *     const rows = await dataSource.query(sql, params, queryRunner, { shouldBypassPermissionChecks: true });
 *   } finally {
 *     await release();
 *   }
 */
export const createWorkspaceScopedRunner = async (
  scopedWorkspaceContextFactory: ScopedWorkspaceContextFactory,
  twentyORMGlobalManager: TwentyORMGlobalManager,
): Promise<{
  dataSource: WorkspaceDataSource;
  queryRunner: QueryRunner;
  release: () => Promise<void>;
}> => {
  const wsId = scopedWorkspaceContextFactory.create().workspaceId ?? '';
  const dataSource = await twentyORMGlobalManager.getDataSourceForWorkspace({
    workspaceId: wsId,
  });

  const schemaName = getWorkspaceSchemaName(wsId);
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.query(`SET search_path TO "${schemaName}"`);

  return {
    dataSource,
    queryRunner,
    release: async () => {
      await queryRunner.release();
    },
  };
};
