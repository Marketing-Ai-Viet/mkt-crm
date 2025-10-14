import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_OPTION_DATA_SEED_COLUMNS,
  MKT_OPTION_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-option-data-seeds.constants';

export const prefillMktOptions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktOption`, MKT_OPTION_DATA_SEED_COLUMNS)
    .values(MKT_OPTION_DATA_SEEDS)
    .execute();
};
