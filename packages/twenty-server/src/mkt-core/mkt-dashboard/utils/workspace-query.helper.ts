import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceDataSource } from 'src/engine/twenty-orm/datasource/workspace.datasource';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

/**
 * Get a workspace-scoped DataSource with search_path set for raw SQL queries.
 *
 * Raw SQL via `dataSource.query()` does NOT automatically apply the workspace schema.
 * This helper sets `search_path` so unqualified table names resolve correctly.
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
