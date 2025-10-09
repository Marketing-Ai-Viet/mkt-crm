import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_CATEGORY_DATA_SEED_COLUMNS,
  MKT_CATEGORY_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/product-seeder/mkt-category-data-seeds.constants';

export const prefillMktCategories = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktCategory`, MKT_CATEGORY_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_CATEGORY_DATA_SEEDS)
    .execute();
};
