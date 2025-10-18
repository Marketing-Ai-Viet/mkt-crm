import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_VARIANT_VALUE_DATA_SEED_COLUMNS,
  MKT_VARIANT_VALUE_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/product-seeder/mkt-variant-value-data-seeds.constants';

export const prefillMktVariantValues = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktVariantValue`, MKT_VARIANT_VALUE_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_VARIANT_VALUE_DATA_SEEDS)
    .execute();
};
