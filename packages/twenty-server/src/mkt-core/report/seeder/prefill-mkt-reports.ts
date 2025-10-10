import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_REPORT_DATA_SEED_COLUMNS,
  MKT_REPORT_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-report-data-seeds.constants';

export const prefillMktReports = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktReport`, MKT_REPORT_DATA_SEED_COLUMNS)
    .values(MKT_REPORT_DATA_SEEDS)
    .execute();
};
