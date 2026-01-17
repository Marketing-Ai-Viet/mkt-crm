import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_USER_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS,
} from './mkt-user-permission-template-data-seeds.constants';

export const prefillMktUserPermissionTemplates = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktUserPermissionTemplate`,
      MKT_USER_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_USER_PERMISSION_TEMPLATE_DATA_SEEDS)
    .execute();
};
