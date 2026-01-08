import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_WEBHOOK_LOG_DATA_SEED_COLUMNS,
  MKT_WEBHOOK_LOG_DATA_SEEDS,
} from 'src/mkt-core/seeder/constants/mkt-webhook-log-data-seeds.constants';

export const prefillMktWebhookLogs = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .insert()
    .into(`${schemaName}.webhookLogs`, MKT_WEBHOOK_LOG_DATA_SEED_COLUMNS)
    .orIgnore()
    .values(MKT_WEBHOOK_LOG_DATA_SEEDS)
    .execute();
};
