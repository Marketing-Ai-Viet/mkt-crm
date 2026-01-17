import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
  MKT_PERMISSION_TEMPLATE_DATA_SEEDS,
} from './mkt-permission-template-data-seeds.constants';

export const prefillMktPermissionTemplates = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktPermissionTemplate`,
      MKT_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_PERMISSION_TEMPLATE_DATA_SEEDS)
    .execute();
};
