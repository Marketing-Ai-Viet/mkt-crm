import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';

import {
  MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_COLUMNS,
  MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS,
} from './mkt-template-system-action-data-seeds.constants';

export const prefillMktTemplateSystemActions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktTemplateSystemAction`,
      MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS)
    .execute();
};
