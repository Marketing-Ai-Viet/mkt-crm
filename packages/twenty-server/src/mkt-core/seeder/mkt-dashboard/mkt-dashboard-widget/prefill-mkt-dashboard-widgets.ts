import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_DASHBOARD_WIDGET_DATA_SEED_COLUMNS,
  MKT_DASHBOARD_WIDGET_DATA_SEEDS,
} from 'src/mkt-core/seeder/mkt-dashboard/mkt-dashboard-widget/mkt-dashboard-widget-data-seeds.constants';

export const prefillMktDashboardWidgets = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktDashboardWidget`,
      MKT_DASHBOARD_WIDGET_DATA_SEED_COLUMNS,
    )
    .values(MKT_DASHBOARD_WIDGET_DATA_SEEDS)
    .execute();
};
