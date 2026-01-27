import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_CUSTOMER_NOTE_DATA_SEED_COLUMNS,
  MKT_CUSTOMER_NOTE_DATA_SEEDS,
} from 'src/mkt-core/seeder/customer-seeder/mkt-customer-note/mkt-customer-note-data-seeds.constants';

export const prefillMktCustomerNotes = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.mktCustomerNote`, MKT_CUSTOMER_NOTE_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_CUSTOMER_NOTE_DATA_SEEDS)
    .execute();
};
