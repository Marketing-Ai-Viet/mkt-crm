import { Logger } from '@nestjs/common';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEEDS,
  MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_COLUMNS,
} from 'src/mkt-core/dev-seeder/constants/mkt-template-access-limitation-data-seeds.constants';

const logger = new Logger('PrefillMktTemplateAccessLimitations');

export const prefillMktTemplateAccessLimitations = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
): Promise<void> => {
  logger.log('🚀 Starting to prefill template access limitations...');

  const tableName = `${schemaName}."mktTemplateAccessLimitation"`;

  // Check if template access limitations already exist
  const existingLimitations = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'limitation')
    .getRawMany();

  if (existingLimitations.length === 0) {
    logger.log(
      `📝 No existing template access limitations found. Creating ${MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEEDS.length} limitations...`,
    );

    const seedData = MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEEDS.map(
      (limitation) => ({
        ...limitation,
        // Data is already converted to proper format in constants
      }),
    );

    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();

    logger.log(
      `✅ Successfully created ${MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEEDS.length} template access limitations`,
    );

    // Log summary by template and limitation type
    const limitationsByTemplate =
      MKT_TEMPLATE_ACCESS_LIMITATION_DATA_SEEDS.reduce(
        (acc, limitation) => {
          const templateId = limitation.templateId;

          if (!acc[templateId]) {
            acc[templateId] = {
              total: 0,
              types: {} as Record<string, number>,
            };
          }
          acc[templateId].total++;
          const type = limitation.limitationType;

          acc[templateId].types[type] = (acc[templateId].types[type] || 0) + 1;

          return acc;
        },
        {} as Record<string, { total: number; types: Record<string, number> }>,
      );

    Object.entries(limitationsByTemplate).forEach(([templateId, stats]) => {
      const typesSummary = Object.entries(stats.types)
        .map(([type, count]) => `${type}:${count}`)
        .join(', ');

      logger.log(
        `   └─ Template ${templateId.slice(-12)}: ${stats.total} limitations (${typesSummary})`,
      );
    });
  } else {
    logger.log(
      `✅ Template access limitations already exist (${existingLimitations.length} found). Skipping creation.`,
    );
  }
};
