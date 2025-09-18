import { Logger } from '@nestjs/common';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_PERMISSION_TEMPLATE_DATA_SEEDS,
  MKT_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS,
} from 'src/mkt-core/dev-seeder/constants/mkt-permission-template-data-seeds.constants';

const logger = new Logger('PrefillMktPermissionTemplates');

export const prefillMktPermissionTemplates = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
): Promise<void> => {
  logger.log('🚀 Starting to prefill permission templates...');

  const tableName = `${schemaName}."mktPermissionTemplate"`;

  // Check if permission templates already exist
  const existingTemplates = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'template')
    .getRawMany();

  if (existingTemplates.length === 0) {
    logger.log(
      `📝 No existing permission templates found. Creating ${MKT_PERMISSION_TEMPLATE_DATA_SEEDS.length} permission templates...`,
    );

    const seedData = MKT_PERMISSION_TEMPLATE_DATA_SEEDS.map((template) => ({
      ...template,
      // Data is already converted to proper format in constants
    }));

    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_PERMISSION_TEMPLATE_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();

    logger.log(
      `✅ Successfully created ${MKT_PERMISSION_TEMPLATE_DATA_SEEDS.length} permission templates`,
    );

    // Log summary of created templates
    MKT_PERMISSION_TEMPLATE_DATA_SEEDS.forEach((template) => {
      logger.log(
        `   └─ Level ${template.hierarchyLevel}: ${template.templateName} (${template.templateKey})`,
      );
    });
  } else {
    logger.log(
      `✅ Permission templates already exist (${existingTemplates.length} found). Skipping creation.`,
    );
  }
};
