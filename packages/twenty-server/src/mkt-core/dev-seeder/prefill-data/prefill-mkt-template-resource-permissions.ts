import { Logger } from '@nestjs/common';

import { WorkspaceEntityManager } from 'src/engine/twenty-orm/entity-manager/workspace-entity-manager';
import {
  MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS,
  MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_COLUMNS,
} from 'src/mkt-core/dev-seeder/constants/mkt-template-resource-permission-data-seeds.constants';

const logger = new Logger('PrefillMktTemplateResourcePermissions');

export const prefillMktTemplateResourcePermissions = async (
  entityManager: WorkspaceEntityManager,
  schemaName: string,
): Promise<void> => {
  logger.log('🚀 Starting to prefill template resource permissions...');

  const tableName = `${schemaName}."mktTemplateResourcePermission"`;

  // Check if template resource permissions already exist
  const existingPermissions = await entityManager
    .createQueryBuilder(undefined, undefined, undefined, {
      shouldBypassPermissionChecks: true,
    })
    .select('*')
    .from(tableName, 'permission')
    .getRawMany();

  if (existingPermissions.length === 0) {
    logger.log(
      `📝 No existing template resource permissions found. Creating ${MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS.length} permissions...`,
    );

    // Verify that required parent records exist before inserting
    const permissionTemplateTableName = `${schemaName}."mktPermissionTemplate"`;
    const permissionResourceTableName = `${schemaName}."mktPermissionResource"`;

    // Check if permission templates exist
    const existingTemplates = await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .select('id')
      .from(permissionTemplateTableName, 'template')
      .getRawMany();

    // Check if permission resources exist
    const existingResources = await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .select('id')
      .from(permissionResourceTableName, 'resource')
      .getRawMany();

    logger.log(
      `🔍 Found ${existingTemplates.length} permission templates and ${existingResources.length} permission resources`,
    );

    // Extract existing IDs for validation
    const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));
    const existingResourceIds = new Set(existingResources.map((r) => r.id));

    // Filter seed data to only include records with valid foreign key references
    const validSeedData = MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS.filter(
      (permission) => {
        const hasValidTemplate = existingTemplateIds.has(permission.templateId);
        const hasValidResource = existingResourceIds.has(permission.resourceId);

        if (!hasValidTemplate) {
          logger.warn(
            `⚠️ Skipping permission record: templateId ${permission.templateId} not found in database`,
          );
        }
        if (!hasValidResource) {
          logger.warn(
            `⚠️ Skipping permission record: resourceId ${permission.resourceId} not found in database`,
          );
        }

        return hasValidTemplate && hasValidResource;
      },
    );

    if (validSeedData.length === 0) {
      logger.warn(
        '⚠️ No valid template resource permissions to insert. Please ensure permission templates and resources are seeded first.',
      );

      return;
    }

    logger.log(
      `📝 Inserting ${validSeedData.length} valid template resource permissions out of ${MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS.length} total...`,
    );

    const seedData = validSeedData.map((permission) => ({
      ...permission,
      // Data is already converted to proper format in constants
    }));

    await entityManager
      .createQueryBuilder(undefined, undefined, undefined, {
        shouldBypassPermissionChecks: true,
      })
      .insert()
      .into(tableName, MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEED_COLUMNS)
      .values(seedData)
      .execute();

    logger.log(
      `✅ Successfully created ${validSeedData.length} template resource permissions`,
    );

    // Log summary by template
    const permissionsByTemplate = validSeedData.reduce(
      (acc, permission) => {
        const templateId = permission.templateId;

        if (!acc[templateId]) {
          acc[templateId] = 0;
        }
        acc[templateId]++;

        return acc;
      },
      {} as Record<string, number>,
    );

    Object.entries(permissionsByTemplate).forEach(([templateId, count]) => {
      logger.log(
        `   └─ Template ${templateId.slice(-12)}: ${count} permissions`,
      );
    });

    // Log any skipped records
    const skippedCount =
      MKT_TEMPLATE_RESOURCE_PERMISSION_DATA_SEEDS.length - validSeedData.length;

    if (skippedCount > 0) {
      logger.warn(
        `⚠️ Skipped ${skippedCount} records due to missing parent references. Ensure permission templates and resources are seeded first.`,
      );
    }
  } else {
    logger.log(
      `✅ Template resource permissions already exist (${existingPermissions.length} found). Skipping creation.`,
    );
  }
};
