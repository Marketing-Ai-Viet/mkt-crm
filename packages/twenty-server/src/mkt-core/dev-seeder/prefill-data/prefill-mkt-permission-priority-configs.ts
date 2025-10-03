import { Logger } from '@nestjs/common';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PERMISSION_PRIORITY_CONFIG_DATA_SEEDS,
  MKT_PERMISSION_PRIORITY_CONFIG_DATA_SEED_COLUMNS,
} from 'src/mkt-core/dev-seeder/constants/mkt-permission-priority-config-data-seeds.constants';

const logger = new Logger('PrefillMktPermissionPriorityConfigs');

export const prefillMktPermissionPriorityConfigs = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
): Promise<void> => {
  logger.log('🚀 Starting to prefill permission priority configs...');

  const tableName = `${schemaName}."mktPermissionPriorityConfig"`;

  // Check if permission priority configs already exist
  const existingConfigs = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'config')
    .getRawMany();

  if (existingConfigs.length === 0) {
    logger.log(
      `📝 No existing permission priority configs found. Creating ${MKT_PERMISSION_PRIORITY_CONFIG_DATA_SEEDS.length} configs...`,
    );

    const seedData = MKT_PERMISSION_PRIORITY_CONFIG_DATA_SEEDS.map(
      (config) => ({
        ...config,
      }),
    );

    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_PERMISSION_PRIORITY_CONFIG_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();

    logger.log(
      `✅ Successfully created ${MKT_PERMISSION_PRIORITY_CONFIG_DATA_SEEDS.length} permission priority configs`,
    );
  } else {
    logger.log(
      `✅ Permission priority configs already exist (${existingConfigs.length} found). Skipping creation.`,
    );
  }
};
