import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_GENERIC_COMBO_DATA_SEED_COLUMNS,
  MKT_GENERIC_COMBO_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-generic-combo-data-seeds.constants';

export const prefillMktGenericCombos = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktGenericCombo`, MKT_GENERIC_COMBO_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_GENERIC_COMBO_DATA_SEEDS)
    .execute();
};
