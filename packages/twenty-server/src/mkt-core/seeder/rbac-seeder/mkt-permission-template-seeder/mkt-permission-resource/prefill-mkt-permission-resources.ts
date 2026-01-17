import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_PERMISSION_RESOURCE_DATA_SEED_COLUMNS,
  MKT_PERMISSION_RESOURCE_DATA_SEEDS,
} from './mkt-permission-resource-data-seeds.constants';

export const prefillMktPermissionResources = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPermissionResource`,
      MKT_PERMISSION_RESOURCE_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_PERMISSION_RESOURCE_DATA_SEEDS)
    .execute();
};
