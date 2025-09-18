import { Logger } from '@nestjs/common';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PERMISSION_ACTION_DATA_SEEDS,
  MKT_PERMISSION_ACTION_DATA_SEED_COLUMNS,
} from 'src/mkt-core/dev-seeder/constants/mkt-permission-action-data-seeds.constants';

const logger = new Logger('PrefillMktPermissionActions');

export const prefillMktPermissionActions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
): Promise<void> => {
  logger.log('🚀 Starting to prefill permission actions...');

  const tableName = `${schemaName}."mktPermissionAction"`;

  // Check if permission actions already exist
  const existingActions = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'action')
    .getRawMany();

  if (existingActions.length === 0) {
    logger.log(
      `📝 No existing permission actions found. Creating ${MKT_PERMISSION_ACTION_DATA_SEEDS.length} permission actions...`,
    );

    const seedData = MKT_PERMISSION_ACTION_DATA_SEEDS.map((action) => ({
      ...action,
    }));

    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_PERMISSION_ACTION_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();

    logger.log(
      `✅ Successfully created ${MKT_PERMISSION_ACTION_DATA_SEEDS.length} permission actions`,
    );
  } else {
    logger.log(
      `✅ Permission actions already exist (${existingActions.length} found). Skipping creation.`,
    );
  }
};
