import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_COLUMNS,
  MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS,
} from './mkt-template-resource-permission-data-seeds.constants';

export const prefillMktTemplateResourcePermissions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktTemplateResourcePermission`,
      MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS)
    .execute();
};
