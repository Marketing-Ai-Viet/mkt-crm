import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_I18N_DATA_SEED_COLUMNS,
  MKT_I18N_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-i18n-data-seeds.constants';

export const prefillMktI18n = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktI18N`, MKT_I18N_DATA_SEED_COLUMNS)
    .values(MKT_I18N_DATA_SEEDS)
    .execute();
};
