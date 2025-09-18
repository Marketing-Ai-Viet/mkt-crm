import { Logger } from '@nestjs/common';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS,
  MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_COLUMNS,
} from 'src/mkt-core/dev-seeder/constants/mkt-template-system-action-data-seeds.constants';

const logger = new Logger('PrefillMktTemplateSystemActions');

export const prefillMktTemplateSystemActions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
): Promise<void> => {
  logger.log('🚀 Starting to prefill template system actions...');

  const tableName = `${schemaName}."mktTemplateSystemAction"`;

  // Check if template system actions already exist
  const existingActions = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'action')
    .getRawMany();

  if (existingActions.length === 0) {
    logger.log(
      `📝 No existing template system actions found. Creating ${MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS.length} actions...`,
    );

    const seedData = MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS.map((action) => ({
      ...action,
      // Data is already converted to proper format in constants
    }));

    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();

    logger.log(
      `✅ Successfully created ${MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS.length} template system actions`,
    );

    // Log summary by template and action
    const actionsByTemplate = MKT_TEMPLATE_SYSTEM_ACTION_DATA_SEEDS.reduce(
      (acc, action) => {
        const templateId = action.templateId;

        if (!acc[templateId]) {
          acc[templateId] = [];
        }
        acc[templateId].push(action.actionKey);

        return acc;
      },
      {} as Record<string, string[]>,
    );

    Object.entries(actionsByTemplate).forEach(([templateId, actions]) => {
      logger.log(
        `   └─ Template ${templateId.slice(-12)}: ${actions.length} actions (${actions.join(', ')})`,
      );
    });
  } else {
    logger.log(
      `✅ Template system actions already exist (${existingActions.length} found). Skipping creation.`,
    );
  }
};
