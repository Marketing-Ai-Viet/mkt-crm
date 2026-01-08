import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_GENERIC_COMBO_ITEM_DATA_SEED_COLUMNS,
  MKT_GENERIC_COMBO_ITEM_DATA_SEEDS,
} from 'src/mkt-core/seeder/combo-seeder/mkt-generic-combo-item-data-seeds.constants';

export const prefillMktGenericComboItems = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktGenericComboItem`,
      MKT_GENERIC_COMBO_ITEM_DATA_SEED_COLUMNS,
    )
    .orIgnore()
    .values(MKT_GENERIC_COMBO_ITEM_DATA_SEEDS)
    .execute();
};
