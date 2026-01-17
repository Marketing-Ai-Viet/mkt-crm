import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PERMISSION_ACTION_DATA_SEED_COLUMNS,
  MKT_PERMISSION_ACTION_DATA_SEEDS,
} from 'src/mkt-core/seeder/rbac-seeder/mkt-permission-template-seeder/mkt-permission-action/mkt-permission-action-data-seeds.constants';

export const prefillMktPermissionActions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPermissionAction`,
      MKT_PERMISSION_ACTION_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_PERMISSION_ACTION_DATA_SEEDS)
    .execute();
};
