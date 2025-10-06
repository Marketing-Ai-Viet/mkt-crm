import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_LICENSE_HISTORY_DATA_SEED_COLUMNS,
  MKT_LICENSE_HISTORY_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-license-history-data-seeds.constants';

export const prefillMktLicenseHistory = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(
      `${schemaName}.mktLicenseHistory`,
      MKT_LICENSE_HISTORY_DATA_SEED_COLUMNS,
    )
    .values(MKT_LICENSE_HISTORY_DATA_SEEDS)
    .execute();
};
