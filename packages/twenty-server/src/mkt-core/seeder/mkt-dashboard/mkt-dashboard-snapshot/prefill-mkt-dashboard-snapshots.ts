import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_DASHBOARD_SNAPSHOT_DATA_SEED_COLUMNS,
  MKT_DASHBOARD_SNAPSHOT_DATA_SEEDS,
} from 'src/mkt-core/seeder/mkt-dashboard/mkt-dashboard-snapshot/mkt-dashboard-snapshot-data-seeds.constants';

export const prefillMktDashboardSnapshots = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktDashboardSnapshot`,
      MKT_DASHBOARD_SNAPSHOT_DATA_SEED_COLUMNS,
    )
    .values(MKT_DASHBOARD_SNAPSHOT_DATA_SEEDS)
    .execute();
};
