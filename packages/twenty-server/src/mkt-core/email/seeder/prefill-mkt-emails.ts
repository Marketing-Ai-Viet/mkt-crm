import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_EMAIL_DATA_SEED_COLUMNS,
  MKT_EMAIL_DATA_SEEDS,
} from 'src/mkt-core/dev-seeder/constants/mkt-email-data-seeds.constants';

export const prefillMktEmails = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktEmail`, MKT_EMAIL_DATA_SEED_COLUMNS)
    .values(MKT_EMAIL_DATA_SEEDS)
    .execute();
};
