import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_DASHBOARD_LAYOUT_DATA_SEED_COLUMNS,
  MKT_DASHBOARD_LAYOUT_DATA_SEEDS,
} from 'src/mkt-core/seeder/mkt-dashboard/mkt-dashboard-layout/mkt-dashboard-layout-data-seeds.constants';

export const prefillMktDashboardLayouts = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktDashboardLayout`,
      MKT_DASHBOARD_LAYOUT_DATA_SEED_COLUMNS,
    )
    .values(MKT_DASHBOARD_LAYOUT_DATA_SEEDS)
    .execute();
};
